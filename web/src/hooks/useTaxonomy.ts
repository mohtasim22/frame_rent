import { useQuery } from "@tanstack/react-query";
import { getBrands, getCategories } from "@/api/taxonomy";

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: ({ signal }) => getBrands(signal),
    select: (result) => result.data,
    staleTime: Infinity,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => getCategories(signal),
    select: (result) => result.data,
    staleTime: Infinity,
  });
}
