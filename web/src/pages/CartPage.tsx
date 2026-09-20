import { Link } from "react-router";
import { format, parseISO } from "date-fns";
import { Camera, Trash2 } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/EmptyState";
import { formatCents } from "@/lib/format";
import { summariseCart } from "@/lib/cart";
import { useCartStore } from "@/store/cart";

export function CartPage() {
  const lines = useCartStore((state) => state.lines);
  const { removeLine, clear } = useCartStore(
    useShallow((state) => ({ removeLine: state.removeLine, clear: state.clear })),
  );

  const summary = summariseCart(lines, format(new Date(), "yyyy-MM-dd"));

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
        {summary.items.map(({ line, quote, expired }) => (
          <li key={line.id} className="flex gap-4 rounded-xl border p-4">
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
                {line.name}
              </Link>

              <p className="mt-1 text-sm text-muted-foreground">
                {format(parseISO(line.start), "d MMM")} –{" "}
                {format(parseISO(line.end), "d MMM yyyy")} · {quote.days}{" "}
                {quote.days === 1 ? "day" : "days"}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Deposit {formatCents(quote.depositCents)}
              </p>

              {expired && (
                <p className="mt-2 text-sm text-destructive">
                  These dates have passed. Remove this line and pick new ones.
                </p>
              )}
            </div>

            <div className="flex flex-col items-end justify-between">
              <span className="font-medium">{formatCents(quote.subtotalCents)}</span>

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
        ))}
      </ul>

      <div className="mt-6 rounded-xl border p-4">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Rental subtotal</dt>
            <dd>{formatCents(summary.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Refundable deposits</dt>
            <dd>{formatCents(summary.depositCents)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-medium">
            <dt>Total due at pickup</dt>
            <dd>{formatCents(summary.totalCents)}</dd>
          </div>
        </dl>

        <Button className="mt-4 w-full" disabled={summary.hasExpired}>
          Continue to checkout
        </Button>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Nothing is reserved until you book. Prices are confirmed at checkout.
        </p>
      </div>
    </section>
  );
}
