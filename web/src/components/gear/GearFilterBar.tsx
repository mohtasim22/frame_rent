import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MOUNTS } from "@shared/schemas/specs.schema";
import { useBrands, useCategories } from "@/hooks/useTaxonomy";
import { useGearFilters } from "@/hooks/useGearFilters";

const PRICE_BANDS = [
  { value: "2000", label: "Up to €20 / day" },
  { value: "4000", label: "Up to €40 / day" },
  { value: "6000", label: "Up to €60 / day" },
];

const selectClass =
  "h-9 rounded-md border bg-background px-2 text-sm text-foreground";

export function GearFilterBar() {
  const { filters, setFilter, clearAll, activeCount, setSort } = useGearFilters();
  const categories = useCategories();
  const brands = useBrands();

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get("q");
          setFilter("q", typeof value === "string" ? value.trim() : "");
        }}
      >
        <Input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Search gear…"
          aria-label="Search gear"
          className="h-9 w-48"
        />
      </form>

      <select
        className={selectClass}
        aria-label="Category"
        value={filters.category ?? ""}
        onChange={(event) => setFilter("category", event.target.value)}
      >
        <option value="">All categories</option>
        {categories.data?.map((category) => (
          <option key={category.id} value={category.slug}>
            {category.name}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        aria-label="Brand"
        value={filters.brand ?? ""}
        onChange={(event) => setFilter("brand", event.target.value)}
      >
        <option value="">All brands</option>
        {brands.data?.map((brand) => (
          <option key={brand.id} value={brand.slug}>
            {brand.name}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        aria-label="Mount"
        value={filters.mount ?? ""}
        onChange={(event) => setFilter("mount", event.target.value)}
      >
        <option value="">Any mount</option>
        {MOUNTS.map((mount) => (
          <option key={mount} value={mount}>
            {mount}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        aria-label="Maximum daily rate"
        value={filters.maxCents ? String(filters.maxCents) : ""}
        onChange={(event) => setFilter("maxCents", event.target.value)}
      >
        <option value="">Any price</option>
        {PRICE_BANDS.map((band) => (
          <option key={band.value} value={band.value}>
            {band.label}
          </option>
        ))}
      </select>

      <select
  className={selectClass}
  aria-label="Sort by"
  value={filters.sort ?? "name"}
  onChange={(event) => setSort(event.target.value)}
>
  <option value="name">Name (A–Z)</option>
  <option value="price-asc">Price: low to high</option>
  <option value="price-desc">Price: high to low</option>
  <option value="newest">Newest first</option>
</select>


      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
        </Button>
      )}
    </div>
  );
}
