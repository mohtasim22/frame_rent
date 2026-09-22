/**
 * Proves image uploads work end to end: signature -> Cloudinary -> product.
 *
 *   npm run dev          # terminal 1
 *   npm run upload:e2e   # terminal 2
 */
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "../src/lib/prisma";

const base = process.env.E2E_API ?? "http://localhost:4000";
const origin = process.env.E2E_ORIGIN ?? "http://localhost:5173";
const adminEmail = process.env.E2E_ADMIN ?? "mohtasim@framerent.local";
const password = process.env.E2E_PASSWORD ?? "a-good-password";

/** A real 1x1 PNG, so Cloudinary decodes an actual image. */
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
);

function ok(label: string, pass: boolean, detail = "") {
    console.log(`  ${pass ? "PASS" : "FAIL"}  ${label.padEnd(42)} ${detail}`);
    return pass;
}

async function main() {
    const signIn = await fetch(`${base}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify({ email: adminEmail, password }),
    });
    const cookie = signIn.headers
        .getSetCookie()
        .find((c) => c.startsWith("better-auth"))
        ?.split(";")[0];

    if (!cookie) {
        console.log(`could not sign in as ${adminEmail}`);
        process.exit(1);
    }
    const A = { "Content-Type": "application/json", Origin: origin, Cookie: cookie };

    console.log("\n1. the API signs an upload");
    const sigRes = await fetch(`${base}/api/v1/admin/uploads/signature`, {
        method: "POST",
        headers: A,
    });
    const sigJson = (await sigRes.json()) as any;
    if (!ok("signature issued", sigRes.status === 200, sigJson.error?.message ?? "")) {
        process.exit(1);
    }
    const s = sigJson.data;
    ok("folder fixed by the server", s.folder === "framerent/products", s.folder);
    ok("no secret in the response", !JSON.stringify(s).includes("api_secret"));

    console.log("\n2. upload straight to Cloudinary, as the browser does");
    const form = new FormData();
    form.append("file", new Blob([PNG], { type: "image/png" }), "probe.png");
    form.append("api_key", s.apiKey);
    form.append("timestamp", String(s.timestamp));
    form.append("folder", s.folder);
    form.append("signature", s.signature);

    const upload = await fetch(
        `https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`,
        { method: "POST", body: form },
    );
    const uploaded = (await upload.json()) as any;

    if (!ok("Cloudinary accepted it", upload.ok, uploaded.error?.message ?? "")) {
        console.log(
            "\n  If this says 'missing permissions', the API key is a scoped key with\n" +
                "  no role attached. Cloudinary Console -> Settings -> API Keys: use the\n" +
                "  account's default key, or give this one a role that allows Upload API\n" +
                "  create. `ping` succeeding only proves the key is real, not permitted.\n",
        );
        process.exit(1);
    }

    const url = uploaded.secure_url as string;
    ok("served over https", url.startsWith("https://"), url.slice(0, 54));
    ok("landed in our folder", String(uploaded.public_id).startsWith("framerent/products/"));

    console.log("\n3. a tampered signature is refused");
    const badForm = new FormData();
    badForm.append("file", new Blob([PNG], { type: "image/png" }), "bad.png");
    badForm.append("api_key", s.apiKey);
    badForm.append("timestamp", String(s.timestamp));
    badForm.append("folder", "somewhere-else");
    badForm.append("signature", s.signature);

    const bad = await fetch(
        `https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`,
        { method: "POST", body: badForm },
    );
    ok("changed folder rejected", !bad.ok, `HTTP ${bad.status}`);

    console.log("\n4. attach it to a product");
    const product = await prisma.product.findFirstOrThrow({
        where: { slug: "fujifilm-x-t5" },
        select: { id: true, slug: true, images: true },
    });
    const original = product.images;

    const save = await fetch(`${base}/api/v1/admin/products/${product.id}/images`, {
        method: "PUT",
        headers: A,
        body: JSON.stringify({ images: [url, ...original].slice(0, 8) }),
    });
    ok("saved on the product", save.status === 200);

    const publicView = (await (
        await fetch(`${base}/api/v1/gear/${product.slug}`)
    ).json()) as any;
    ok("public catalogue shows it first", publicView.data.images[0] === url);

    console.log("\ncleaning up");
    await prisma.product.update({ where: { id: product.id }, data: { images: original } });

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const destroyed = await cloudinary.uploader
        .destroy(uploaded.public_id)
        .catch(() => ({ result: "left in place (no delete permission)" }));

    console.log(`  product restored, test asset ${destroyed.result}\n`);
    process.exit(0);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
