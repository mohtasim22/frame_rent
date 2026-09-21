import { prisma } from "../../lib/prisma";
import { CURRENCY, paymentsEnabled, requireStripe } from "../../lib/stripe";
import { ConflictError, NotFoundError } from "../../lib/errors";
import type { AuthUser } from "../../middleware/auth";

/**
 * Finds or creates the Stripe customer for a user.
 *
 * The id is stored on our side so a customer is created once, not once per
 * checkout — otherwise saved cards scatter across duplicate customers and the
 * deposit hold at hand-over has nothing to charge.
 */
async function stripeCustomerFor(user: AuthUser): Promise<string> {
  const stripe = requireStripe();

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true },
  });

  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export const paymentService = {
  enabled: paymentsEnabled,

  /**
   * Creates (or reuses) the PaymentIntent for a booking's rental charge and
   * hands back the client secret the browser needs to confirm it.
   *
   * The amount comes from the booking row, never from the request. The client
   * chooses WHICH booking to pay for; it does not get a say in how much.
   */
  async intentForBooking(reference: string, user: AuthUser) {
    const stripe = requireStripe();

    const booking = await prisma.booking.findUnique({
      where: { reference },
      select: {
        id: true,
        userId: true,
        reference: true,
        status: true,
        subtotalCents: true,
        paymentStatus: true,
        paymentIntentId: true,
      },
    });

    if (booking === null || booking.userId !== user.id) {
      throw new NotFoundError(`No booking with reference ${reference}`);
    }

    if (booking.paymentStatus === "PAID") {
      throw new ConflictError("This booking is already paid", "ALREADY_PAID");
    }

    if (booking.status === "CANCELLED") {
      throw new ConflictError("This booking was cancelled", "BOOKING_CANCELLED");
    }

    // Reuse the existing intent rather than creating a second one for the same
    // booking — a customer who refreshes the checkout page must not end up with
    // two authorisations against their card.
    if (booking.paymentIntentId) {
      const existing = await stripe.paymentIntents.retrieve(booking.paymentIntentId);

      if (existing.status !== "canceled" && existing.amount === booking.subtotalCents) {
        return { clientSecret: existing.client_secret, amountCents: existing.amount };
      }
    }

    const customerId = await stripeCustomerFor(user);

    const intent = await stripe.paymentIntents.create(
      {
        amount: booking.subtotalCents,
        currency: CURRENCY,
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        // Keep the card on file: the deposit hold at hand-over is charged
        // off-session against it, days or weeks later.
        setup_future_usage: "off_session",
        metadata: { bookingId: booking.id, reference: booking.reference },
      },
      // Same booking, same key: a retried request returns the original intent
      // instead of creating another one.
      { idempotencyKey: `rental:${booking.id}` },
    );

    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentIntentId: intent.id, paymentStatus: "PROCESSING" },
    });

    return { clientSecret: intent.client_secret, amountCents: intent.amount };
  },

  /**
   * Places the security deposit hold. Called when an admin hands the gear over,
   * NOT at checkout: an online card authorisation is valid for about seven
   * days, and a rental can run for ninety. Starting the clock at hand-over is
   * the only way the hold is still alive when the gear comes back.
   */
  async holdDeposit(bookingId: string) {
    const stripe = requireStripe();

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      select: {
        id: true,
        reference: true,
        depositCents: true,
        depositStatus: true,
        paymentMethodId: true,
        user: { select: { stripeCustomerId: true } },
      },
    });

    if (booking.depositStatus === "HELD" || booking.depositCents === 0) return;

    if (!booking.paymentMethodId || !booking.user.stripeCustomerId) {
      // No saved card — the deposit is collected in person, as it always was.
      return;
    }

    try {
      const intent = await stripe.paymentIntents.create(
        {
          amount: booking.depositCents,
          currency: CURRENCY,
          customer: booking.user.stripeCustomerId,
          payment_method: booking.paymentMethodId,
          // Authorise only. The money is reserved, not taken.
          capture_method: "manual",
          off_session: true,
          confirm: true,
          metadata: { bookingId: booking.id, kind: "deposit" },
        },
        { idempotencyKey: `deposit:${booking.id}` },
      );

      await prisma.booking.update({
        where: { id: booking.id },
        data: { depositIntentId: intent.id, depositStatus: "HELD" },
      });
    } catch {
      // A declined hold must not block the hand-over — the counter staff can
      // take a deposit in person. Record it and move on.
      await prisma.booking.update({
        where: { id: booking.id },
        data: { depositStatus: "FAILED" },
      });
    }
  },

  /**
   * Settles the deposit when the gear comes back: capture the late fee if there
   * is one, release the rest. Capturing less than the authorised amount
   * automatically frees the remainder.
   */
  async settleDeposit(bookingId: string, feeCents: number) {
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      select: { id: true, depositIntentId: true, depositStatus: true },
    });

    if (booking.depositStatus !== "HELD" || !booking.depositIntentId) return;

    const stripe = requireStripe();

    if (feeCents <= 0) {
      await stripe.paymentIntents.cancel(booking.depositIntentId);

      await prisma.booking.update({
        where: { id: booking.id },
        data: { depositStatus: "RELEASED" },
      });
      return;
    }

    await stripe.paymentIntents.capture(booking.depositIntentId, {
      amount_to_capture: feeCents,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { depositStatus: "CAPTURED" },
    });
  },
};
