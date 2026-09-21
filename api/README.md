# FrameRent API

Express 5 + TypeScript + Prisma 7, on PostgreSQL. Port 4000.

Every response is an envelope:

```json
{ "success": true,  "data": …, "meta": { "page": 1, "perPage": 12, "total": 47, "totalPages": 4 } }
{ "success": false, "error": { "code": "UNIT_UNAVAILABLE", "message": "…" } }
```

The client's fetch wrapper type-guards that shape, so a proxy error page or an
HTML 502 becomes a typed `INVALID_RESPONSE` rather than a crash halfway through
rendering.

## Layout

```
src/
├─ app.ts                 middleware order matters — see below
├─ routes.ts              mounts every module under /api/v1
├─ config/env.ts          the ONLY file that reads process.env
├─ lib/                   prisma client, better-auth, error classes
├─ middleware/            auth guards, 404, error handler
└─ modules/
   ├─ availability/       the overlap engine (pure rules + a Prisma service)
   ├─ booking/            quoting, the booking transaction, cancellation
   ├─ admin/              lifecycle, inventory, dashboard, occupancy
   ├─ review/             gated on a RETURNED booking
   ├─ gear/  brand/  category/
```

Routes call controllers, controllers call services, **only services touch
Prisma**. Controllers parse input with a zod schema from `shared/` and never
contain business rules.

### Middleware order is load-bearing

```ts
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.all("/api/auth/*splat", toNodeHandler(auth));   // BEFORE express.json()
app.use(express.json());
app.use(attachUser);
app.use("/api/v1", apiRoutes);
app.use(notFound);
app.use(errorHandler);                               // 4 params = error handler
```

better-auth reads the raw request stream itself. `express.json()` drains that
stream, so mounting it first leaves the auth handler with an empty body and
every sign-in fails confusingly. `*splat` is Express 5 syntax — a bare `*` no
longer parses.

## Endpoints

### Public

| Method | Path | |
| --- | --- | --- |
| `GET` | `/health` | uptime |
| `GET` | `/api/v1/gear` | filter by category, brand, mount, price, search; sorted and paginated |
| `GET` | `/api/v1/gear/:slug` | one product with specs and unit count |
| `GET` | `/api/v1/gear/:slug/availability?from&to` | days on which **no** unit is free |
| `GET` | `/api/v1/gear/:slug/reviews` | average, count, latest 20 |
| `GET` | `/api/v1/brands`, `/api/v1/categories` | taxonomy |
| `POST` | `/api/v1/bookings/quote` | prices a whole cart from the database |

Quoting is public on purpose: the cart shows a total before anyone signs in.

### Authenticated (`requireUser`)

| Method | Path | |
| --- | --- | --- |
| `POST` | `/api/v1/bookings` | the transaction. `201`, or `409 UNIT_UNAVAILABLE` |
| `GET` | `/api/v1/bookings/mine?scope=upcoming\|past\|all` | |
| `GET` | `/api/v1/bookings/:reference` | **404**, not 403, for someone else's booking |
| `POST` | `/api/v1/bookings/:reference/cancel` | PENDING and more than 48h out |
| `GET` | `/api/v1/reviews/mine` | bookings that have earned a review |
| `POST` | `/api/v1/reviews` | `409 NOT_RETURNED` until the gear is back |

Returning 404 rather than 403 for another user's reference is deliberate: a 403
confirms the reference exists, which is exactly what someone guessing wants to
learn.

### Admin (`requireAdmin`)

`adminRoutes.use(requireAdmin)` guards the whole subtree, so a new endpoint is
protected by default rather than protected if somebody remembers.

| Method | Path | |
| --- | --- | --- |
| `GET` | `/api/v1/admin/dashboard` | pickups due, returns due, overdue, maintenance |
| `GET` | `/api/v1/admin/occupancy?from&to` | units × days, one cell per day |
| `GET` | `/api/v1/admin/bookings` | filter by status, date, search; paginated |
| `POST` | `/api/v1/admin/bookings/:reference/status` | `409 ILLEGAL_TRANSITION` |
| `POST` | `/api/v1/admin/bookings/:reference/return` | condition + late fee |
| `POST` `PATCH` `DELETE` | `/api/v1/admin/products[/:id]` | delete = archive |
| `GET` `POST` | `/api/v1/admin/products/:id/units` | |
| `PATCH` | `/api/v1/admin/units/:id` | `409` if retiring a unit with live bookings |
| `POST` `DELETE` | `/api/v1/admin/holds[/:id]` | `409` if the window clashes |

## The booking lifecycle

```
PENDING ──confirm──> CONFIRMED ──hand over──> PICKED_UP ──take back──> RETURNED
   │                     │                        │
 cancel                cancel                 mark overdue
   │                     │                        ▼
   ▼                     ▼                     OVERDUE ──take back──> RETURNED
CANCELLED            CANCELLED
```

The table lives in `shared/lib/lifecycle.ts` and is returned to the client as
`nextStatuses` on every admin row, so the buttons the console offers and the
moves the API accepts come from one source. A `PICKED_UP` booking cannot be
cancelled — the gear is already out of the building.

`CANCELLED` and `RETURNED` are not in `BLOCKING_BOOKING_STATUSES`, so cancelling
frees the units with no extra bookkeeping: availability simply recomputes.

## Schema

Nine models. The ones that matter:

- **Product** — catalogue entry, rates, `bufferDays`, JSON `specs` validated by
  a zod discriminated union
- **GearUnit** — a physical item with a serial number, condition and status.
  Availability is decided per unit
- **Booking** — reference, status, money, and dates that are the **envelope**
  across its items
- **BookingItem** — one product for one date range, with its **own**
  `startDate`/`endDate` and snapshotted prices
- **MaintenanceHold** — takes a unit out of service for a window

Buffer days pad bookings symmetrically when computing availability, but holds
are **not** padded: a maintenance window already is the servicing period.

## Scripts

```bash
npm run dev             # tsx watch
npm run typecheck       # tsc --noEmit, with noUnusedLocals
npm run test            # 67 Vitest tests, no database or server needed
npm run make:admin <email>
npm run booking:test <slug> <start> <end> <unitIndex>   # seed a booking
npm run hold:test       # seed a maintenance hold
npm run availability    # print a product's unavailable dates
npm run booking:race    # race the service directly
npm run booking:race:http   # race a running server over HTTP
```

`requests.http` holds ~40 saved requests including the deliberate failures —
past dates, reversed ranges, unknown slugs, illegal transitions.

## Environment

| | |
| --- | --- |
| `DATABASE_URL` | Postgres connection string; pooled host, `sslmode=verify-full` |
| `WEB_ORIGIN` | the client's origin — CORS and better-auth `trustedOrigins` |
| `API_URL` | this server's own public URL, for better-auth |
| `BETTER_AUTH_SECRET` | ≥32 bytes, `crypto.randomBytes(32).toString("base64")` |
| `PORT` | defaults to 4000 |
| `NODE_ENV` | `production` switches cookies to `SameSite=None; Secure` |

`config/env.ts` parses all of it with zod and calls `process.exit(1)` on a bad
value. Failing at boot with a readable message beats `undefined` surfacing three
layers deep an hour later — and it is the only file in the codebase allowed to
read `process.env`.

## Testing

The 67 tests cover the pure rules only: overlap arithmetic, inclusive day
counting, the weekly-rate cap, buffer padding, unit allocation, lifecycle
transitions and late fees. No database, no HTTP, no browser — the suite runs in
under a second.

That is possible because the rules were written as pure functions taking plain
data, with Prisma confined to the service that loads it. Anything harder to test
than that is usually a sign the layering has slipped.
