import { prisma } from "../src/lib/prisma";
import { productSpecsSchema, type ProductSpecs } from "@shared/schemas/specs.schema";

type SeedProduct = {
  name: string;
  slug: string;
  brand: string;
  category: string;
  description: string;
  dailyRateCents: number;
  weeklyRateCents: number | null;
  depositCents: number;
  replacementCents: number;
  mount: string | null;
  bufferDays: number;
  units: number;
  specs: ProductSpecs;
};

const brands = [
  { name: "Canon", slug: "canon" },
  { name: "Sony", slug: "sony" },
  { name: "Nikon", slug: "nikon" },
  { name: "Fujifilm", slug: "fujifilm" },
  { name: "Sigma", slug: "sigma" },
  { name: "Godox", slug: "godox" },
  { name: "Aputure", slug: "aputure" },
  { name: "Manfrotto", slug: "manfrotto" },
  { name: "DJI", slug: "dji" },
  { name: "Rode", slug: "rode" },
  { name: "Zoom", slug: "zoom" },
];

const categories = [
  { name: "Camera Bodies", slug: "bodies", description: "Mirrorless and DSLR bodies" },
  { name: "Lenses", slug: "lenses", description: "Primes and zooms across every mount" },
  { name: "Lighting", slug: "lighting", description: "Strobes and continuous lighting" },
  { name: "Support", slug: "support", description: "Tripods, gimbals and heads" },
  { name: "Audio", slug: "audio", description: "Microphones and field recorders" },
];

