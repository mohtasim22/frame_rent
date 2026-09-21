import { useQuery } from "@tanstack/react-query";
import { postQuote } from "@/api/booking";
import type { CartLine } from "@/store/cart";

/**
 * Prices the cart on the server.
 *
 * Only what the server actually needs goes into the request — and therefore
 * into the query key. The snapshot prices and the line `id` are ours, not its.
 */
export function useQuote(lines: CartLine[], options: { enabled?: boolean } = {}) {
  const requestLines = lines.map(({ slug, start, end }) => ({ slug, start, end }));

  return useQuery({
    queryKey: ["quote", requestLines],
    queryFn: ({ signal }) => postQuote({ lines: requestLines }, signal),
    select: (result) => result.data,
    enabled: (options.enabled ?? true) && requestLines.length > 0,
    staleTime: 15_000,
  });
}
