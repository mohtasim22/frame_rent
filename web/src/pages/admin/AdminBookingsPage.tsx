import { useState } from "react";
import { useSearchParams } from "react-router";
import { format, parseISO } from "date-fns";
import { BOOKING_STATUSES } from "@shared/types/domain";
import type { BookingStatus, UnitCondition } from "@shared/types/domain";
import type { AdminBookingRow } from "@shared/schemas/admin.schema";
import { UNIT_CONDITIONS } from "@shared/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { formatCents } from "@/lib/format";
import { statusTone } from "@/lib/status";
import { useAdminBookings, useReturnBooking, useTransition } from "@/hooks/useAdmin";

function ReturnForm({
  row,
  onDone,
}: {
  row: AdminBookingRow;
  onDone: () => void;
}) {
  const [condition, setCondition] = useState<UnitCondition>("EXCELLENT");
  const [returnedOn, setReturnedOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const receive = useReturnBooking();

  return (
    <div className="mt-3 rounded-lg border p-3">
      <p className="text-sm font-medium">Take it back</p>

      <div className="mt-2 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="text-muted-foreground">Returned on</span>
          <Input
            type="date"
            value={returnedOn}
            onChange={(event) => setReturnedOn(event.target.value)}
            className="mt-1"
          />
        </label>

        <label className="text-sm">
          <span className="text-muted-foreground">Condition</span>
          <select
            value={condition}
            onChange={(event) => setCondition(event.target.value as UnitCondition)}
            className="mt-1 block rounded-md border bg-transparent px-3 py-2 text-sm"
          >
            {UNIT_CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-48 flex-1 text-sm">
          <span className="text-muted-foreground">Notes</span>
          <Input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Any damage?"
            className="mt-1"
          />
        </label>

        <Button
          disabled={receive.isPending}
          onClick={() =>
            receive.mutate(
              {
                reference: row.reference,
                returnedOn,
                condition,
                notes: notes === "" ? undefined : notes,
              },
              { onSuccess: onDone },
            )
          }
        >
          {receive.isPending ? "Saving…" : "Confirm return"}
        </Button>
      </div>

      {receive.isError && (
        <p className="mt-2 text-sm text-destructive">{receive.error.message}</p>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        A late return is charged one day&rsquo;s rate per day late, capped at the
        deposit.
      </p>
    </div>
  );
}

export function AdminBookingsPage() {
  const [params, setParams] = useSearchParams();
  const [returning, setReturning] = useState<string | null>(null);

  const status = params.get("status") as BookingStatus | null;
  const q = params.get("q") ?? "";

  const bookings = useAdminBookings({
    ...(status ? { status } : {}),
    ...(q ? { q } : {}),
    perPage: 25,
  });

  const transition = useTransition();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value === "") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <Input
          value={q}
          onChange={(event) => setParam("q", event.target.value)}
          placeholder="Reference, name or email"
          className="max-w-xs"
          aria-label="Search bookings"
        />

        <select
          value={status ?? ""}
          onChange={(event) => setParam("status", event.target.value)}
          className="rounded-md border bg-transparent px-3 py-2 text-sm"
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          {BOOKING_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {transition.isError && (
        <p className="mt-4 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
          {transition.error.message}
        </p>
      )}

      {bookings.isPending && (
        <div className="mt-6 space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {bookings.isError && (
        <div className="mt-6">
          <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} />
        </div>
      )}

      {bookings.isSuccess && bookings.data.data.length === 0 && (
        <EmptyState title="No bookings match" description="Try a wider filter." />
      )}

      {bookings.isSuccess && bookings.data.data.length > 0 && (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            {bookings.data.meta?.total} booking
            {bookings.data.meta?.total === 1 ? "" : "s"}
          </p>

          <ul className="mt-2 space-y-2">
            {bookings.data.data.map((row) => (
              <li key={row.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs">{row.reference}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {row.headline}
                  </span>
                  <Badge variant={statusTone(row.status)}>{row.status}</Badge>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    {row.customerName} · {row.customerEmail}
                  </span>
                  <span>
                    {format(parseISO(row.startDate), "d MMM")} –{" "}
                    {format(parseISO(row.endDate), "d MMM yyyy")}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatCents(row.totalCents)}
                  </span>
                  {row.feeCents > 0 && (
                    <span className="text-destructive">
                      incl. {formatCents(row.feeCents)} late fee
                    </span>
                  )}
                </div>

                {/* The buttons come from the server's own transition table,
                    so the UI cannot offer a move the API would refuse. */}
                {row.nextStatuses.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.nextStatuses.map((next) =>
                      next === "RETURNED" ? (
                        <Button
                          key={next}
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setReturning(returning === row.id ? null : row.id)
                          }
                        >
                          Return…
                        </Button>
                      ) : (
                        <Button
                          key={next}
                          size="sm"
                          variant={next === "CANCELLED" ? "ghost" : "default"}
                          disabled={transition.isPending}
                          onClick={() =>
                            transition.mutate({
                              reference: row.reference,
                              status: next,
                            })
                          }
                        >
                          {next === "CONFIRMED"
                            ? "Confirm"
                            : next === "PICKED_UP"
                              ? "Hand over"
                              : next === "OVERDUE"
                                ? "Mark overdue"
                                : "Cancel"}
                        </Button>
                      ),
                    )}
                  </div>
                )}

                {returning === row.id && (
                  <ReturnForm row={row} onDone={() => setReturning(null)} />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
