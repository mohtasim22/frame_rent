import { prisma } from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { quoteRental, rentalDays } from "@shared/lib/pricing";
import type { QuoteRequest, QuoteResponse } from "@shared/schemas/booking.schema";
import { availabilityService } from "../availability/availability.service";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const bookingService = {
  /**
   * Prices a cart from the database. The client's numbers are never trusted —
   * only the slugs and the dates are, and both are re-validated here.
   */
  async quote({ lines }: QuoteRequest): Promise<QuoteResponse> {
    const now = today();

    for (const line of lines) {
      if (line.start < now) {
        throw new BadRequestError(
          `${line.slug}: ${line.start} is in the past`,
          "DATE_IN_PAST",
        );
      }
    }

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

    const priced = await Promise.all(
      lines.map(async (line) => {
        // Safe: every slug was checked against `missing` above.
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
};
