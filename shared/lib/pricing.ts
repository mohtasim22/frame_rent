export type RentalRates = {
  dailyRateCents: number;
  weeklyRateCents: number | null;
  depositCents: number;
};

export type Quote = {
  days: number;
  weeks: number;
  extraDays: number;
  subtotalCents: number;
  depositCents: number;
  totalCents: number;
};

const DAY_MS = 86_400_000;

/** Inclusive rental length: the 6th to the 9th is four days. */
export function rentalDays(start: string, end: string): number {
  return (
    Math.round(
      (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS,
    ) + 1
  );
}

/**
 * Whole weeks are charged at the weekly rate, leftover days at the daily rate —
 * but a rental never costs more than paying the daily rate the whole way.
 */
export function quoteRental(rates: RentalRates, days: number): Quote {
  if (days < 1) {
    throw new Error(`A rental must be at least one day, got ${days}`);
  }

  const dailyOnlyCents = rates.dailyRateCents * days;

  const weeks = rates.weeklyRateCents === null ? 0 : Math.floor(days / 7);
  const extraDays = days - weeks * 7;
  const weeklyCents = weeks * (rates.weeklyRateCents ?? 0) + extraDays * rates.dailyRateCents;

  const subtotalCents = Math.min(dailyOnlyCents, weeklyCents);

  return {
    days,
    weeks,
    extraDays,
    subtotalCents,
    depositCents: rates.depositCents,
    totalCents: subtotalCents + rates.depositCents,
  };
}
