import { useQuery } from "@tanstack/react-query";
import { healthSchema } from "@shared/schemas/health.schema";
import { api } from "@/api/client";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => api.get("/health", { schema: healthSchema, signal }),
    select: (result) => result.data,
    refetchInterval: 15_000,
  });
}
