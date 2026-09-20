import type { Quote } from "@shared/lib/pricing";
import { quoteRental, rentalDays } from "@shared/lib/pricing";
import type { CartLine } from "@/store/cart";

export type CartLineQuote = {
  line: CartLine;
  quote: Quote;
  expired: boolean;
};

export type CartSummary = {
  items: CartLineQuote[];
  subtotalCents: number;
  depositCents: number;
  totalCents: number;
  hasExpired: boolean;
};

/**
 * Prices every line in the cart.
 *
 * `today` is passed in rather than read from the clock so this stays pure —
 * same inputs, same output, testable without freezing time.
 *
 * These totals are for DISPLAY. The server re-prices everything from the
 * database when the booking is created (F3).
 */
export function summariseCart(lines: CartLine[], today: string): CartSummary {
  const items = lines.map((line) => ({
    line,
    quote: quoteRental(
      {
        dailyRateCents: line.dailyRateCents,
        weeklyRateCents: line.weeklyRateCents,
        depositCents: line.depositCents,
      },
      rentalDays(line.start, line.end),
    ),
    expired: line.start < today,
  }));

  const subtotalCents = items.reduce((sum, item) => sum + item.quote.subtotalCents, 0);
  const depositCents = items.reduce((sum, item) => sum + item.quote.depositCents, 0);

  return {
    items,
    subtotalCents,
    depositCents,
    totalCents: subtotalCents + depositCents,
    hasExpired: items.some((item) => item.expired),
  };
}
