import Stripe from "stripe";
import { env } from "../config/env";

/**
 * Stripe is OPTIONAL. Without a secret key the app runs exactly as it did
 * before payments existed: bookings are created, nothing is charged, and the
 * customer settles at pickup.
 *
 * That is not politeness — it means a missing key in one environment cannot
 * take the whole API down, and the deployed site keeps working while the keys
 * are still being set up.
 */
export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY)
  : null;

export const paymentsEnabled = stripe !== null;

/** Narrows `stripe` for the paths that genuinely cannot run without it. */
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured — set STRIPE_SECRET_KEY to enable payments",
    );
  }

  return stripe;
}

/**
 * Stripe rejects amounts it considers zero-decimal differently per currency;
 * EUR is a two-decimal currency, so our integer cents map straight across with
 * no conversion. Keeping this in one named place stops somebody "helpfully"
 * dividing by 100 on the way out.
 */
export const CURRENCY = "eur";
