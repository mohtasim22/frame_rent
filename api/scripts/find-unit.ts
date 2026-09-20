import { prisma } from "../src/lib/prisma";
import { availabilityService } from "../src/modules/availability/availability.service";

const [, , slug = "canon-eos-r5", start = "2026-03-06", end = "2026-03-09"] = process.argv;

async function main() {
  const product = await prisma.product.findUniqueOrThrow({ where: { slug } });
  const unitId = await availabilityService.findAvailableUnit(product.id, start, end);

  if (!unitId) {
    console.log(`${product.name}  ${start} → ${end}:  no unit available`);
    process.exit(0);
  }

  const unit = await prisma.gearUnit.findUniqueOrThrow({ where: { id: unitId } });
  console.log(`${product.name}  ${start} → ${end}:  allocated ${unit.serialNumber}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
