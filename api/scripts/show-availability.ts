import { prisma } from "../src/lib/prisma";
import { availabilityService } from "../src/modules/availability/availability.service";

const [, , slug = "canon-eos-r5", from = "2026-03-01", to = "2026-03-15"] = process.argv;

async function main() {
  const product = await prisma.product.findUniqueOrThrow({
    where: { slug },
    include: { units: true },
  });

  const bookable = product.units.filter((unit) => unit.status === "AVAILABLE").length;
  const blocked = await availabilityService.getUnavailableDates(product.id, from, to);

  console.log(
    `${product.name} — ${bookable} bookable unit(s), buffer ${product.bufferDays} day(s), window ${from} → ${to}`,
  );
  console.log(blocked.length ? `blocked: ${blocked.join(", ")}` : "blocked: none");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
