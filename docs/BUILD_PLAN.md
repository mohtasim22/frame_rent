# FrameRent — Build Plan

**The plan — why, and in what order:**
https://claude.ai/artifact/JxESZAzvG2dCDtQLa6eGDL

**The slice backlog — what to do today (ticks are saved):**
https://claude.ai/artifact/91SYHUm8zmtGneQciPqvsB

A camera & lens rental web app. Second project, after a MERN parcel-delivery app.
Built as a **separate Express API and React client in one repository**.

## Shape

```
FrameRent/
├─ api/          Express + TypeScript + Prisma   ·  port 4000
├─ web/          Vite + React + TanStack Query   ·  port 5173
├─ shared/       zod schemas + types BOTH sides import
├─ docs/
└─ package.json  root: npm workspaces (two terminals, no concurrently)
```

Two `package.json`, two dev servers, two deployments — a real split. One git repo,
so types that cross the wire are written once instead of twice.

## Stack

### api/
| Layer      | Choice                       |
| ---------- | ---------------------------- |
| Runtime    | Node 22 + Express 5          |
| Language   | TypeScript (strict), `tsx watch` |
| Database   | PostgreSQL (Neon)            |
| ORM        | Prisma 7 (driver adapters)   |
| Validation | zod (schemas live in `shared/`) |
| Auth       | better-auth                  |
| Testing    | Vitest (pure rules, 55 tests)|
| Hosting    | Railway or Render            |

### web/
| Layer    | Choice                        |
| -------- | ----------------------------- |
| Build    | Vite + React 19 + TypeScript  |
| Routing  | React Router 8                |
| Data     | TanStack Query                |
| Styling  | Tailwind v4 + shadcn/ui       |
| Forms    | react-hook-form + zod         |
| Dates    | date-fns + react-day-picker   |
| Cart     | Zustand                       |
| Hosting  | Vercel or Netlify             |

Roles: **renter + admin** (not a peer-to-peer marketplace).

## Groups

The backlog breaks these into 66 vertical slices.

- [x] **A — Two apps, one command.** Both halves running, health check across the wire, `shared/` resolving.
- [x] **B — Schema and seed.** One model end to end first, then all nine.
- [x] **C — The gear API.** Endpoints only, tested in Postman. No UI.
- [x] **D — The catalogue.** React consuming the API, filters, pagination, designed dead ends. (D9 deploy deferred to group I.)
- [x] **E — Availability.** Overlap logic, tests, calendar.
- [x] **F — Booking.** Server-side pricing, the transaction, the race test.
- [x] **G — Auth across two origins.** The cookie tax.
- [x] **H — Admin.** Inventory, units, holds, booking lifecycle. (H6 image upload needs a Cloudinary/UploadThing account.)
- [~] **I — Ship.** Reviews (I4), polish (I5) and both READMEs (I6) are done.
      D9/I1 deploy is prepared and documented in DEPLOY.md — it needs your
      Render, Vercel and Neon accounts to actually run.
      Blocked on API keys: I2 Stripe, I3 Resend.

## The rule that shapes everything

Inventory is tracked **per physical unit**, not per product. Availability is a
date-range overlap question, and the booking must re-check availability *inside*
the transaction that creates it.

Two ranges collide when:

```
existing.startDate <= requested.endDate
AND existing.endDate >= requested.startDate
```

Rental dates are stored as `@db.Date`, never `DateTime` — a timestamp carries a
timezone and shifts bookings by a day. **JSON has no date type**, so send plain
`YYYY-MM-DD` strings and parse them explicitly with `date-fns` on the client.
Never put a raw `Date` object on the wire.

## The three taxes of splitting

1. **Cookies across two origins.** `cors({ origin, credentials: true })` on the API,
   `credentials: "include"` on every request, `SameSite=None; Secure` in production.
2. **Shared types.** Anything crossing the network is defined once in `shared/`.
   Copy-pasting an interface plants a drift bug.
3. **Two of everything.** Two `.env`, two deploys, two logs. Two terminals in
   dev; write down in the README which variable belongs where.

## Review checkpoints

| After | Bring                                   |
| ----- | --------------------------------------- |
| B     | `schema.prisma` + `seed.ts`             |
| C     | one full module (routes/controller/service) |
| E     | `availability.service.ts` + its tests   |
| F     | `booking.service.ts` (the transaction)  |

## How the race is actually closed

`bookingService.create` runs allocation and insert inside one `$transaction`
whose first statement is:

```sql
SELECT id FROM gear_units WHERE "productId" IN (...) ORDER BY id FOR UPDATE
```

Product ids are sorted before locking, so two carts holding the same two
products always take the locks in the same order and cannot deadlock.
Availability is then re-read *through the transaction client*, which is what
turns an advisory answer into a decision.

Proof, on a two-unit camera with four simultaneous checkouts:

```
window 1: 201 booked FR-...
window 2: 409 UNIT_UNAVAILABLE
window 3: 409 UNIT_UNAVAILABLE
window 4: 201 booked FR-...
```

`npm run booking:race` races the service directly;
`npm run booking:race:http` races a running server over HTTP.
