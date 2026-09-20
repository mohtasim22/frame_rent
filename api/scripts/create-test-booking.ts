import { prisma } from "../src/lib/prisma";
import { availabilityService } from "../src/modules/availability/availability.service";

const [, , first, startArg, endArg, unitArg] = process.argv;

function daysBetween(start: string, end: string): number {
    return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
}

async function clean() {
    const { count } = await prisma.booking.deleteMany({
        where: { reference: { startsWith: "TEST-" } },
    });
    console.log(`Deleted ${count} test booking(s).`);
}

async function create(slug: string, start: string, end: string, unitIndex: number) {

    const product = await prisma.product.findUniqueOrThrow({
        where: { slug },
        include: { units: { orderBy: { serialNumber: "asc" } } },
    });

    const unit = product.units[unitIndex];
    if (!unit) {
        throw new Error(`"${slug}" has no unit at index ${unitIndex} — it has ${product.units.length}`);
    }


    const user = await prisma.user.upsert({
        where: { email: "test-renter@framerent.local" },
        update: {},
        create: { name: "Test Renter", email: "test-renter@framerent.local" },
    });

    const days = daysBetween(start, end);
    const lineTotalCents = product.dailyRateCents * days;

    const booking = await prisma.booking.create({
        data: {
            reference: `TEST-${Date.now().toString(36).toUpperCase()}`,
            status: "CONFIRMED",
            startDate: new Date(`${start}T00:00:00Z`),
            endDate: new Date(`${end}T00:00:00Z`),
            subtotalCents: lineTotalCents,
            depositCents: product.depositCents,
            totalCents: lineTotalCents + product.depositCents,
            userId: user.id,
            items: {
                create: [
                    {
                        gearUnitId: unit.id,
                        productName: product.name,
                        dailyRateCents: product.dailyRateCents,
                        days,
                        lineTotalCents,
                    },
                ],
            },
        },
    });

    console.log(`Booked ${product.name} (${unit.serialNumber})  ${start} → ${end}  ref ${booking.reference}`);
    console.log("getBookedRanges:", await availabilityService.getBookedRanges(unit.id));
}

async function main() {
    if (first === "clean") await clean();
      else await create(first ?? "canon-eos-r5", startArg ?? "2026-03-06", endArg ?? "2026-03-09", Number(unitArg ?? 0));

    process.exit(0);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
