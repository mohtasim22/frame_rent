import { MOUNTS } from "@shared/schemas/specs.schema";
import type { ProductSpecs } from "@shared/schemas/specs.schema";
import { Input } from "@/components/ui/input";

export const SPEC_KINDS = ["body", "lens", "lighting", "support", "audio"] as const;
export type SpecKind = (typeof SPEC_KINDS)[number];

/**
 * A starting value for each shape, so switching `kind` produces a complete
 * object rather than one with half the previous kind's fields still attached.
 * The discriminated union means a `lens` carrying `megapixels` would fail
 * validation in a way that is annoying to debug from the form.
 */
export const EMPTY_SPECS: Record<SpecKind, ProductSpecs> = {
  body: {
    kind: "body",
    mount: "RF",
    sensorFormat: "full-frame",
    megapixels: 24,
    maxVideo: "4K60",
    weightGrams: 700,
  },
  lens: {
    kind: "lens",
    mount: "RF",
    focalLengthMinMm: 50,
    focalLengthMaxMm: 50,
    maxApertureF: 1.8,
    filterThreadMm: 67,
    stabilised: false,
    weightGrams: 500,
  },
  lighting: {
    kind: "lighting",
    type: "continuous",
    powerWs: null,
    colorTempK: 5600,
    batteryPowered: false,
    weightGrams: 2000,
  },
  support: {
    kind: "support",
    type: "tripod",
    maxLoadKg: 10,
    weightGrams: 1800,
  },
  audio: {
    kind: "audio",
    type: "shotgun",
    connector: "xlr",
    phantomPower: true,
    weightGrams: 150,
  },
};

const labelClass = "text-sm font-medium";
const selectClass =
  "mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Num({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  step?: string;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        step={step}
        className="mt-1"
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
      />
    </Field>
  );
}

function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 pt-6 text-sm">
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <Field label={label}>
      <select
        className={selectClass}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

/**
 * Renders the fields for whichever kind of product this is.
 *
 * The switch is exhaustive against the discriminated union, so adding a sixth
 * kind to specs.schema.ts makes this fail to compile until the form learns
 * about it — which is the point of modelling specs as a union rather than a
 * bag of optional fields.
 */
export function SpecsFields({
  specs,
  onChange,
}: {
  specs: ProductSpecs;
  onChange: (next: ProductSpecs) => void;
}) {
  const patch = (fields: Partial<ProductSpecs>) =>
    onChange({ ...specs, ...fields } as ProductSpecs);

  switch (specs.kind) {
    case "body":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <Choice label="Mount" value={specs.mount} options={MOUNTS} onChange={(mount) => patch({ mount })} />
          <Choice
            label="Sensor"
            value={specs.sensorFormat}
            options={["full-frame", "aps-c", "micro-four-thirds"] as const}
            onChange={(sensorFormat) => patch({ sensorFormat })}
          />
          <Num label="Megapixels" step="0.1" value={specs.megapixels} onChange={(n) => patch({ megapixels: n ?? 0 })} />
          <Field label="Max video">
            <Input className="mt-1" value={specs.maxVideo} onChange={(e) => patch({ maxVideo: e.target.value })} />
          </Field>
          <Num label="Weight (g)" value={specs.weightGrams} onChange={(n) => patch({ weightGrams: n ?? 0 })} />
        </div>
      );

    case "lens":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <Choice label="Mount" value={specs.mount} options={MOUNTS} onChange={(mount) => patch({ mount })} />
          <Num label="Focal min (mm)" value={specs.focalLengthMinMm} onChange={(n) => patch({ focalLengthMinMm: n ?? 0 })} />
          <Num label="Focal max (mm)" value={specs.focalLengthMaxMm} onChange={(n) => patch({ focalLengthMaxMm: n ?? 0 })} />
          <Num label="Max aperture f/" step="0.1" value={specs.maxApertureF} onChange={(n) => patch({ maxApertureF: n ?? 0 })} />
          <Num label="Filter thread (mm)" value={specs.filterThreadMm} onChange={(n) => patch({ filterThreadMm: n })} />
          <Num label="Weight (g)" value={specs.weightGrams} onChange={(n) => patch({ weightGrams: n ?? 0 })} />
          <Check label="Stabilised" value={specs.stabilised} onChange={(stabilised) => patch({ stabilised })} />
        </div>
      );

    case "lighting":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <Choice label="Type" value={specs.type} options={["strobe", "continuous"] as const} onChange={(type) => patch({ type })} />
          <Num label="Power (Ws)" value={specs.powerWs} onChange={(n) => patch({ powerWs: n })} />
          <Num label="Colour temp (K)" value={specs.colorTempK} onChange={(n) => patch({ colorTempK: n ?? 0 })} />
          <Num label="Weight (g)" value={specs.weightGrams} onChange={(n) => patch({ weightGrams: n ?? 0 })} />
          <Check label="Battery powered" value={specs.batteryPowered} onChange={(batteryPowered) => patch({ batteryPowered })} />
        </div>
      );

    case "support":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <Choice
            label="Type"
            value={specs.type}
            options={["tripod", "gimbal", "slider", "head"] as const}
            onChange={(type) => patch({ type })}
          />
          <Num label="Max load (kg)" step="0.1" value={specs.maxLoadKg} onChange={(n) => patch({ maxLoadKg: n ?? 0 })} />
          <Num label="Weight (g)" value={specs.weightGrams} onChange={(n) => patch({ weightGrams: n ?? 0 })} />
        </div>
      );

    case "audio":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <Choice
            label="Type"
            value={specs.type}
            options={["shotgun", "lavalier", "recorder", "wireless"] as const}
            onChange={(type) => patch({ type })}
          />
          <Choice
            label="Connector"
            value={specs.connector}
            options={["xlr", "3.5mm", "usb-c"] as const}
            onChange={(connector) => patch({ connector })}
          />
          <Num label="Weight (g)" value={specs.weightGrams} onChange={(n) => patch({ weightGrams: n ?? 0 })} />
          <Check label="Needs phantom power" value={specs.phantomPower} onChange={(phantomPower) => patch({ phantomPower })} />
        </div>
      );

    default: {
      // If a new kind is added to the union, `specs` stops being `never` here
      // and this line refuses to compile.
      const exhaustive: never = specs;
      return exhaustive;
    }
  }
}
