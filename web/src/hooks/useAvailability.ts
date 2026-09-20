import { useQuery } from "@tanstack/react-query";
import { getAvailability } from "@/api/gear";

export function useAvailability(slug: string, from: string, to: string) {
  return useQuery({
    queryKey: ["availability", slug, from, to],
    queryFn: ({ signal }) => getAvailability(slug, from, to, signal),
    select: (result) => result.data,
    enabled: slug.length > 0,
  });
}
