import { useState } from "react";
import { Link } from "react-router";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { formatCents } from "@/lib/format";
import { statusTone } from "@/lib/status";
import { useMyBookings } from "@/hooks/useBooking";
import { ReviewPrompt } from "@/components/reviews/ReviewPrompt";

const SCOPES = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All" },
] as const;

type Scope = (typeof SCOPES)[number]["value"];

export function MyRentalsPage() {
  const [scope, setScope] = useState<Scope>("upcoming");
  const bookings = useMyBookings(scope);

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">My rentals</h1>

      <ReviewPrompt />

      <div className="mt-4 flex gap-1 rounded-lg border p-1" role="tablist">
        {SCOPES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={scope === option.value}
            onClick={() => setScope(option.value)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm transition-colors ${
              scope === option.value
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {bookings.isPending && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {bookings.isError && (
        <div className="mt-6">
          <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} />
        </div>
      )}

      {bookings.isSuccess && bookings.data.length === 0 && (
        <EmptyState
          title={scope === "past" ? "No past rentals" : "Nothing booked yet"}
          description="When you rent something it shows up here."
          action={
            <Link to="/" className="text-sm underline underline-offset-4">
              Browse the catalogue
            </Link>
          }
        />
      )}

      {bookings.isSuccess && bookings.data.length > 0 && (
        <ul className="mt-6 space-y-3">
          {bookings.data.map((booking) => (
            <li key={booking.id}>
              <Link
                to={`/booking/${booking.reference}`}
                className="block rounded-xl border p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{booking.headline}</span>
                  <Badge variant={statusTone(booking.status)}>{booking.status}</Badge>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  {format(parseISO(booking.startDate), "d MMM")} –{" "}
                  {format(parseISO(booking.endDate), "d MMM yyyy")} ·{" "}
                  {booking.itemCount} {booking.itemCount === 1 ? "item" : "items"}
                </p>

                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">
                    {booking.reference}
                  </span>
                  <span className="text-sm font-medium">
                    {formatCents(booking.totalCents)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
