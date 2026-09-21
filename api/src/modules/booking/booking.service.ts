import { prisma } from "../../lib/prisma";
import { Prisma } from "../../generated/prisma/client";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../lib/errors";
import { quoteRental, rentalDays } from "@shared/lib/pricing";
import type { Quote } from "@shared/lib/pricing";
import type {
  BookingResponse,
  BookingSummary,
  CreateBooking,
  MyBookingsQuery,
  QuoteRequest,
  QuoteResponse,
} from "@shared/schemas/booking.schema";
import { PICKUP_METHODS } from "@shared/schemas/booking.schema";
import {
  availabilityService,
  toDateString,
} from "../availability/availability.service";
import type { AuthUser } from "../../middleware/auth";

type LineInput = QuoteRequest["lines"][number];

type ProductRates = {
  id: string;
  slug: string;
  name: string;
  dailyRateCents: number;
  weeklyRateCents: number | null;
  depositCents: number;
};

type Allocation = {
  line: LineInput;
  product: ProductRates;
  quote: Quote;
  unitId: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function newReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const noise = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FR-${stamp}-${noise}`;
}

function rejectPastDates(lines: LineInput[]): void {
  const now = today();

  for (const line of lines) {
    if (line.start < now) {
      throw new BadRequestError(
        `${line.slug}: ${line.start} is in the past`,
        "DATE_IN_PAST",
      );
    }
  }
}

/** One query for every slug in the cart, and a 404 if any of them is unknown. */
async function loadProducts(
  lines: LineInput[],
): Promise<Map<string, ProductRates>> {
  const slugs = [...new Set(lines.map((line) => line.slug))];

  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      dailyRateCents: true,
      weeklyRateCents: true,
      depositCents: true,
    },
  });

  const bySlug = new Map(products.map((product) => [product.slug, product]));

  const missing = slugs.filter((slug) => !bySlug.has(slug));
  if (missing.length > 0) {
    throw new NotFoundError(`Not in the catalogue: ${missing.join(", ")}`);
  }

  return bySlug;
}

export const bookingService = {
  /**
   * Prices a cart from the database. The numbers a client sends are never
   * trusted — only the slugs and the dates are, and both are re-validated here.
   */
  async quote({ lines }: QuoteRequest): Promise<QuoteResponse> {
    rejectPastDates(lines);
    const bySlug = await loadProducts(lines);

    const priced = await Promise.all(
      lines.map(async (line) => {
        const product = bySlug.get(line.slug)!;
        const quote = quoteRental(product, rentalDays(line.start, line.end));

        const unitId = await availabilityService.findAvailableUnit(
          product.id,
          line.start,
          line.end,
        );

        return {
          slug: product.slug,
          name: product.name,
          start: line.start,
          end: line.end,
          days: quote.days,
          dailyRateCents: product.dailyRateCents,
          weeklyRateCents: product.weeklyRateCents,
          subtotalCents: quote.subtotalCents,
          depositCents: quote.depositCents,
          available: unitId !== null,
        };
      }),
    );

    const subtotalCents = priced.reduce(
      (sum, line) => sum + line.subtotalCents,
      0,
    );
    const depositCents = priced.reduce(
      (sum, line) => sum + line.depositCents,
      0,
    );

    return {
      lines: priced,
      subtotalCents,
      depositCents,
      totalCents: subtotalCents + depositCents,
      allAvailable: priced.every((line) => line.available),
    };
  },

  /**
   * Creates a booking (slice F5).
   *
   * Everything that decides who gets the camera happens inside ONE transaction,
   * and the first statement in it takes a row lock on every unit of every
   * product in the cart. A second checkout for the same gear blocks on that lock
   * until this one commits, then re-reads the bookings and sees ours.
   *
   * The catalogue read above the transaction is deliberate: product names and
   * rates are not what the race is about, and holding the lock for longer than
   * necessary is how you turn a correctness fix into a throughput problem.
   */
  async create(input: CreateBooking, user: AuthUser): Promise<BookingResponse> {
    const { lines } = input;

    rejectPastDates(lines);
    const bySlug = await loadProducts(lines);

    // Sorted so that two carts holding the same two products always lock them
    // in the same order — locks taken in different orders deadlock.
    const productIds = [
      ...new Set([...bySlug.values()].map((product) => product.id)),
    ].sort();

    return prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw(Prisma.sql`
          SELECT id FROM gear_units
          WHERE "productId" IN (${Prisma.join(productIds)})
          ORDER BY id
          FOR UPDATE
        `);

        // Sequential, not Promise.all: each line must see what the previous took.
        const taken = new Set<string>();
        const allocations: Allocation[] = [];

        for (const line of lines) {
          const product = bySlug.get(line.slug)!;

          // `tx` — reading through the transaction that holds the lock is what
          // turns this from a hint into a decision.
          const unitId = await availabilityService.findAvailableUnit(
            product.id,
            line.start,
            line.end,
            taken,
            tx,
          );

          if (unitId === null) {
            throw new ConflictError(
              `${product.name} is not available ${line.start} to ${line.end}`,
              "UNIT_UNAVAILABLE",
            );
          }

          taken.add(unitId);
          allocations.push({
            line,
            product,
            unitId,
            quote: quoteRental(product, rentalDays(line.start, line.end)),
          });
        }

        return writeBooking(tx, input, allocations, user);
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
  },

  async listMine(
    user: AuthUser,
    query: MyBookingsQuery,
  ): Promise<BookingSummary[]> {
    const todayDate = toDate(today());

    const where =
      query.scope === "upcoming"
        ? { userId: user.id, endDate: { gte: todayDate } }
        : query.scope === "past"
          ? { userId: user.id, endDate: { lt: todayDate } }
          : { userId: user.id };

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: [{ startDate: "desc" }, { id: "asc" }],
      select: {
        id: true,
        reference: true,
        status: true,
        startDate: true,
        endDate: true,
        totalCents: true,
        items: { select: { productName: true } },
      },
    });

    return bookings.map((booking) => {
      const startDate = toDateString(booking.startDate);
      const [first, ...rest] = booking.items;

      return {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        startDate,
        endDate: toDateString(booking.endDate),
        totalCents: booking.totalCents,
        itemCount: booking.items.length,
        headline:
          rest.length === 0
            ? (first?.productName ?? "Booking")
            : `${first.productName} + ${rest.length} more`,
        canCancel: canCancel(booking.status, startDate),
      };
    });
  },

  /**
   * Cancelling frees the units, because CANCELLED is not in
   * BLOCKING_BOOKING_STATUSES — availability recomputes with no extra work.
   */
  async cancel(reference: string, user: AuthUser): Promise<BookingResponse> {
    const booking = await prisma.booking.findUnique({
      where: { reference },
      select: { id: true, userId: true, status: true, startDate: true },
    });

    if (
      booking === null ||
      (booking.userId !== user.id && user.role !== "ADMIN")
    ) {
      throw new NotFoundError(`No booking with reference ${reference}`);
    }

    if (booking.status !== "PENDING") {
      throw new ConflictError(
        `A ${booking.status.toLowerCase()} booking cannot be cancelled`,
        "NOT_CANCELLABLE",
      );
    }

    if (!canCancel(booking.status, toDateString(booking.startDate))) {
      throw new ConflictError(
        `Cancellations close ${CANCEL_CUTOFF_HOURS} hours before pickup`,
        "CANCEL_WINDOW_CLOSED",
      );
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });

    return bookingService.getByReference(reference, user);
  },

  async getByReference(
    reference: string,
    user: AuthUser,
  ): Promise<BookingResponse> {
    const booking = await prisma.booking.findUnique({
      where: { reference },
      include: {
        user: { select: { name: true } },
        items: {
          orderBy: { startDate: "asc" },
          include: {
            gearUnit: {
              select: {
                serialNumber: true,
                product: { select: { slug: true } },
              },
            },
          },
        },
      },
    });

    // 404 rather than 403 for someone else's booking: a 403 would confirm that
    // the reference exists, which is exactly what a guesser wants to learn.
    if (
      booking === null ||
      (booking.userId !== user.id && user.role !== "ADMIN")
    ) {
      throw new NotFoundError(`No booking with reference ${reference}`);
    }

    return {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      startDate: toDateString(booking.startDate),
      endDate: toDateString(booking.endDate),
      subtotalCents: booking.subtotalCents,
      depositCents: booking.depositCents,
      feeCents: booking.feeCents,
      totalCents: booking.totalCents,
      customerName: booking.user.name,
      pickupMethod: asPickupMethod(booking.pickupMethod),
      items: booking.items.map((item) => ({
        productName: item.productName,
        slug: item.gearUnit.product.slug,
        serialNumber: item.gearUnit.serialNumber,
        start: toDateString(item.startDate),
        end: toDateString(item.endDate),
        days: item.days,
        dailyRateCents: item.dailyRateCents,
        lineTotalCents: item.lineTotalCents,
      })),
    };
  },
};

/** Hours before pickup after which a booking can no longer be cancelled. */
const CANCEL_CUTOFF_HOURS = 48;

export function canCancel(
  status: string,
  startDate: string,
  now = new Date(),
): boolean {
  if (status !== "PENDING") return false;

  const pickup = new Date(`${startDate}T00:00:00Z`).getTime();
  return pickup - now.getTime() > CANCEL_CUTOFF_HOURS * 60 * 60 * 1000;
}

/**
 * `pickupMethod` is a plain column, so the database can hold a value the API
 * contract does not allow. Narrow it rather than asserting it.
 */
function asPickupMethod(value: string | null): BookingResponse["pickupMethod"] {
  return PICKUP_METHODS.includes(value as (typeof PICKUP_METHODS)[number])
    ? (value as (typeof PICKUP_METHODS)[number])
    : null;
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Writes the user, the booking and its items. Called only inside the lock. */
async function writeBooking(
  tx: TxClient,
  input: CreateBooking,
  allocations: Allocation[],
  user: AuthUser,
): Promise<BookingResponse> {
  const subtotalCents = allocations.reduce(
    (sum, a) => sum + a.quote.subtotalCents,
    0,
  );
  const depositCents = allocations.reduce(
    (sum, a) => sum + a.quote.depositCents,
    0,
  );

  // The booking's dates are the envelope across its items.
  const startDate = allocations.reduce(
    (min, a) => (a.line.start < min ? a.line.start : min),
    allocations[0].line.start,
  );
  const endDate = allocations.reduce(
    (max, a) => (a.line.end > max ? a.line.end : max),
    allocations[0].line.end,
  );

  if (input.phone !== undefined) {
    await tx.user.update({
      where: { id: user.id },
      data: { phone: input.phone },
    });
  }

  const booking = await tx.booking.create({
    data: {
      reference: newReference(),
      status: "PENDING",
      startDate: toDate(startDate),
      endDate: toDate(endDate),
      subtotalCents,
      depositCents,
      feeCents: 0,
      totalCents: subtotalCents + depositCents,
      pickupMethod: input.pickupMethod,
      notes: input.notes,
      userId: user.id,
      items: {
        create: allocations.map((a) => ({
          gearUnitId: a.unitId,
          startDate: toDate(a.line.start),
          endDate: toDate(a.line.end),
          productName: a.product.name,
          dailyRateCents: a.product.dailyRateCents,
          days: a.quote.days,
          lineTotalCents: a.quote.subtotalCents,
        })),
      },
    },
    include: {
      items: {
        select: {
          gearUnitId: true,
          gearUnit: { select: { serialNumber: true } },
        },
      },
    },
  });

  const serialByUnit = new Map(
    booking.items.map((item) => [item.gearUnitId, item.gearUnit.serialNumber]),
  );

  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    startDate,
    endDate,
    subtotalCents,
    depositCents,
    feeCents: booking.feeCents,
    totalCents: booking.totalCents,
    customerName: user.name,
    pickupMethod: input.pickupMethod ?? null,
    // Built from `allocations`, not from `booking.items` — a nested create
    // gives no ordering guarantee on the rows it returns.
    items: allocations.map((a) => ({
      productName: a.product.name,
      slug: a.product.slug,
      serialNumber: serialByUnit.get(a.unitId)!,
      start: a.line.start,
      end: a.line.end,
      days: a.quote.days,
      dailyRateCents: a.product.dailyRateCents,
      lineTotalCents: a.quote.subtotalCents,
    })),
  };
}
