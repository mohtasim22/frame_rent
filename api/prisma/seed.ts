import { prisma } from "../src/lib/prisma";

const brands = [
  { name: "Canon", slug: "canon" },
  { name: "Sony", slug: "sony" },
  { name: "Nikon", slug: "nikon" },
  { name: "Fujifilm", slug: "fujifilm" },
  { name: "Sigma", slug: "sigma" },
];

async function main() {
  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {},
      create: brand,
    });
  }

  console.log(`Seeded ${brands.length} brands`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());