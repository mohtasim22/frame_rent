
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"),
      { message: "must be a postgresql:// connection string" }
    ),
  /**
   * One or more client origins, comma separated. Vercel hands out a new URL
   * per preview deploy, so a single origin does not survive contact with a
   * real deployment.
   */
  WEB_ORIGIN: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim().replace(/\/$/, ""))
        .filter(Boolean),
    )
    .refine(
      (origins) => origins.length > 0 && origins.every((o) => URL.canParse(o)),
      { message: "must be one or more absolute URLs, comma separated" },
    ),
  API_URL: z.url(),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "too short — generate one with crypto.randomBytes(32)"),

  /**
   * Payments are optional. Leave these unset and the app behaves as it did
   * before Stripe existed — bookings are created and settled at pickup.
   */
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),

  /** Image uploads are optional too — without these, image URLs are typed in. */
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:\n");
  console.error(z.prettifyError(parsed.error));
  console.error("\nCompare api/.env against api/.env.example\n");
  process.exit(1);
}

export const env = parsed.data;
