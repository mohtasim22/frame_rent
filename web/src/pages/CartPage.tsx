import { Link } from "react-router";
import { format, parseISO } from "date-fns";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { formatCents } from "@/lib/format";
import { summariseCart } from "@/lib/cart";
import { useQuote } from "@/hooks/useQuote";
import { useCartStore } from "@/store/cart";

const signature = (line: { slug: string; start: string; end: string }) =>
  `${line.slug}|${line.start}|${line.end}`;

export function CartPage() {
  const lines = useCartStore((state) => state.lines);
  const { removeLine, clear } = useCartStore(
    useShallow((state) => ({ removeLine: state.removeLine, clear: state.clear })),
  );

  const summary = summariseCart(lines, format(new Date(), "yyyy-MM-dd"));
  const quote = useQuote(lines, { enabled: !summary.hasExpired });

  // Both shapes carry subtotalCents / depositCents / totalCents, so the local
  // preview stands in until the authoritative numbers land.
  const totals = quote.data ?? summary;

  const serverLines = new Map(
    (quote.data?.lines ?? []).map((line) => [signature(line), line]),
  );

  const priceChanged =
    quote.data !== undefined && quote.data.totalCents !== summary.totalCents;

  const canCheckout =
    !summary.hasExpired && quote.isSuccess && quote.data.allAvailable;

  if (lines.length === 0) {
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-10">
        <EmptyState
          title="Your cart is empty"
          description="Pick a camera or a lens, choose your dates, and it will show up here."
          action={
            <Link to="/" className="text-sm underline underline-offset-4">
              Browse the catalogue
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        <button
          type="button"
          onClick={clear}
          className="text-sm text-muted-foreground underline underline-offset-4"
        >
          Clear cart
        </button>
      </div>

      <ul className="mt-6 space-y-3">
        {summary.items.map(({ line, quote: localQuote, expired }) => {
          const priced = serverLines.get(signature(line));
          const unavailable = priced?.available === false;

          return (
            <li
              key={line.id}
              className={`flex gap-4 rounded-xl border p-4 ${
                unavailable || expired ? "border-destructive/40" : ""
              }`}
            >
              <div className="size-20 shrink-0 overflow-hidden rounded-lg border bg-muted">
                {line.imageUrl ? (
                  <img
                    src={line.imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <Camera className="size-6" aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  to={`/gear/${line.slug}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {priced?.name ?? line.name}
                </Link>

                <p className="mt-1 text-sm text-muted-foreground">
                  {format(parseISO(line.start), "d MMM")} –{" "}
                  {format(parseISO(line.end), "d MMM yyyy")} ·{" "}
                  {priced?.days ?? localQuote.days}{" "}
                  {(priced?.days ?? localQuote.days) === 1 ? "day" : "days"}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Deposit {formatCents(priced?.depositCents ?? localQuote.depositCents)}
                </p>

                {expired && (
                  <p className="mt-2 text-sm text-destructive">
                    These dates have passed. Remove this line and pick new ones.
                  </p>
                )}

                {unavailable && (
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-destructive">
                    <Badge variant="destructive">Unavailable</Badge>
                    <span>
                      Every unit is booked for these dates.{" "}
                      <Link
                        to={`/gear/${line.slug}`}
                        className="underline underline-offset-4"
                      >
                        Pick different dates
                      </Link>
                    </span>
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end justify-between">
                <span className="font-medium">
                  {formatCents(priced?.subtotalCents ?? localQuote.subtotalCents)}
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLine(line.id)}
                  aria-label={`Remove ${line.name}, ${line.start} to ${line.end}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {quote.isError && (
        <div className="mt-6">
          <ErrorState error={quote.error} onRetry={() => quote.refetch()} />
        </div>
      )}

      <div className="mt-6 rounded-xl border p-4">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Rental subtotal</dt>
            <dd>{formatCents(totals.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Refundable deposits</dt>
            <dd>{formatCents(totals.depositCents)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-medium">
            <dt>Total due at pickup</dt>
            <dd>{formatCents(totals.totalCents)}</dd>
          </div>
        </dl>

        {priceChanged && (
          <p className="mt-3 text-sm text-destructive">
            Prices have changed since you added these. The total above is current.
          </p>
        )}

        <Button className="mt-4 w-full" disabled={!canCheckout}>
          Continue to checkout
        </Button>

        <p
          className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"
          aria-live="polite"
        >
          {quote.isFetching ? (
            <>
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              Confirming prices and availability…
            </>
          ) : summary.hasExpired ? (
            "Fix the expired dates above to continue."
          ) : quote.isSuccess && !quote.data.allAvailable ? (
            "Remove or re-date the unavailable lines to continue."
          ) : (
            "Nothing is reserved until you book."
          )}
        </p>
      </div>
    </section>
  );
}
