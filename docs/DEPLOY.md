# Deploying FrameRent

Two halves, two hosts, one database. The API goes to Render, the client to
Vercel, and the database is a Neon branch separate from your development one.

Do it in this order. Each step needs a URL from the one before it.

---

## 1. A production database

In the Neon console, create a **new branch** (or a new project) for production.
Keep it in the same region you develop against — `ap-southeast-1` — so the
API and the database are not on opposite sides of the planet.

Copy the **pooled** connection string. It has `-pooler` in the hostname. Keep
`?sslmode=verify-full`.

Do **not** reuse the development branch. It has test bookings, test users and
`localhost` origins baked into its sessions.

---

## 2. The API on Render

New → Web Service → connect this repository.

| Setting | Value |
| --- | --- |
| Root directory | *(leave blank — the repo root)* |
| Runtime | Node |
| Build command | `npm install && npm run migrate:deploy --workspace api` |
| Start command | `npm run start --workspace api` |
| Health check path | `/health` |
| Region | Singapore |

Environment variables:

```
NODE_ENV             production
DATABASE_URL         the pooled Neon string from step 1
BETTER_AUTH_SECRET   a NEW secret, not your development one
API_URL              https://<your-service>.onrender.com
WEB_ORIGIN           http://localhost:5173        ← placeholder, fixed in step 4
```

Generate the secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`WEB_ORIGIN` is a placeholder because Vercel has not given you a URL yet. The
service will boot and `/health` will answer; sign-in will not work until step 4.

### Why migrations run in the build command

The free plan has no separate release phase. Running `migrate deploy` at
**start** would re-run on every cold wake-up, and Render's free tier sleeps
after inactivity. Build time runs once per deploy, which is what you want.

---

## 3. The client on Vercel

New Project → import this repository.

| Setting | Value |
| --- | --- |
| **Root Directory** | **`web`** — this one matters, see below |
| Framework preset | Vite (auto-detected) |
| Install / build / output | leave the defaults |

### Root Directory must be `web`

Vercel treats a folder called `api` at the **project root** as Serverless
Functions and compiles every `.ts` file inside it. With the repo root as the
project root, it finds your Express controllers and tries to build them as
functions — which fails, and would be wrong even if it succeeded.

Pointing the Root Directory at `web` removes `api/` from Vercel's view
entirely. npm workspaces still resolve, because Vercel walks up to the
workspace root to install. If the build cannot find `shared/`, turn on
**Include source files outside of the Root Directory** in the project settings.

[web/vercel.json](../web/vercel.json) then holds only the SPA rewrite.

One environment variable:

```
VITE_API_URL   https://<your-render-service>.onrender.com
```

Vite inlines `import.meta.env.*` **at build time**, so changing this later needs
a redeploy, not just a restart.

The `rewrites` rule in `vercel.json` sends every unmatched path to
`index.html`. Without it, loading `/cart` directly is a 404 — the server looks
for a file at that path, and in a single-page app there isn't one. Vercel checks
real files first, so your JS and CSS still serve normally.

---

## 4. Point them at each other

Back in Render, set `WEB_ORIGIN` to the Vercel URL and redeploy:

```
WEB_ORIGIN   https://<your-project>.vercel.app
```

To sign in from preview deploys too, list them comma separated:

```
WEB_ORIGIN   https://framerent.vercel.app,https://framerent-git-main-you.vercel.app
```

`WEB_ORIGIN` feeds both the CORS allowlist and better-auth's `trustedOrigins`,
so an origin missing here fails twice: the browser blocks the response, and
better-auth answers `403 INVALID_ORIGIN`.

---

## 5. Seed and make yourself an admin

The production database is empty. From the Render shell:

```bash
npm run -w api exec -- prisma db seed
```

Then sign up through the deployed site, and promote yourself:

```bash
npm run make:admin you@example.com --workspace api
```

---

## The cookie problem, one last time

In development the API is `localhost:4000` and the client is `localhost:5173`.
Different **origins**, but the same **site** — so a `SameSite=Lax` cookie rides
along happily.

In production they are `framerent-api.onrender.com` and `framerent.vercel.app`.
Genuinely cross-site. A `Lax` cookie is simply **not sent**, and you get the
classic symptom: sign-in returns 200, then every request is 401.

[auth.ts](../api/src/lib/auth.ts) switches on `NODE_ENV`:

```ts
defaultCookieAttributes:
  env.NODE_ENV === "production"
    ? { sameSite: "none", secure: true, httpOnly: true }
    : { sameSite: "lax", secure: false, httpOnly: true }
```

`SameSite=None` is the only value a browser attaches cross-site, and it is only
honoured together with `Secure`. Verified locally in production mode:

```
set-cookie: __Secure-better-auth.session_token=…; Path=/; HttpOnly; Secure; SameSite=None
```

Note the `__Secure-` prefix better-auth adds. That prefix is a browser-enforced
promise: a cookie named that way is **rejected outright** unless it is set over
HTTPS with `Secure`. It is free defence against a downgrade attack — and it also
means you cannot test production cookie settings over plain `http://localhost`.
Both hosts give you HTTPS by default, so this only bites if you try to run the
production config locally.

---

---

## Payments (optional)

Stripe is optional everywhere. With no `STRIPE_SECRET_KEY` the API boots and
behaves exactly as it did before payments existed, so you can deploy this
without touching Stripe at all.

