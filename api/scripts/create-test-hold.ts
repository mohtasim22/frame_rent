import { prisma } from "../src/lib/prisma";

const [, , first, startArg, endArg, unitArg] = process.argv;

async function clean() {
  const { count } = await prisma.maintenanceHold.deleteMany({
    where: { reason: { startsWith: "TEST-HOLD" } },
  });
  console.log(`Deleted ${count} test hold(s).`);
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

  await prisma.maintenanceHold.create({
    data: {
      reason: "TEST-HOLD sensor clean",
      startDate: new Date(`${start}T00:00:00Z`),
      endDate: new Date(`${end}T00:00:00Z`),
      gearUnitId: unit.id,
    },
  });

  console.log(`Held ${product.name} (${unit.serialNumber})  ${start} → ${end}`);
}

async function main() {
  if (first === "clean") await clean();
  else await create(first ?? "canon-eos-r5", startArg ?? "2026-03-20", endArg ?? "2026-03-22", Number(unitArg ?? 0));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