const products: SeedProduct[] = [
  // ---------- bodies ----------
  {
    name: "Canon EOS R5", slug: "canon-eos-r5", brand: "canon", category: "bodies",
    description: "45MP full-frame mirrorless with 8K raw video and in-body stabilisation.",
    dailyRateCents: 8500, weeklyRateCents: 51000, depositCents: 50000, replacementCents: 390000,
    mount: "RF", bufferDays: 1, units: 2,
    specs: { kind: "body", mount: "RF", sensorFormat: "full-frame", megapixels: 45, maxVideo: "8K30", weightGrams: 738 },
  },
  {
    name: "Sony a7 IV", slug: "sony-a7-iv", brand: "sony", category: "bodies",
    description: "33MP full-frame hybrid body. The reliable all-rounder for stills and video.",
    dailyRateCents: 6500, weeklyRateCents: 39000, depositCents: 40000, replacementCents: 260000,
    mount: "E", bufferDays: 1, units: 3,
    specs: { kind: "body", mount: "E", sensorFormat: "full-frame", megapixels: 33, maxVideo: "4K60", weightGrams: 659 },
  },
  {
    name: "Nikon Z6 III", slug: "nikon-z6-iii", brand: "nikon", category: "bodies",
    description: "24.5MP partially-stacked sensor with 6K raw internal recording.",
    dailyRateCents: 7000, weeklyRateCents: 42000, depositCents: 40000, replacementCents: 250000,
    mount: "Z", bufferDays: 1, units: 2,
    specs: { kind: "body", mount: "Z", sensorFormat: "full-frame", megapixels: 24.5, maxVideo: "6K60", weightGrams: 760 },
  },
  {
    name: "Fujifilm X-T5", slug: "fujifilm-x-t5", brand: "fujifilm", category: "bodies",
    description: "40MP APS-C with dial-led handling and Fuji film simulations.",
    dailyRateCents: 5500, weeklyRateCents: 33000, depositCents: 35000, replacementCents: 180000,
    mount: "X", bufferDays: 1, units: 2,
    specs: { kind: "body", mount: "X", sensorFormat: "aps-c", megapixels: 40, maxVideo: "6K30", weightGrams: 557 },
  },
  {
    name: "Canon EOS R6 Mark II", slug: "canon-eos-r6-mark-ii", brand: "canon", category: "bodies",
    description: "24MP full-frame with fast autofocus and 40fps electronic shutter.",
    dailyRateCents: 6000, weeklyRateCents: 36000, depositCents: 40000, replacementCents: 250000,
    mount: "RF", bufferDays: 1, units: 2,
    specs: { kind: "body", mount: "RF", sensorFormat: "full-frame", megapixels: 24.2, maxVideo: "4K60", weightGrams: 670 },
  },

  // ---------- lenses ----------
  {
    name: "Canon RF 24-70mm f/2.8L IS USM", slug: "canon-rf-24-70mm-f28l", brand: "canon", category: "lenses",
    description: "The standard working zoom. Constant f/2.8 with image stabilisation.",
    dailyRateCents: 4500, weeklyRateCents: 27000, depositCents: 30000, replacementCents: 240000,
    mount: "RF", bufferDays: 1, units: 3,
    specs: { kind: "lens", mount: "RF", focalLengthMinMm: 24, focalLengthMaxMm: 70, maxApertureF: 2.8, filterThreadMm: 82, stabilised: true, weightGrams: 900 },
  },
  {
    name: "Canon RF 70-200mm f/2.8L IS USM", slug: "canon-rf-70-200mm-f28l", brand: "canon", category: "lenses",
    description: "Compact telephoto zoom. Events, portraits and anything you cannot walk closer to.",
    dailyRateCents: 5000, weeklyRateCents: 30000, depositCents: 30000, replacementCents: 270000,
    mount: "RF", bufferDays: 1, units: 2,
    specs: { kind: "lens", mount: "RF", focalLengthMinMm: 70, focalLengthMaxMm: 200, maxApertureF: 2.8, filterThreadMm: 77, stabilised: true, weightGrams: 1070 },
  },
  {
    name: "Canon RF 50mm f/1.2L USM", slug: "canon-rf-50mm-f12l", brand: "canon", category: "lenses",
    description: "Fast standard prime with exceptional subject separation.",
    dailyRateCents: 4000, weeklyRateCents: 24000, depositCents: 30000, replacementCents: 240000,
    mount: "RF", bufferDays: 1, units: 3,
    specs: { kind: "lens", mount: "RF", focalLengthMinMm: 50, focalLengthMaxMm: 50, maxApertureF: 1.2, filterThreadMm: 77, stabilised: false, weightGrams: 950 },
  },
  {
    name: "Sony FE 24-70mm f/2.8 GM II", slug: "sony-fe-24-70mm-f28-gm-ii", brand: "sony", category: "lenses",
    description: "Lighter second-generation G Master standard zoom.",
    dailyRateCents: 4800, weeklyRateCents: 28800, depositCents: 30000, replacementCents: 230000,
    mount: "E", bufferDays: 1, units: 3,
    specs: { kind: "lens", mount: "E", focalLengthMinMm: 24, focalLengthMaxMm: 70, maxApertureF: 2.8, filterThreadMm: 82, stabilised: false, weightGrams: 695 },
  },
  {
    name: "Sony FE 70-200mm f/2.8 GM OSS II", slug: "sony-fe-70-200mm-f28-gm-ii", brand: "sony", category: "lenses",
    description: "Telephoto zoom with optical stabilisation and fast linear motors.",
    dailyRateCents: 5200, weeklyRateCents: 31200, depositCents: 30000, replacementCents: 280000,
    mount: "E", bufferDays: 1, units: 2,
    specs: { kind: "lens", mount: "E", focalLengthMinMm: 70, focalLengthMaxMm: 200, maxApertureF: 2.8, filterThreadMm: 77, stabilised: true, weightGrams: 1045 },
  },
  {
    name: "Sigma 35mm f/1.4 DG DN Art", slug: "sigma-35mm-f14-dg-dn-art", brand: "sigma", category: "lenses",
    description: "Wide prime for reportage and environmental portraits.",
    dailyRateCents: 2800, weeklyRateCents: 16800, depositCents: 20000, replacementCents: 90000,
    mount: "E", bufferDays: 1, units: 2,
    specs: { kind: "lens", mount: "E", focalLengthMinMm: 35, focalLengthMaxMm: 35, maxApertureF: 1.4, filterThreadMm: 67, stabilised: false, weightGrams: 640 },
  },
  {
    name: "Sigma 85mm f/1.4 DG DN Art", slug: "sigma-85mm-f14-dg-dn-art", brand: "sigma", category: "lenses",
    description: "Short telephoto portrait prime, notably light for its class.",
    dailyRateCents: 3000, weeklyRateCents: 18000, depositCents: 20000, replacementCents: 110000,
    mount: "E", bufferDays: 1, units: 2,
    specs: { kind: "lens", mount: "E", focalLengthMinMm: 85, focalLengthMaxMm: 85, maxApertureF: 1.4, filterThreadMm: 77, stabilised: false, weightGrams: 625 },
  },
  {
    name: "Nikon Z 24-70mm f/2.8 S", slug: "nikon-z-24-70mm-f28-s", brand: "nikon", category: "lenses",
    description: "S-line standard zoom with a customisable OLED information panel.",
    dailyRateCents: 4500, weeklyRateCents: 27000, depositCents: 30000, replacementCents: 220000,
    mount: "Z", bufferDays: 1, units: 2,
    specs: { kind: "lens", mount: "Z", focalLengthMinMm: 24, focalLengthMaxMm: 70, maxApertureF: 2.8, filterThreadMm: 82, stabilised: false, weightGrams: 805 },
  },

  // ---------- lighting ----------
  {
    name: "Godox AD200 Pro", slug: "godox-ad200-pro", brand: "godox", category: "lighting",
    description: "200Ws battery strobe with interchangeable bare-bulb and speedlite heads.",
    dailyRateCents: 2200, weeklyRateCents: 13200, depositCents: 15000, replacementCents: 35000,
    mount: null, bufferDays: 1, units: 3,
    specs: { kind: "lighting", type: "strobe", powerWs: 200, colorTempK: 5600, batteryPowered: true, weightGrams: 560 },
  },
  {
    name: "Godox AD600 Pro", slug: "godox-ad600-pro", brand: "godox", category: "lighting",
    description: "600Ws battery strobe for location work that needs to beat the sun.",
    dailyRateCents: 3500, weeklyRateCents: 21000, depositCents: 20000, replacementCents: 90000,
    mount: null, bufferDays: 1, units: 2,
    specs: { kind: "lighting", type: "strobe", powerWs: 600, colorTempK: 5600, batteryPowered: true, weightGrams: 2900 },
  },
  {
    name: "Aputure LS 300d Mark II", slug: "aputure-ls-300d-mark-ii", brand: "aputure", category: "lighting",
    description: "Daylight-balanced continuous LED for video. Bowens mount.",
    dailyRateCents: 4000, weeklyRateCents: 24000, depositCents: 20000, replacementCents: 110000,
    mount: null, bufferDays: 2, units: 2,
    specs: { kind: "lighting", type: "continuous", powerWs: null, colorTempK: 5500, batteryPowered: false, weightGrams: 3100 },
  },

  // ---------- support ----------
  {
    name: "Manfrotto 055 Carbon Fibre Tripod", slug: "manfrotto-055-carbon", brand: "manfrotto", category: "support",
    description: "Three-section carbon tripod with a 90-degree centre column.",
    dailyRateCents: 1500, weeklyRateCents: 9000, depositCents: 10000, replacementCents: 45000,
    mount: null, bufferDays: 1, units: 2,
    specs: { kind: "support", type: "tripod", maxLoadKg: 9, weightGrams: 2100 },
  },
  {
    name: "DJI RS 4 Pro", slug: "dji-rs-4-pro", brand: "dji", category: "support",
    description: "Three-axis gimbal for cinema-style movement with heavier rigs.",
    dailyRateCents: 3500, weeklyRateCents: 21000, depositCents: 25000, replacementCents: 90000,
    mount: null, bufferDays: 1, units: 2,
    specs: { kind: "support", type: "gimbal", maxLoadKg: 4.5, weightGrams: 1230 },
  },
  {
    name: "Manfrotto 502 Fluid Video Head", slug: "manfrotto-502-fluid-head", brand: "manfrotto", category: "support",
    description: "Fluid head for smooth pans and tilts. Pairs with the 055 legs.",
    dailyRateCents: 1200, weeklyRateCents: 7200, depositCents: 8000, replacementCents: 30000,
    mount: null, bufferDays: 1, units: 2,
    specs: { kind: "support", type: "head", maxLoadKg: 7, weightGrams: 1500 },
  },

  // ---------- audio ----------
  {
    name: "Rode NTG5 Shotgun Microphone", slug: "rode-ntg5", brand: "rode", category: "audio",
    description: "Lightweight broadcast shotgun mic with a near-transparent off-axis response.",
    dailyRateCents: 1400, weeklyRateCents: 8400, depositCents: 10000, replacementCents: 50000,
    mount: null, bufferDays: 1, units: 2,
    specs: { kind: "audio", type: "shotgun", connector: "xlr", phantomPower: true, weightGrams: 76 },
  },
  {
    name: "Zoom H6 Field Recorder", slug: "zoom-h6", brand: "zoom", category: "audio",
    description: "Six-track portable recorder with interchangeable capsules.",
    dailyRateCents: 1600, weeklyRateCents: 9600, depositCents: 10000, replacementCents: 40000,
    mount: null, bufferDays: 1, units: 2,
    specs: { kind: "audio", type: "recorder", connector: "xlr", phantomPower: true, weightGrams: 280 },
  },
];

