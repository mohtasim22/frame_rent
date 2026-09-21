import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

/**
 * loadStripe is called once at module scope, not inside the component.
 * Calling it per render re-downloads Stripe.js and throws away the instance
 * the Elements provider is holding.
 */
export const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export const paymentsConfigured = stripePromise !== null;

function PayForm({
  amountCents,
  reference,
}: {
  amountCents: number;
  reference: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Some payment methods leave the site entirely and come back here.
        return_url: `${window.location.origin}/booking/${reference}`,
      },
      // Cards usually finish without a redirect, so we stay put and let the
      // confirmation page load from our own router instead of a full reload.
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "That card was declined.");
      setSubmitting(false);
      return;
    }

    // The booking is NOT confirmed here. Stripe's webhook does that, because
    // this browser can close, lose signal, or lie. All we do is navigate.
    window.location.assign(`/booking/${reference}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement />

      {error && (
        <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || submitting}
      >
        {submitting ? "Taking payment…" : `Pay ${formatCents(amountCents)}`}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Card details go straight to Stripe — they never touch this server.
        Test card: 4242 4242 4242 4242, any future date, any CVC.
      </p>
    </form>
  );
}

export function PaymentStep({
  clientSecret,
  amountCents,
  reference,
}: {
  clientSecret: string;
  amountCents: number;
  reference: string;
}) {
  if (!stripePromise) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "flat",
          variables: {
            colorPrimary: "#c2833a",
            borderRadius: "10px",
            fontFamily: "Geist Variable, sans-serif",
          },
        },
      }}
    >
      <PayForm amountCents={amountCents} reference={reference} />
    </Elements>
  );
}
