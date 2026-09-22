# FrameRent

A camera and lens rental platform. Browse gear, check real availability, book a
date range, pay by card, and run the shop from an admin console.

**Live:** https://frame-rent-web.vercel.app  ·  **API:** https://frame-rent-api.onrender.com/health

> The API is on Render's free tier and sleeps when idle — the first request may
> take about 30 seconds. Payments run in Stripe **test mode**: pay with card
> `4242 4242 4242 4242`, any future expiry, any CVC.

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

## How the money works

Stripe, in test mode, with the deposit handled as an authorisation rather than a
charge.

```
checkout     charge the rental, save the card       payment_intent, automatic capture
webhook      payment_intent.succeeded               booking -> PAID -> CONFIRMED
hand over    authorise the deposit off-session      capture_method: manual
return       capture the late fee, release the rest amount_to_capture
```

**The deposit hold starts at hand-over, not at checkout.** An online card
authorisation is valid for about seven days; a rental here can run for ninety.
A hold placed at checkout would be dead long before the gear came back, so the
card is saved at checkout (`setup_future_usage`) and the hold is placed
off-session when the gear actually leaves the counter. Capturing €110 of a €350
authorisation releases the remaining €240 automatically — no separate refund.

**The webhook is the source of truth, not the browser.** `confirmPayment` only
navigates. A booking becomes `CONFIRMED` when Stripe's signed, retried webhook
says the money arrived, because a tab can close, a network can drop, and a URL
can be faked. The route is mounted with `express.raw()` **before**
`express.json()`: Stripe signs the exact bytes it sent, and a reserialised body
never verifies.

**Taking payment created an inventory problem.** A booking now exists in
`PENDING` while the customer is typing their card, so it must hold its units —
otherwise two people pay for the last camera. But an abandoned checkout would
hold it forever. `paymentDueBy` gives it a 30-minute window, and
`blockingBookingWhere()` is the single definition of "this booking is holding
units", imported by availability, booked-ranges and the occupancy grid.

Verified end to end against Stripe test mode — `npm run stripe:e2e` in `api/`
books, pays, waits for the webhook, hands over, and returns late:

```
intent       16500 = the rental, NOT rental+deposit
webhook      -> PAID, -> CONFIRMED, card saved
hand over    35000 authorised, status requires_capture
late return  11000 captured, 24000 released
```

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
| **Payments** | Stripe — Payment Element, webhooks, manual-capture deposit holds |
| **Client** | Vite, React 19, React Router 8, TanStack Query v5, Zustand 5 |
| **Styling** | Tailwind v4 + shadcn/ui |
| **Validation** | zod 4, schemas shared by both halves |
| **Testing** | Vitest — 67 tests over the pure domain rules |
| **Hosting** | Render (API) + Vercel (client) + Neon (Postgres) |

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

- **No transactional email.** Booking references are shown on screen, not sent.
- **Image URLs are entered by hand.** No upload pipeline.
- **No product create/edit form in the admin UI.** The API does full CRUD; the
  console only archives products and manages their units.
- **Stripe is test mode only.** Going live needs a completed Stripe account and
  a real webhook endpoint, not just a key swap.
- **`FOR UPDATE` serialises checkout per product.** Correct, and fine at this
  scale, but two people booking different units of the same product still queue
  behind each other.
