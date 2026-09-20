import type { ProductSpecs } from "@shared/schemas/specs.schema";

const yesNo = (value: boolean) => (value ? "Yes" : "No");
const grams = (g: number) => (g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g} g`);

const SENSOR_LABELS = {
  "full-frame": "Full frame",
  "aps-c": "APS-C",
  "micro-four-thirds": "Micro Four Thirds",
} as const;

export function specRows(specs: ProductSpecs): Array<[string, string]> {
  switch (specs.kind) {
    case "body":
      return [
        ["Mount", specs.mount],
        ["Sensor", SENSOR_LABELS[specs.sensorFormat]],
        ["Resolution", `${specs.megapixels} MP`],
        ["Max video", specs.maxVideo],
        ["Weight", grams(specs.weightGrams)],
      ];
    case "lens":
      return [
        ["Mount", specs.mount],
        [
          "Focal length",
          specs.focalLengthMinMm === specs.focalLengthMaxMm
            ? `${specs.focalLengthMinMm}mm`
            : `${specs.focalLengthMinMm}–${specs.focalLengthMaxMm}mm`,
        ],
        ["Max aperture", `f/${specs.maxApertureF}`],
        ["Filter thread", specs.filterThreadMm ? `${specs.filterThreadMm}mm` : "—"],
        ["Stabilised", yesNo(specs.stabilised)],
        ["Weight", grams(specs.weightGrams)],
      ];
    case "lighting":
      return [
        ["Type", specs.type === "strobe" ? "Strobe" : "Continuous"],
        ["Power", specs.powerWs ? `${specs.powerWs} Ws` : "—"],
        ["Colour temperature", `${specs.colorTempK} K`],
        ["Battery powered", yesNo(specs.batteryPowered)],
        ["Weight", grams(specs.weightGrams)],
      ];
    case "support":
      return [
        ["Type", specs.type],
        ["Max load", `${specs.maxLoadKg} kg`],
        ["Weight", grams(specs.weightGrams)],
      ];
    case "audio":
      return [
        ["Type", specs.type],
        ["Connector", specs.connector],
        ["Phantom power", yesNo(specs.phantomPower)],
        ["Weight", grams(specs.weightGrams)],
      ];
    default: {
      const exhaustive: never = specs;
      return exhaustive;
    }
  }
}
