import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { env } from "../config/env";

export const auth = betterAuth({
  baseURL: env.API_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,

  // Requests from anywhere else are refused before they reach a handler.
  trustedOrigins: [env.WEB_ORIGIN],

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  user: {
    additionalFields: {
      // `input: false` is the whole point: a sign-up request that includes
      // "role": "ADMIN" has that field dropped rather than honoured.
      role: {
        type: ["RENTER", "ADMIN"],
        required: false,
        defaultValue: "RENTER",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },

  advanced: {
    /**
     * In dev the API and the client are both on `localhost`, so they are
     * cross-ORIGIN but same-SITE and a Lax cookie rides along fine.
     *
     * In production they are api.framerent.x and framerent.x — genuinely
     * cross-site — and a Lax cookie is simply not sent. SameSite=None is the
     * only value a browser will attach cross-site, and it demands Secure.
     */
    defaultCookieAttributes:
      env.NODE_ENV === "production"
        ? { sameSite: "none", secure: true, httpOnly: true }
        : { sameSite: "lax", secure: false, httpOnly: true },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
