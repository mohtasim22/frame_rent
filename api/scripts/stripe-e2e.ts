/**
 * Drives a whole booking through payment against the running dev server.
 *
 * Confirms the PaymentIntent server-side with a test payment method, which is
 * what the browser's Payment Element does — so this exercises everything
 * except the React form itself, including the real Stripe webhook if
 * `stripe listen` is forwarding.
 *
 *   npm run dev                                   # terminal 1
 *   stripe listen --events ... --forward-to ...   # terminal 2
 *   npm run stripe:e2e                            # terminal 3
 */
import Stripe from "stripe";
import { prisma } from "../src/lib/prisma";

const base = process.env.E2E_API ?? "http://localhost:4000";
const origin = process.env.E2E_ORIGIN ?? "http://localhost:5173";
const slug = process.argv[2] ?? "fujifilm-x-t5";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const email = `pay-${Date.now().toString(36)}@framerent.local`;
const adminEmail = process.env.E2E_ADMIN ?? "mohtasim@framerent.local";

function ok(label: string, pass: boolean, detail = "") {
    console.log(`  ${pass ? "PASS" : "FAIL"}  ${label.padEnd(44)} ${detail}`);
    return pass;
}

async function cookieFor(mail: string, name: string) {
    for (const path of ["/api/auth/sign-in/email", "/api/auth/sign-up/email"]) {
        const res = await fetch(`${base}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: origin },
            body: JSON.stringify(
                path.includes("sign-up")
                    ? { name, email: mail, password: "a-good-password" }
                    : { email: mail, password: "a-good-password" },
            ),
        });
        const c = res.headers.getSetCookie().find((x) => x.startsWith("better-auth"));
        if (c) return c.split(";")[0];
    }
    throw new Error(`no session for ${mail}`);
}

/** Polls until the predicate holds, so the webhook has a chance to arrive. */
async function waitFor<T>(
    read: () => Promise<T>,
    done: (value: T) => boolean,
    seconds = 20,
): Promise<T> {
    const deadline = Date.now() + seconds * 1000;
    let value = await read();

    while (!done(value) && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1000));
        value = await read();
    }

    return value;
}

async function main() {
    const renter = await cookieFor(email, "Payment Tester");
    const admin = await cookieFor(adminEmail, "Admin");
    const R = { "Content-Type": "application/json", Origin: origin, Cookie: renter };
    const A = { "Content-Type": "application/json", Origin: origin, Cookie: admin };

    const start = "2027-08-10";
    const end = "2027-08-12";

    console.log(`\n1. book ${slug} ${start} -> ${end}`);
    const made = await fetch(`${base}/api/v1/bookings`, {
        method: "POST",
        headers: R,
        body: JSON.stringify({ lines: [{ slug, start, end }], pickupMethod: "COUNTER" }),
    });
    const booking = (await made.json()) as any;
    const reference = booking.data?.reference;
    ok("booking created", made.status === 201, reference ?? JSON.stringify(booking));
    if (!reference) process.exit(1);

    ok("starts UNPAID", booking.data.paymentStatus === "UNPAID", booking.data.paymentStatus);
    ok("starts PENDING", booking.data.status === "PENDING", booking.data.status);

    const held = await prisma.booking.findUniqueOrThrow({
        where: { reference },
        select: { id: true, paymentDueBy: true },
    });
    ok("holds its units on a timer", held.paymentDueBy !== null, String(held.paymentDueBy));

    console.log("\n2. ask the API for a PaymentIntent");
    const intentRes = await fetch(`${base}/api/v1/payments/bookings/${reference}/intent`, {
        method: "POST",
        headers: R,
    });
    const intentJson = (await intentRes.json()) as any;
    ok("intent created", intentRes.status === 200, intentJson.error?.message ?? "");
    if (intentRes.status !== 200) process.exit(1);

    ok(
        "amount is the RENTAL, not rental+deposit",
        intentJson.data.amountCents === booking.data.subtotalCents,
        `${intentJson.data.amountCents} vs subtotal ${booking.data.subtotalCents}`,
    );

    const intentId = (intentJson.data.clientSecret as string).split("_secret_")[0];

    console.log("\n3. pay with test card 4242 (what the Payment Element does)");
    const confirmed = await stripe.paymentIntents.confirm(intentId, {
        payment_method: "pm_card_visa",
        return_url: `${origin}/booking/${reference}`,
    });
    ok("payment succeeded at Stripe", confirmed.status === "succeeded", confirmed.status);

    console.log("\n4. wait for the webhook to confirm the booking");
    const afterPay = await waitFor(
        async () =>
            (await (await fetch(`${base}/api/v1/bookings/${reference}`, { headers: R })).json()) as any,
        (b) => b.data?.paymentStatus === "PAID",
    );
    const paid = ok("webhook marked it PAID", afterPay.data?.paymentStatus === "PAID", afterPay.data?.paymentStatus);
    ok("webhook moved it to CONFIRMED", afterPay.data?.status === "CONFIRMED", afterPay.data?.status);

    if (!paid) {
        console.log("\n  Is `stripe listen` running and forwarding to this server?");
    }

    const saved = await prisma.booking.findUniqueOrThrow({
        where: { reference },
        select: { paymentMethodId: true, paymentDueBy: true },
    });
    ok("card saved for the deposit hold", saved.paymentMethodId !== null, saved.paymentMethodId ?? "none");
    ok("unit hold no longer expires", saved.paymentDueBy === null);

    console.log("\n5. admin hands the gear over -> deposit is authorised");
    await fetch(`${base}/api/v1/admin/bookings/${reference}/status`, {
        method: "POST",
        headers: A,
        body: JSON.stringify({ status: "PICKED_UP" }),
    });

    const deposit = await prisma.booking.findUniqueOrThrow({
        where: { reference },
        select: { depositStatus: true, depositIntentId: true, depositCents: true },
    });
    const holdPlaced = ok("deposit HELD", deposit.depositStatus === "HELD", deposit.depositStatus);

    if (holdPlaced && deposit.depositIntentId) {
        const hold = await stripe.paymentIntents.retrieve(deposit.depositIntentId);
        ok("authorised, not captured", hold.status === "requires_capture", hold.status);
        ok("held the full deposit", hold.amount === deposit.depositCents, `${hold.amount}`);
    }

    console.log("\n6. returned 2 days late -> fee captured from the hold");
    const returned = await fetch(`${base}/api/v1/admin/bookings/${reference}/return`, {
        method: "POST",
        headers: A,
        body: JSON.stringify({ returnedOn: "2027-08-14", condition: "GOOD" }),
    });
    const returnedJson = (await returned.json()) as any;
    ok("returned", returned.status === 200, returnedJson.data?.status ?? returnedJson.error?.code);
    ok("late fee charged", (returnedJson.data?.feeCents ?? 0) > 0, `${returnedJson.data?.feeCents} cents`);

    const settled = await prisma.booking.findUniqueOrThrow({
        where: { reference },
        select: { depositStatus: true, depositIntentId: true, feeCents: true },
    });
    ok("deposit CAPTURED", settled.depositStatus === "CAPTURED", settled.depositStatus);

    if (settled.depositIntentId) {
        const final = await stripe.paymentIntents.retrieve(settled.depositIntentId);
        ok(
            "captured only the fee, released the rest",
            final.amount_received === settled.feeCents,
            `received ${final.amount_received} of ${final.amount}`,
        );
    }

    console.log("\ncleaning up");
    await prisma.booking.deleteMany({ where: { reference } });
    await prisma.user.deleteMany({ where: { email } });
    console.log("done\n");
    process.exit(0);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
