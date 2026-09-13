import { z } from "zod";

export const MOUNTS = ["RF", "EF", "E", "Z", "X", "L", "MFT"] as const;
export type Mount = (typeof MOUNTS)[number];

export const bodySpecsSchema = z.object({
  kind: z.literal("body"),
  mount: z.enum(MOUNTS),
  sensorFormat: z.enum(["full-frame", "aps-c", "micro-four-thirds"]),
  megapixels: z.number().positive(),
  maxVideo: z.string(),
  weightGrams: z.number().int().positive(),
});

export const lensSpecsSchema = z.object({
  kind: z.literal("lens"),
  mount: z.enum(MOUNTS),
  focalLengthMinMm: z.number().positive(),
  focalLengthMaxMm: z.number().positive(),
  maxApertureF: z.number().positive(),
  filterThreadMm: z.number().int().positive().nullable(),
  stabilised: z.boolean(),
  weightGrams: z.number().int().positive(),
});

export const lightingSpecsSchema = z.object({
  kind: z.literal("lighting"),
  type: z.enum(["strobe", "continuous"]),
  powerWs: z.number().int().positive().nullable(),
  colorTempK: z.number().int().positive(),
  batteryPowered: z.boolean(),
  weightGrams: z.number().int().positive(),
});

export const supportSpecsSchema = z.object({
  kind: z.literal("support"),
  type: z.enum(["tripod", "gimbal", "slider", "head"]),
  maxLoadKg: z.number().positive(),
  weightGrams: z.number().int().positive(),
});

export const audioSpecsSchema = z.object({
  kind: z.literal("audio"),
  type: z.enum(["shotgun", "lavalier", "recorder", "wireless"]),
  connector: z.enum(["xlr", "3.5mm", "usb-c"]),
  phantomPower: z.boolean(),
  weightGrams: z.number().int().positive(),
});

export const productSpecsSchema = z.discriminatedUnion("kind", [
  bodySpecsSchema,
  lensSpecsSchema,
  lightingSpecsSchema,
  supportSpecsSchema,
  audioSpecsSchema,
]);

export type ProductSpecs = z.infer<typeof productSpecsSchema>;
