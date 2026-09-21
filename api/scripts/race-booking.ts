import { prisma } from "../src/lib/prisma";
import { bookingService } from "../src/modules/booking/booking.service";
import { availabilityService } from "../src/modules/availability/availability.service";
import { overlaps } from "../src/modules/availability/overlap";

const [, , slug = "canon-eos-r5", start = "2026-11-10", end = "2026-11-12", countArg] =
    process.argv;

const attempts = Number(countArg ?? 4);

async function main() {
    const product = await prisma.product.findUniqueOrThrow({
        where: { slug },
        include: {
            units: { where: { status: "AVAILABLE" }, orderBy: { serialNumber: "asc" } },
        },
    });

    console.log(`${product.name} — ${product.units.length} available unit(s)`);
    console.log(`${attempts} customers all want ${start} → ${end}\n`);

    // All at once. Nothing is awaited between them — that is the whole point.
    // Bookings belong to people now, so each racer needs a user row.
    const racers = await Promise.all(
        Array.from({ length: attempts }, async (_, i) => {
            const email = `race-${i + 1}@framerent.local`;
            const user = await prisma.user.upsert({
                where: { email },
                update: {},
                create: { name: `Racer ${i + 1}`, email },
                select: { id: true, email: true, name: true, role: true },
            });
            return user;
        }),
    );

    const results = await Promise.allSettled(
        racers.map((racer) =>
            bookingService.create({ lines: [{ slug, start, end }] }, racer),
        ),
    );

    const created = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const rejected = results.filter((r) => r.status === "rejected");

    console.log(`succeeded: ${created.length}    rejected: ${rejected.length}`);
    for (const r of rejected) {
        console.log(`   rejected — ${(r.reason as Error).message}`);
    }
    console.log();

    let doubleBooked = 0;

    for (const unit of product.units) {
        const ranges = await availabilityService.getBookedRanges(unit.id);
        const clashing = ranges.filter((range) => overlaps(range, { start, end }));

        if (clashing.length > 1) {
            doubleBooked += 1;
            console.log(
                `   ${unit.serialNumber}: ${clashing.length} overlapping  <-- DOUBLE BOOKED`,
            );
        } else {
            console.log(`   ${unit.serialNumber}: ${clashing.length} booking(s)`);
        }
    }

    console.log(
        doubleBooked === 0
            ? "\nNo double bookings."
            : `\n${doubleBooked} unit(s) rented to more than one customer.`,
    );

    const { count } = await prisma.booking.deleteMany({
        where: { id: { in: created.map((booking) => booking.id) } },
    });
    console.log(`cleaned up ${count} booking(s)`);

    process.exit(0);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
