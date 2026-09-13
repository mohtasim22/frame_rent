
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
  WEB_ORIGIN: z.url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:\n");
  console.error(z.prettifyError(parsed.error));
  console.error("\nCompare api/.env against api/.env.example\n");
  process.exit(1);
}

export const env = parsed.data;