To turn it on, add to **Render**:

```
STRIPE_SECRET_KEY      sk_test_...
STRIPE_WEBHOOK_SECRET  whsec_...
```

and to **Vercel** (then redeploy — Vite inlines it at build time):

```
VITE_STRIPE_PUBLISHABLE_KEY  pk_test_...
```

The webhook endpoint is `POST /api/v1/stripe/webhook`. Register it in the
Stripe dashboard for `payment_intent.succeeded`,
`payment_intent.payment_failed` and `charge.refunded`. Locally, run:

```bash
stripe listen --forward-to localhost:4000/api/v1/stripe/webhook
```

which prints the `whsec_...` to use in development.

### Why the webhook, and not the browser

The browser's "payment succeeded" is a hint — the tab can close, the network
can drop, and the URL can be faked. The webhook is signed with a shared secret
and retried until the API answers 2xx, so booking confirmation hangs off that
instead. It is mounted with `express.raw()` **before** `express.json()`,
because Stripe signs the exact bytes it sent and a reserialised body never
verifies.

---

## Image uploads (optional)

Like Stripe, Cloudinary is optional — without it the admin console simply has
no upload button and image URLs are typed in by hand.

Cloudinary → **Dashboard → API keys**, then add to **Render**:

```
CLOUDINARY_CLOUD_NAME   your-cloud-name
CLOUDINARY_API_KEY      123456789012345
CLOUDINARY_API_SECRET   ...
```

Nothing goes in Vercel: the browser receives a one-time signature from the API
and needs no Cloudinary credentials of its own.

### Signed, not unsigned

The browser uploads the file straight to Cloudinary, so multi-megabyte requests
never touch the API. But it can only do that with a signature from
`POST /api/v1/admin/uploads/signature`, which sits behind `requireAdmin`.

The simpler alternative — an unsigned upload preset — puts the preset name in
the JavaScript bundle, and anybody who opens devtools can then upload to the
account. Signing keeps the secret on the server and the decision with it.

Removing an image only drops the reference; the file stays in Cloudinary,
because deleting it would break any page still pointing at the old URL.

### The API key needs a role

Cloudinary keys are scoped. A newly created key authenticates happily and is
still forbidden from doing anything:

```
admin api ping     ok
upload             403  missing permissions (actions=["create"])
```

`ping` succeeding proves only that the key is real, not that it is permitted.
In **Settings → API Keys**, either use the account's default key pair or give
this one a role that allows Upload API `create`.

`npm run upload:e2e` in `api/` checks the whole path — signature, upload,
tampered-signature rejection, and the image appearing in the public catalogue.

## If it breaks

**Sign-in works, then everything is 401.** `WEB_ORIGIN` does not exactly match
the site's origin. Scheme, host and port must all match; no trailing path. The
env parser strips a trailing slash for you.

**CORS error in the console.** Same cause. Check the response headers —
`Access-Control-Allow-Origin` must echo your exact origin, and
`Access-Control-Allow-Credentials: true` must be present. A wildcard `*` is
rejected by browsers for credentialed requests, which is why the allowlist is a
list and never `*`.

**First request after a while takes 30+ seconds.** Render's free tier sleeps.
Expected. Mention it in your README rather than letting an interviewer think the
app is slow.

**`P1001: Can't reach database server`.** The Neon string is wrong, or it is the
direct host rather than the pooled one.

**Vercel build fails with `Cannot resolve environment variable: DATABASE_URL`.**
`npm install` at the repo root runs every workspace's `postinstall`, so the
frontend host runs `prisma generate` too — and it has no database. The Prisma
config therefore reads `process.env.DATABASE_URL` directly instead of
`env("DATABASE_URL")`, which throws at config-load time and so breaks every
Prisma command equally, including the ones that never connect. `generate` now
works anywhere; `migrate deploy` still fails loudly with
`Connection url is empty` if the variable is genuinely missing.

**Vercel build fails with `MODULE_NOT_FOUND` for `@tailwindcss/oxide`.**
Tailwind v4 ships a Rust binary as one optional dependency per platform, and
npm records in `package-lock.json` only the ones it installed on the machine
that generated the lock. Generating it on Windows therefore captured
`oxide-win32-x64-msvc` and nothing else, so a Linux build had no binary to
load. `web/package.json` now declares `@tailwindcss/oxide-linux-x64-gnu` as an
**optional** dependency, which puts it in the lockfile; being optional, npm
skips it on Windows without complaining.

Do **not** try to fix this by deleting and regenerating the lockfile. On
Windows that prunes the Linux binaries `@rolldown/binding`, `lightningcss` and
`esbuild` already had, and trades one broken platform for three.

**Vercel build fails with `Unable to resolve @typescript/typescript-linux-x64`.**
The same lockfile problem as Tailwind: TypeScript 7 ships its compiler as a
native binary per platform. `api/package.json` declares the Linux one as an
optional dependency. If you also see it trying to compile files under `api/`,
your Root Directory is wrong — see step 3.

**Prisma client out of date at runtime.** `postinstall` runs `prisma generate`
on every install, so this should not happen — but if you see it, the build ran
with `NODE_ENV=production` and skipped devDependencies. That is why `tsx` and
`prisma` are regular dependencies in `api/package.json`, not dev ones.
