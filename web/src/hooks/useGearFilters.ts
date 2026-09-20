import { useSearchParams } from "react-router";
import { MOUNTS, type Mount } from "@shared/schemas/specs.schema";
import type { GearFilters } from "@/api/gear";
import { GEAR_SORTS, type GearSort } from "@shared/schemas/gear.schema";

const FILTER_KEYS = ["category", "brand", "mount", "q", "maxCents"] as const;

function toMount(value: string | null): Mount | undefined {
    return value && (MOUNTS as readonly string[]).includes(value) ? (value as Mount) : undefined;
}
function toSort(value: string | null): GearSort {
    return value && (GEAR_SORTS as readonly string[]).includes(value)
        ? (value as GearSort)
        : "name";
}


export function useGearFilters() {
    const [params, setParams] = useSearchParams();

    const maxCents = params.get("maxCents");
    const pageParam = Number(params.get("page"));
    const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
    const sort = toSort(params.get("sort"));

    const filters: GearFilters = {
        category: params.get("category") ?? undefined,
        brand: params.get("brand") ?? undefined,
        mount: toMount(params.get("mount")),
        q: params.get("q") ?? undefined,
        maxCents: maxCents ? Number(maxCents) : undefined,
        page,
        sort
    };

    function setFilter(key: (typeof FILTER_KEYS)[number], value: string) {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete("page");
        setParams(next);
    }

    function setSort(value: string) {
        const next = new URLSearchParams(params);
        if (value && value !== "name") next.set("sort", value);
        else next.delete("sort");
        next.delete("page");
        setParams(next);
    }

    function setPage(value: number) {
        const next = new URLSearchParams(params);
        if (value > 1) next.set("page", String(value));
        else next.delete("page");
        setParams(next);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }


    function clearAll() {
        setParams(new URLSearchParams());
    }

    const activeCount = FILTER_KEYS.filter((key) => params.get(key)).length;

    return { filters, setFilter, setSort, setPage, clearAll, activeCount };
}
