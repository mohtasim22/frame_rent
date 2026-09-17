import { useQuery } from "@tanstack/react-query";
import { getGear, getGearBySlug, type GearFilters } from "@/api/gear";

export const gearKeys = {
  all: ["gear"] as const,
  list: (filters: GearFilters) => ["gear", "list", filters] as const,
  detail: (slug: string) => ["gear", "detail", slug] as const,
};

export function useGear(filters: GearFilters = {}) {
  return useQuery({
    queryKey: gearKeys.list(filters),
    queryFn: ({ signal }) => getGear(filters, signal),
  });
}

export function useGearDetail(slug: string) {
  return useQuery({
    queryKey: gearKeys.detail(slug),
    queryFn: ({ signal }) => getGearBySlug(slug, signal),
    enabled: slug.length > 0,
  });
}