const placeholder = (name: string) =>
  `https://placehold.co/1200x800/e7eaec/14171a?text=${encodeURIComponent(name)}`;

async function main() {
  for (const b of brands) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name },
      create: b,
    });
  }

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: c,
    });
  }

  for (const p of products) {
    // Same schema the API will validate against. A typo fails here, not in production.
    const specs = productSpecsSchema.parse(p.specs);

    const brand = await prisma.brand.findUniqueOrThrow({ where: { slug: p.brand } });
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: p.category } });

    const fields = {
      name: p.name,
      description: p.description,
      images: [placeholder(p.name)],
      specs,
      dailyRateCents: p.dailyRateCents,
      weeklyRateCents: p.weeklyRateCents,
      depositCents: p.depositCents,
      replacementCents: p.replacementCents,
      mount: p.mount,
      bufferDays: p.bufferDays,
      brandId: brand.id,
      categoryId: category.id,
    };

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: fields,
      create: { slug: p.slug, ...fields },
    });

    for (let i = 1; i <= p.units; i++) {
      const serialNumber = `${p.slug.toUpperCase()}-${String(i).padStart(2, "0")}`;

      await prisma.gearUnit.upsert({
        where: { serialNumber },
        update: { productId: product.id },
        create: { serialNumber, productId: product.id },
      });
    }
  }

  const [productCount, unitCount] = await Promise.all([
    prisma.product.count(),
    prisma.gearUnit.count(),
  ]);

  console.log(`Seeded ${brands.length} brands, ${categories.length} categories, ${productCount} products, ${unitCount} units`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
