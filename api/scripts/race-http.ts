/**
 * The same race as race-booking.ts, but over real HTTP against a running
 * server — which is what two browser windows hitting "Confirm booking" at the
 * same moment actually looks like.
 *
 *   npm run dev            # terminal 1
 *   npm run booking:race:http canon-eos-r5 2026-11-10 2026-11-12 4
 */
import { prisma } from "../src/lib/prisma";

const [, , slug = "canon-eos-r5", start = "2026-11-10", end = "2026-11-12", countArg] =
    process.argv;

const attempts = Number(countArg ?? 4);
const base = process.env.RACE_API ?? "http://localhost:4000";
const origin = process.env.RACE_ORIGIN ?? "http://localhost:5173";

// Fresh identities each run. Reusing an email that exists WITHOUT a credential
// account — a guest row left by an older booking — can neither sign up nor in.
const runId = Date.now().toString(36);

type Outcome = { status: number; code?: string; reference?: string };

/** Signs a racer up (or in) and returns their session cookie. */
async function sessionCookie(i: number): Promise<string> {
    const credentials = {
        name: `Window ${i + 1}`,
        email: `window-${i + 1}-${runId}@framerent.local`,
        password: "a-good-password",
    };

    for (const path of ["/api/auth/sign-up/email", "/api/auth/sign-in/email"]) {
        const res = await fetch(`${base}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: origin },
            body: JSON.stringify(credentials),
        });

        const cookie = res.headers.getSetCookie().find((c) => c.startsWith("better-auth"));
        if (cookie) return cookie.split(";")[0];
    }

    throw new Error(`could not get a session for window ${i + 1}`);
}

async function checkout(i: number, cookie: string): Promise<Outcome> {
    const res = await fetch(`${base}/api/v1/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
        body: JSON.stringify({
            lines: [{ slug, start, end }],
            pickupMethod: "COUNTER",
        }),
    });

    const json = (await res.json()) as
        | { success: true; data: { reference: string } }
        | { success: false; error: { code: string; message: string } };

    return json.success
        ? { status: res.status, reference: json.data.reference }
        : { status: res.status, code: json.error.code };
}

async function main() {
    const product = await prisma.product.findUniqueOrThrow({
        where: { slug },
        select: { name: true, _count: { select: { units: true } } },
    });

    console.log(`${product.name} — ${product._count.units} unit(s)`);
    console.log(`${attempts} browser windows confirm ${start} → ${end} at once`);
    console.log(`POST ${base}/api/v1/bookings\n`);

    // Sign everyone in FIRST, so the race is only over the camera.
    const cookies = await Promise.all(
        Array.from({ length: attempts }, (_, i) => sessionCookie(i)),
    );

    const outcomes = await Promise.all(
        cookies.map((cookie, i) => checkout(i, cookie)),
    );

    for (const [i, outcome] of outcomes.entries()) {
        console.log(
            outcome.reference
                ? `   window ${i + 1}: ${outcome.status} booked ${outcome.reference}`
                : `   window ${i + 1}: ${outcome.status} ${outcome.code}`,
        );
    }

    const won = outcomes.filter((o) => o.reference);
    console.log(`\n${won.length} booked, ${outcomes.length - won.length} refused`);

    const { count } = await prisma.booking.deleteMany({
        where: { reference: { in: won.map((o) => o.reference!) } },
    });
    const { count: users } = await prisma.user.deleteMany({
        where: { email: { endsWith: `-${runId}@framerent.local` } },
    });
    console.log(`cleaned up ${count} booking(s) and ${users} test user(s)`);

    process.exit(0);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
