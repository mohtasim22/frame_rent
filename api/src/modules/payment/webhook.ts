import type { Request, Response } from "express";
import type Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import { paymentsEnabled, requireStripe } from "../../lib/stripe";
import { env } from "../../config/env";

/**
 * Stripe's webhook, and the only thing this API treats as the truth about
 * whether a payment happened.
 *
 * The browser's "payment succeeded" redirect is a hint: the customer can close
 * the tab, lose signal, or fake the URL. The webhook is signed with a shared
 * secret and retried until we answer 2xx, which is why booking confirmation
 * hangs off it rather than off anything the client says.
 */
export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  // Payments are optional, so this route exists even when Stripe is not
  // configured. Say so plainly instead of throwing an internal error at it.
  if (!paymentsEnabled) {
    res.status(503).json({
      success: false,
      error: { code: "PAYMENTS_DISABLED", message: "Payments are not enabled" },
    });
    return;
  }

  const stripe = requireStripe();
  const signature = req.headers["stripe-signature"];

  if (!env.STRIPE_WEBHOOK_SECRET || typeof signature !== "string") {
    res.status(400).json({ success: false, error: { code: "BAD_SIGNATURE", message: "Missing signature" } });
    return;
  }

  let event: Stripe.Event;

  try {
    // req.body is a Buffer here, not a parsed object — this route is mounted
    // with express.raw() ahead of express.json(). The signature covers the
    // exact bytes Stripe sent; re-serialising parsed JSON changes them and the
    // check fails every time.
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    res.status(400).json({ success: false, error: { code: "BAD_SIGNATURE", message } });
    return;
  }

  try {
    await handle(event);
  } catch (error) {
    // A 500 tells Stripe to retry. That is what we want for a transient
    // database failure — but it means every handler has to be safe to run
    // twice, because retries and duplicate deliveries both happen.
    console.error(`[stripe] ${event.type} failed`, error);
    res.status(500).json({ success: false, error: { code: "HANDLER_FAILED", message: "Retry" } });
    return;
  }

  res.json({ received: true });
}

async function handle(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object;
      const bookingId = intent.metadata.bookingId;
      if (!bookingId || intent.metadata.kind === "deposit") return;

      const paymentMethodId =
        typeof intent.payment_method === "string"
          ? intent.payment_method
          : (intent.payment_method?.id ?? null);

      // updateMany, not update: a duplicate delivery for a booking that has
      // already moved on simply matches nothing instead of throwing.
      await prisma.booking.updateMany({
        where: { id: bookingId, paymentStatus: { not: "PAID" } },
        data: {
          paymentStatus: "PAID",
          paymentMethodId,
          // Paid bookings hold their units unconditionally.
          paymentDueBy: null,
          status: "CONFIRMED",
        },
      });
      return;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      const bookingId = intent.metadata.bookingId;
      if (!bookingId || intent.metadata.kind === "deposit") return;

      // Deliberately NOT cancelling the booking: the customer may simply try
      // another card. The checkout window expiry releases the units if they
      // never do.
      await prisma.booking.updateMany({
        where: { id: bookingId, paymentStatus: { not: "PAID" } },
        data: { paymentStatus: "FAILED" },
      });
      return;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      const intentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      if (!intentId) return;

      await prisma.booking.updateMany({
        where: { paymentIntentId: intentId },
        data: { paymentStatus: "REFUNDED" },
      });
      return;
    }

    default:
      // Everything else is acknowledged and ignored. Stripe sends a great deal
      // more than this app cares about.
      return;
  }
}
