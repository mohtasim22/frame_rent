# FrameRent

A camera and lens rental platform. Browse gear, check real availability, book a
date range, and manage the shop from an admin console.

Built as a **separate Express API and React client in one repository**.

```
FrameRent/
├─ api/      Express 5 + TypeScript + Prisma 7   ·  port 4000
├─ web/      Vite + React 19 + TanStack Query    ·  port 5173
├─ shared/   zod schemas and pure domain rules, imported by BOTH sides
└─ docs/     the build plan
```

## The problem this app actually solves

Inventory is tracked **per physical unit**, not per product. Two Canon EOS R5
bodies are two rows, and "is the R5 free on the 6th?" means "does at least one
unit have no overlapping booking, maintenance hold, or turnaround buffer?"

Two date ranges collide when:

```
existing.startDate <= requested.endDate
AND existing.endDate >= requested.startDate
```

That single rule drives the calendar, the quote endpoint, the booking
transaction and the occupancy grid.

### How double-booking is prevented

A naive implementation checks availability and then inserts. Between those two
round trips another request can take the same unit. This was built that way
first, on purpose, and the race was reproduced:

```
$ npm run booking:race        # 4 customers, one 2-unit camera, naive version
succeeded: 4    rejected: 0
   CANON-EOS-R5-01: 4 overlapping  <-- DOUBLE BOOKED
   CANON-EOS-R5-02: 0 booking(s)
```

The fix runs allocation and insert inside **one transaction** whose first
statement takes a row lock on every unit of every product in the cart:

```sql
SELECT id FROM gear_units WHERE "productId" IN (...) ORDER BY id FOR UPDATE
```

Product ids are sorted before locking, so two carts holding the same two
products always acquire locks in the same order and cannot deadlock.
Availability is then re-read *through the transaction client*, which is what
turns an advisory answer into a decision.

```
$ npm run booking:race:http   # 4 simultaneous checkouts through real Express
   window 1: 201 booked FR-MUBABURF-RWOJ
   window 2: 409 UNIT_UNAVAILABLE
   window 3: 409 UNIT_UNAVAILABLE
   window 4: 201 booked FR-MUBABU6E-YLSK
2 booked, 2 refused
```

Two units, four customers, two winners, every unit booked exactly once.

## Running it

Requires Node 22 and a PostgreSQL database (this uses Neon).

```bash
npm install

cp api/.env.example api/.env       # fill in DATABASE_URL and a secret
cd api && npx prisma migrate deploy && npx prisma db seed

npm run dev --workspace api        # terminal 1 — http://localhost:4000
npm run dev --workspace web        # terminal 2 — http://localhost:5173
```

Make yourself an admin once you have signed up:

```bash
npm run make:admin you@example.com --workspace api
```

That is deliberately a shell script rather than an endpoint. The first admin has
to come from somewhere, and that somewhere should not be a form on the internet.

## Stack

| | |
| --- | --- |
| **API** | Node 22, Express 5, TypeScript (strict), Prisma 7 with driver adapters |
| **Database** | PostgreSQL (Neon, ap-southeast-1) |
| **Auth** | better-auth 1.7 — database sessions, HttpOnly cookies |
| **Client** | Vite, React 19, React Router 8, TanStack Query v5, Zustand 5 |
| **Styling** | Tailwind v4 + shadcn/ui |
| **Validation** | zod 4, schemas shared by both halves |
| **Testing** | Vitest — 67 tests over the pure domain rules |

## Decisions worth explaining

**Money is integer cents, never a float.** `0.1 + 0.2 !== 0.3`, and Prisma's
`Decimal` does not survive `JSON.stringify` intact. Every amount in the codebase
is an `Int`, formatted only at the edge.

**Rental dates are `@db.Date`, never `DateTime`.** A timestamp carries a
timezone and will shift a booking by a day for somebody. Dates cross the wire as
plain `YYYY-MM-DD` strings, which also compare correctly with `<=` because they
are fixed-width, zero-padded and big-endian.

**Date ranges are inclusive.** The 6th to the 9th is four days, not three. That
choice ripples through pricing, availability and the turnaround buffer, so it is
stated once and tested.

**Booking items snapshot their prices.** `productName`, `dailyRateCents`,
`days` and `lineTotalCents` are copied onto the row. Deliberate denormalisation:
a catalogue records what is true now, an order records what was agreed then.

**Availability is advisory until it is transactional.** The calendar, the quote
endpoint and `findAvailableUnit` all return hints. Only the check inside the
booking transaction is authoritative, and the code says so in comments where it
matters.

**Archive, never delete.** Products with bookings against them are history.
`isActive: false` hides them from every public query.

## Deploying

See **[docs/DEPLOY.md](docs/DEPLOY.md)**. Render for the API, Vercel for the
client, a separate Neon branch for the database — and the cross-site cookie
switch that makes sign-in survive the move off `localhost`.

## Repository map

- **[api/README.md](api/README.md)** — endpoints, schema, scripts, environment
- **[docs/DEPLOY.md](docs/DEPLOY.md)** — deploying both halves
- **[docs/BUILD_PLAN.md](docs/BUILD_PLAN.md)** — how this was built, in order
- **`shared/lib/`** — pure functions with no I/O: pricing, lifecycle transitions
- **`api/src/modules/availability/`** — the overlap engine, tested without a
  database, a server or a browser

## Known gaps

Honest list, because an interviewer will ask.

- **The booking endpoint is not idempotent.** A retry after a timeout could
  create a second booking. The fix is a client-generated idempotency key with a
  unique constraint.
- **No payments.** Stripe is designed for but not wired; totals are collected at
  pickup.
- **No transactional email.** Booking references are shown on screen, not sent.
- **Image URLs are entered by hand.** No upload pipeline.
- **`FOR UPDATE` serialises checkout per product.** Correct, and fine at this
  scale, but two people booking different units of the same product still queue
  behind each other.
