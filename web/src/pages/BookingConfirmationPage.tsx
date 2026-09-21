import { Link, useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { statusLabel, statusTone } from "@/lib/status";
import { useCancelBooking } from "@/hooks/useBooking";
import { ApiError } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { formatCents } from "@/lib/format";
import { useBookingByReference } from "@/hooks/useBooking";

export function BookingConfirmationPage() {
  const { reference } = useParams<{ reference: string }>();
  const booking = useBookingByReference(reference ?? "");
  const cancel = useCancelBooking();

  if (booking.isPending) {
    return (
      <section className="mx-auto w-full max-w-2xl px-6 py-10">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-4 h-40 w-full rounded-xl" />
      </section>
    );
  }

  if (booking.isError) {
    const notFound = booking.error instanceof ApiError && booking.error.status === 404;

    return (
      <section className="mx-auto w-full max-w-2xl px-6 py-10">
        {notFound ? (
          <EmptyState
            title="No booking with that reference"
            description="Check the link in your confirmation email."
            action={
              <Link to="/gear" className="text-sm underline underline-offset-4">
                Browse the catalogue
              </Link>
            }
          />
        ) : (
          <ErrorState error={booking.error} onRetry={() => booking.refetch()} />
        )}
      </section>
    );
  }

  const data = booking.data;

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="flex items-center gap-3">
        <CheckCircle2
          className={`size-8 ${data.status === "CANCELLED" ? "text-muted-foreground" : "text-emerald-600"}`}
          aria-hidden="true"
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {data.status === "CANCELLED"
              ? "Booking cancelled"
              : `You're booked, ${data.customerName.split(" ")[0]}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.status === "CANCELLED"
              ? "Nothing is held for you any more."
              : data.paymentStatus === "PAID"
                ? "Paid and confirmed. We've held this gear for you."
                : data.paymentStatus === "PROCESSING"
                  ? "We're confirming your payment — this page updates itself."
                  : "We've held this gear for you."}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Booking reference
            </p>
            <p className="font-mono text-lg font-semibold">{data.reference}</p>
          </div>
          <Badge variant={statusTone(data.status)}>{statusLabel(data.status)}</Badge>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          {data.pickupMethod === "COURIER"
            ? "Courier delivery"
            : "Collect from the counter"}{" "}
          · {format(parseISO(data.startDate), "d MMM")} –{" "}
          {format(parseISO(data.endDate), "d MMM yyyy")}
        </p>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Your gear
      </h2>

      <ul className="mt-3 divide-y border-t">
        {data.items.map((item) => (
          <li key={item.serialNumber + item.start} className="flex justify-between gap-4 py-3">
            <div className="min-w-0">
              <Link
                to={`/gear/${item.slug}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {item.productName}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {format(parseISO(item.start), "d MMM")} –{" "}
                {format(parseISO(item.end), "d MMM yyyy")} · {item.days}{" "}
                {item.days === 1 ? "day" : "days"}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Unit {item.serialNumber}
              </p>
            </div>
            <span className="shrink-0 font-medium">
              {formatCents(item.lineTotalCents)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-6 space-y-1 rounded-xl border p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Rental subtotal</dt>
          <dd>{formatCents(data.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Deposit (held at pickup)</dt>
          <dd>{formatCents(data.depositCents)}</dd>
        </div>
        {data.feeCents > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Fees</dt>
            <dd>{formatCents(data.feeCents)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t pt-2 text-base font-medium">
          <dt>Rental total</dt>
          <dd>{formatCents(data.totalCents)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-muted-foreground">
        Bring photo ID.{" "}
        {data.depositStatus === "HELD"
          ? `${formatCents(data.depositCents)} is currently held on your card and is released when the gear comes back.`
          : data.depositStatus === "RELEASED"
            ? "Your deposit has been released."
            : data.depositStatus === "CAPTURED"
              ? `${formatCents(data.feeCents)} was taken from your deposit for the late return; the rest was released.`
              : `We hold ${formatCents(data.depositCents)} on your card when you collect, and release it when the gear comes back in the condition it left in.`}
      </p>

      {data.status === "PENDING" && (
        <div className="mt-6 rounded-xl border p-4">
          <p className="text-sm font-medium">Changed your mind?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You can cancel free of charge up to 48 hours before pickup.
          </p>

          {cancel.isError && (
            <p className="mt-2 text-sm text-destructive">{cancel.error.message}</p>
          )}

          <Button
            variant="outline"
            className="mt-3"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(data.reference)}
          >
            {cancel.isPending ? "Cancelling…" : "Cancel this booking"}
          </Button>
        </div>
      )}

      {data.status === "CANCELLED" && (
        <p className="mt-6 rounded-xl border p-4 text-sm text-muted-foreground">
          This booking was cancelled. The gear is back in the catalogue.
        </p>
      )}

      <div className="mt-6 flex gap-4 text-sm">
        <Link to="/rentals" className="underline underline-offset-4">
          All my rentals
        </Link>
        <Link to="/gear" className="underline underline-offset-4">
          Rent something else
        </Link>
      </div>
    </section>
  );
}
