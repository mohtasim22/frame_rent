import { prisma } from "../../lib/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors";
import { quoteRental, rentalDays } from "@shared/lib/pricing";
import type { Quote } from "@shared/lib/pricing";
import type {
  BookingResponse,
  CreateBooking,
  QuoteRequest,
  QuoteResponse,
} from "@shared/schemas/booking.schema";
import { availabilityService } from "../availability/availability.service";

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
async function loadProducts(lines: LineInput[]): Promise<Map<string, ProductRates>> {
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

    const subtotalCents = priced.reduce((sum, line) => sum + line.subtotalCents, 0);
    const depositCents = priced.reduce((sum, line) => sum + line.depositCents, 0);

    return {
      lines: priced,
      subtotalCents,
      depositCents,
      totalCents: subtotalCents + depositCents,
      allAvailable: priced.every((line) => line.available),
    };
  },

  /**
   * NAIVE ON PURPOSE (slice F4).
   *
   * Availability is checked here and the rows are written further down, with
   * awaits in between. Another request can slip through that gap and take the
   * same unit. F5 moves the check inside the transaction that writes the rows.
   */
  async create(input: CreateBooking): Promise<BookingResponse> {
    const { lines, customer } = input;

    rejectPastDates(lines);
    const bySlug = await loadProducts(lines);

    // Sequential, not Promise.all: each line must see what the previous one took.
    const taken = new Set<string>();
    const allocations: Allocation[] = [];

    for (const line of lines) {
      const product = bySlug.get(line.slug)!;

      const unitId = await availabilityService.findAvailableUnit(
        product.id,
        line.start,
        line.end,
        taken,
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

    const subtotalCents = allocations.reduce((sum, a) => sum + a.quote.subtotalCents, 0);
    const depositCents = allocations.reduce((sum, a) => sum + a.quote.depositCents, 0);

    // The booking's dates are the envelope across its items.
    const startDate = allocations.reduce(
      (min, a) => (a.line.start < min ? a.line.start : min),
      allocations[0].line.start,
    );
    const endDate = allocations.reduce(
      (max, a) => (a.line.end > max ? a.line.end : max),
      allocations[0].line.end,
    );

    const user = await prisma.user.upsert({
      where: { email: customer.email },
      update: { name: customer.name, phone: customer.phone },
      create: { name: customer.name, email: customer.email, phone: customer.phone },
    });

    const booking = await prisma.booking.create({
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
        items: { select: { gearUnitId: true, gearUnit: { select: { serialNumber: true } } } },
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
      customerName: customer.name,
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
  },
};
