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

type Outcome = { status: number; code?: string; reference?: string };

async function checkout(i: number): Promise<Outcome> {
    const res = await fetch(`${base}/api/v1/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            lines: [{ slug, start, end }],
            customer: { name: `Window ${i + 1}`, email: `window-${i + 1}@framerent.local` },
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

    const outcomes = await Promise.all(
        Array.from({ length: attempts }, (_, i) => checkout(i)),
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
    console.log(`cleaned up ${count} booking(s)`);

    process.exit(0);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
