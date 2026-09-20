
import {
  addMonths,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { useAvailability } from "@/hooks/useAvailability";
import { formatCents } from "@/lib/format";
import type { GearItem } from "@shared/schemas/gear.schema";
import { quoteRental, rentalDays } from "@shared/lib/pricing";

type Props = {
  item: GearItem;
  range: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
};

export function AvailabilityCalendar({ item, range, onRangeChange }: Props) {

  const today = new Date();
  const windowStart = startOfMonth(today);
  const windowEnd = endOfMonth(addMonths(today, 1));

  const availability = useAvailability(
    item.slug,
    format(windowStart, "yyyy-MM-dd"),
    format(windowEnd, "yyyy-MM-dd"),
  );

  if (availability.isPending) {
    return <Skeleton className="h-80 w-full rounded-xl" />;
  }

  if (availability.isError) {
    return (
      <ErrorState
        error={availability.error}
        onRetry={() => availability.refetch()}
      />
    );
  }

  const blockedDays = availability.data.unavailableDates.map((day) =>
    parseISO(day),
  );

  return (
    <div className="rounded-xl border p-4">
      <Calendar
        mode="range"
        selected={range}
        onSelect={onRangeChange}
        disabled={[{ before: today }, ...blockedDays]}
        excludeDisabled
        startMonth={windowStart}
        endMonth={windowEnd}
      />

      <p className="mt-3 border-t pt-3 text-sm">
              {range?.from && range.to ? (
        (() => {
          const quote = quoteRental(
            {
              dailyRateCents: item.dailyRateCents,
              weeklyRateCents: item.weeklyRateCents,
              depositCents: item.depositCents,
            },
            rentalDays(
              format(range.from, "yyyy-MM-dd"),
              format(range.to, "yyyy-MM-dd"),
            ),
          );

          return (
            <div className="mt-3 space-y-1 border-t pt-3 text-sm">
              <p className="font-medium">
                {format(range.from, "d MMM")} –{" "}
                {format(range.to, "d MMM yyyy")}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {quote.days} {quote.days === 1 ? "day" : "days"}
                </span>
              </p>

              <div className="flex justify-between text-muted-foreground">
                <span>
                  {quote.weeks > 0
                    ? `${quote.weeks} week${quote.weeks === 1 ? "" : "s"}${quote.extraDays > 0 ? ` + ${quote.extraDays} day${quote.extraDays === 1 ? "" : "s"}` : ""}`
                    : `${quote.days} × ${formatCents(item.dailyRateCents)}`}
                </span>
                <span>{formatCents(quote.subtotalCents)}</span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Refundable deposit</span>
                <span>{formatCents(quote.depositCents)}</span>
              </div>

              <div className="flex justify-between border-t pt-1 font-medium text-foreground">
                <span>Total due at pickup</span>
                <span>{formatCents(quote.totalCents)}</span>
              </div>
            </div>
          );
        })()
      ) : (
        <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
          Select your rental dates
        </p>
      )}

      </p>
    </div>
  );
}
