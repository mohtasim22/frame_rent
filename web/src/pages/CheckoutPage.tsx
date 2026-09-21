import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { z } from "zod";
import { PICKUP_METHODS } from "@shared/schemas/booking.schema";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/states/EmptyState";
import { formatCents } from "@/lib/format";
import { summariseCart } from "@/lib/cart";
import { useQuote } from "@/hooks/useQuote";
import { useCreateBooking } from "@/hooks/useBooking";
import { useCartStore } from "@/store/cart";
import { useSession } from "@/lib/auth-client";

const checkoutSchema = z.object({
  phone: z
    .string()
    .max(30)
    .refine((value) => value === "" || value.length >= 5, "Too short to be a phone number"),
  pickupMethod: z.enum(PICKUP_METHODS),
  notes: z.string().max(500),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

const fieldClass = "mt-1 w-full";
const labelClass = "text-sm font-medium";
const errorClass = "mt-1 text-sm text-destructive";

export function CheckoutPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const lines = useCartStore((state) => state.lines);
  const clear = useCartStore((state) => state.clear);

  const summary = summariseCart(lines, format(new Date(), "yyyy-MM-dd"));
  const quote = useQuote(lines, { enabled: !summary.hasExpired });
  const booking = useCreateBooking();

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      phone: "",
      pickupMethod: "COUNTER",
      notes: "",
    },
  });

  // The cart is emptied only after we have somewhere to send them.
  useEffect(() => {
    if (booking.isSuccess) {
      clear();
      navigate(`/booking/${booking.data.data.reference}`, { replace: true });
    }
  }, [booking.isSuccess, booking.data, clear, navigate]);

  if (lines.length === 0 && !booking.isSuccess) {
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-10">
        <EmptyState
          title="Nothing to check out"
          description="Your cart is empty."
          action={
            <Link to="/gear" className="text-sm underline underline-offset-4">
              Browse the catalogue
            </Link>
          }
        />
      </section>
    );
  }

  const totals = quote.data ?? summary;
  const blocked =
    summary.hasExpired || !quote.isSuccess || !quote.data.allAvailable;

  const conflict =
    booking.error instanceof ApiError && booking.error.status === 409;

  function onSubmit(values: CheckoutForm) {
    booking.mutate({
      lines: lines.map(({ slug, start, end }) => ({ slug, start, end })),
      phone: values.phone === "" ? undefined : values.phone,
      pickupMethod: values.pickupMethod,
      notes: values.notes === "" ? undefined : values.notes,
    });
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        to="/cart"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        ← Back to the cart
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Checkout</h1>

      <div className="mt-6 rounded-xl border p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your rental
        </h2>

        <ul className="mt-3 divide-y">
          {summary.items.map(({ line, quote: localQuote }) => (
            <li key={line.id} className="flex justify-between gap-4 py-2 text-sm">
              <span>
                {line.name}
                <span className="text-muted-foreground">
                  {" · "}
                  {format(parseISO(line.start), "d MMM")} –{" "}
                  {format(parseISO(line.end), "d MMM yyyy")}
                </span>
              </span>
              <span className="shrink-0">{formatCents(localQuote.subtotalCents)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Rental subtotal</dt>
            <dd>{formatCents(totals.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Refundable deposits</dt>
            <dd>{formatCents(totals.depositCents)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 font-medium">
            <dt>Total due at pickup</dt>
            <dd>{formatCents(totals.totalCents)}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div className="rounded-xl border p-4 text-sm">
          <p className="text-muted-foreground">Booking as</p>
          <p className="mt-1 font-medium">{session?.user.name}</p>
          <p className="text-muted-foreground">{session?.user.email}</p>
        </div>

        <div>
          <label className={labelClass} htmlFor="phone">
            Phone <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="phone"
            type="tel"
            className={fieldClass}
            autoComplete="tel"
            aria-invalid={form.formState.errors.phone ? true : undefined}
            {...form.register("phone")}
          />
          {form.formState.errors.phone && (
            <p className={errorClass}>{form.formState.errors.phone.message}</p>
          )}
        </div>

        <fieldset>
          <legend className={labelClass}>Pickup</legend>
          <div className="mt-2 flex gap-4">
            {PICKUP_METHODS.map((method) => (
              <label key={method} className="flex items-center gap-2 text-sm">
                <input type="radio" value={method} {...form.register("pickupMethod")} />
                {method === "COUNTER" ? "Collect from the counter" : "Courier delivery"}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className={labelClass} htmlFor="notes">
            Anything we should know?{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="notes"
            rows={3}
            className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            {...form.register("notes")}
          />
        </div>

        {booking.isError && (
          <div className="rounded-xl border border-destructive/40 p-4 text-sm">
            <p className="font-medium text-destructive">
              {conflict ? "Someone booked it first" : "We could not place that booking"}
            </p>
            <p className="mt-1 text-muted-foreground">{booking.error.message}</p>
            {conflict && (
              <Link
                to="/cart"
                className="mt-2 inline-block underline underline-offset-4"
              >
                Go back and pick different dates
              </Link>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={blocked || booking.isPending}>
          {booking.isPending
            ? "Placing your booking…"
            : `Confirm booking · ${formatCents(totals.totalCents)}`}
        </Button>

        <p className="text-center text-xs text-muted-foreground" aria-live="polite">
          {summary.hasExpired
            ? "Some dates in your cart have passed. Fix them in the cart first."
            : quote.isFetching
              ? "Confirming prices and availability…"
              : quote.isSuccess && !quote.data.allAvailable
                ? "Something in your cart is no longer available."
                : "You pay at pickup. The deposit is refunded on return."}
        </p>
      </form>
    </section>
  );
}
