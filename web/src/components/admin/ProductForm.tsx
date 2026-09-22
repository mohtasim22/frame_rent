import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productInputSchema } from "@shared/schemas/admin.schema";
import type { ProductInput } from "@shared/schemas/admin.schema";
import type { ProductSpecs } from "@shared/schemas/specs.schema";
import { z } from "zod";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/format";
import { useBrands, useCategories } from "@/hooks/useTaxonomy";
import { EMPTY_SPECS, SPEC_KINDS, SpecsFields } from "./SpecsFields";
import type { SpecKind } from "./SpecsFields";

const result = z.object({ id: z.string(), slug: z.string() });

const labelClass = "text-sm font-medium";
const selectClass =
  "mt-1 block w-full rounded-md border bg-transparent px-3 py-2 text-sm";

type Draft = {
  name: string;
  slug: string;
  description: string;
  dailyRate: string;
  weeklyRate: string;
  deposit: string;
  replacement: string;
  bufferDays: string;
  brandId: string;
  categoryId: string;
  specs: ProductSpecs;
};

const BLANK: Draft = {
  name: "",
  slug: "",
  description: "",
  dailyRate: "",
  weeklyRate: "",
  deposit: "",
  replacement: "",
  bufferDays: "1",
  brandId: "",
  categoryId: "",
  specs: EMPTY_SPECS.body,
};

/** Prices are entered in euro and stored in cents. One place does the maths. */
function toCents(euro: string): number {
  return Math.round(Number(euro) * 100);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProductForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const brands = useBrands();
  const categories = useCategories();

  const [draft, setDraft] = useState<Draft>(BLANK);
  const [issues, setIssues] = useState<string[]>([]);

  const create = useMutation({
    mutationFn: (input: ProductInput) =>
      api.post("/api/v1/admin/products", input, { schema: result }),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gear"] });
      setDraft(BLANK);
      onDone();
    },
  });

  const set = (fields: Partial<Draft>) => setDraft((d) => ({ ...d, ...fields }));

  function submit() {
    setIssues([]);

    // The SAME schema the endpoint validates against, so the form cannot
    // accept something the API will reject — and the messages match.
    const parsed = productInputSchema.safeParse({
      name: draft.name,
      slug: draft.slug || slugify(draft.name),
      description: draft.description,
      images: [],
      specs: draft.specs,
      dailyRateCents: toCents(draft.dailyRate),
      weeklyRateCents: draft.weeklyRate === "" ? null : toCents(draft.weeklyRate),
      depositCents: toCents(draft.deposit),
      replacementCents: toCents(draft.replacement),
      mount: "mount" in draft.specs ? draft.specs.mount : null,
      bufferDays: Number(draft.bufferDays),
      isActive: true,
      brandId: draft.brandId,
      categoryId: draft.categoryId,
    });

    if (!parsed.success) {
      setIssues(
        parsed.error.issues.map(
          (issue) => `${issue.path.join(".") || "form"}: ${issue.message}`,
        ),
      );
      return;
    }

    create.mutate(parsed.data);
  }

  const previewDaily = draft.dailyRate === "" ? null : toCents(draft.dailyRate);

  return (
    <div className="mt-4 rounded-xl border p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        New product
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Name</span>
          <Input
            className="mt-1"
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Canon EOS R5"
          />
        </label>

        <label className="block">
          <span className={labelClass}>
            Slug{" "}
            <span className="font-normal text-muted-foreground">
              (blank = from the name)
            </span>
          </span>
          <Input
            className="mt-1"
            value={draft.slug}
            onChange={(e) => set({ slug: e.target.value })}
            placeholder={draft.name ? slugify(draft.name) : "canon-eos-r5"}
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className={labelClass}>Description</span>
        <textarea
          rows={3}
          className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Brand</span>
          <select
            className={selectClass}
            value={draft.brandId}
            onChange={(e) => set({ brandId: e.target.value })}
          >
            <option value="">Choose…</option>
            {brands.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelClass}>Category</span>
          <select
            className={selectClass}
            value={draft.categoryId}
            onChange={(e) => set({ categoryId: e.target.value })}
          >
            <option value="">Choose…</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        {(
          [
            ["Daily rate (€)", "dailyRate"],
            ["Weekly rate (€)", "weeklyRate"],
            ["Deposit (€)", "deposit"],
            ["Replacement (€)", "replacement"],
          ] as const
        ).map(([label, key]) => (
          <label key={key} className="block">
            <span className={labelClass}>{label}</span>
            <Input
              type="number"
              step="0.01"
              className="mt-1"
              value={draft[key]}
              onChange={(e) => set({ [key]: e.target.value } as Partial<Draft>)}
            />
          </label>
        ))}
      </div>

      {previewDaily !== null && Number.isFinite(previewDaily) && (
        <p className="mt-1 text-xs text-muted-foreground">
          Stored as {previewDaily} cents — {formatCents(previewDaily)}/day.
        </p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Turnaround buffer (days)</span>
          <Input
            type="number"
            className="mt-1"
            value={draft.bufferDays}
            onChange={(e) => set({ bufferDays: e.target.value })}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Kind</span>
          <select
            className={selectClass}
            value={draft.specs.kind}
            // Switching kind REPLACES the specs object rather than merging, so
            // a lens can never keep a body's megapixels.
            onChange={(e) => set({ specs: EMPTY_SPECS[e.target.value as SpecKind] })}
          >
            {SPEC_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-lg border p-3">
        <p className="text-sm font-medium">
          Specifications{" "}
          <span className="font-normal text-muted-foreground">
            — fields follow the kind
          </span>
        </p>
        <div className="mt-3">
          <SpecsFields specs={draft.specs} onChange={(specs) => set({ specs })} />
        </div>
      </div>

      {(issues.length > 0 || create.isError) && (
        <ul className="mt-3 space-y-1 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
          {create.isError && <li>{create.error.message}</li>}
        </ul>
      )}

      <div className="mt-4 flex gap-2">
        <Button onClick={submit} disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create product"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Add units and images from the list once it exists.
      </p>
    </div>
  );
}
