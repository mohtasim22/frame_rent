import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

/**
 * The fields we added to the user on the server, declared again here so the
 * client types `session.user.role`.
 *
 * Declared rather than imported from `api/`: pulling server types across would
 * drag the server's module graph — and its secrets — into a browser bundle.
 *
 * `baseURL` points at the API, not at this app. The session cookie belongs to
 * the API's origin, which is the whole reason G3 exists.
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: "string", required: false, input: false },
        phone: { type: "string", required: false },
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
