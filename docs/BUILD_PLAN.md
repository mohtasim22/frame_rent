# FrameRent — Build Plan

**The plan — why, and in what order:**
https://claude.ai/code/artifact/6c3b401c-503e-4bed-adc1-1b2c2aee230d

**The slice backlog — what to do today (ticks are saved):**
https://claude.ai/code/artifact/2b90a1e2-10b1-4458-92ea-73cd800a5f98

A camera & lens rental web app. Second project, after a MERN parcel-delivery app.
Built as a **separate Express API and React client in one repository**.

## Shape

```
FrameRent/
├─ api/          Express + TypeScript + Prisma   ·  port 4000
├─ web/          Vite + React + TanStack Query   ·  port 5173
├─ shared/       zod schemas + types BOTH sides import
├─ docs/
└─ package.json  root: concurrently, starts both
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
| ORM        | Prisma 6                     |
| Validation | zod (schemas live in `shared/`) |
| Auth       | better-auth                  |
| Testing    | Vitest (availability only)   |
| Hosting    | Railway or Render            |

### web/
| Layer    | Choice                        |
| -------- | ----------------------------- |
| Build    | Vite + React 19 + TypeScript  |
| Routing  | React Router 7                |
| Data     | TanStack Query                |
| Styling  | Tailwind v4 + shadcn/ui       |
| Forms    | react-hook-form + zod         |
| Dates    | date-fns + react-day-picker   |
| Cart     | Zustand                       |
| Hosting  | Vercel or Netlify             |

Roles: **renter + admin** (not a peer-to-peer marketplace).

## Groups

The backlog breaks these into 66 vertical slices.

- [ ] **A — Two apps, one command.** Both halves running, health check across the wire, `shared/` resolving.
- [ ] **B — Schema and seed.** One model end to end first, then all nine.
- [ ] **C — The gear API.** Endpoints only, tested in Postman. No UI.
- [ ] **D — The catalogue.** React consuming the API. Deploy both halves here.
- [ ] **E — Availability.** Overlap logic, tests, calendar.
- [ ] **F — Booking.** Server-side pricing, the transaction, the race test.
- [ ] **G — Auth across two origins.** The cookie tax.
- [ ] **H — Admin.** Inventory, units, holds, booking lifecycle.
- [ ] **I — Ship.** Production CORS, Stripe, email, reviews, READMEs.

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
3. **Two of everything.** Two `.env`, two deploys, two logs. Root `concurrently`
   handles dev; write down in the README which variable belongs where.

## Review checkpoints

| After | Bring                                   |
| ----- | --------------------------------------- |
| B     | `schema.prisma` + `seed.ts`             |
| C     | one full module (routes/controller/service) |
| E     | `availability.service.ts` + its tests   |
| F     | `booking.service.ts` (the transaction)  |
