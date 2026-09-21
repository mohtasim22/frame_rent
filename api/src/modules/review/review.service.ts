import { prisma } from "../../lib/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "../../lib/errors";
import type {
  CreateReview,
  Reviewable,
  ReviewSummary,
} from "@shared/schemas/review.schema";
import type { AuthUser } from "../../middleware/auth";
import { toDateString } from "../availability/availability.service";

export const reviewService = {
  async listForProduct(slug: string): Promise<ReviewSummary> {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (product === null) throw new NotFoundError("No such product");

    const [reviews, aggregate] = await Promise.all([
      prisma.review.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          rating: true,
          body: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
      prisma.review.aggregate({
        where: { productId: product.id },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    return {
      count: aggregate._count,
      average: aggregate._avg.rating,
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        body: review.body,
        authorName: review.user.name,
        createdAt: review.createdAt.toISOString(),
      })),
    };
  },

  /**
   * Which of this user's bookings have earned the right to a review: their own,
   * RETURNED, and not already reviewed. Review.bookingId is unique, so the
   * database enforces one review per booking even if two tabs submit at once.
   */
  async listReviewable(user: AuthUser): Promise<Reviewable[]> {
    const bookings = await prisma.booking.findMany({
      where: { userId: user.id, status: "RETURNED", review: null },
      orderBy: { endDate: "desc" },
      select: {
        id: true,
        reference: true,
        endDate: true,
        items: {
          take: 1,
          select: {
            productName: true,
            gearUnit: { select: { product: { select: { id: true, slug: true } } } },
          },
        },
      },
    });

    return bookings.flatMap((booking) => {
      const item = booking.items[0];
      if (!item) return [];

      return [
        {
          bookingId: booking.id,
          reference: booking.reference,
          productId: item.gearUnit.product.id,
          productName: item.productName,
          slug: item.gearUnit.product.slug,
          endDate: toDateString(booking.endDate),
        },
      ];
    });
  },

  async create(input: CreateReview, user: AuthUser) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      select: {
        id: true,
        userId: true,
        status: true,
        review: { select: { id: true } },
        items: { select: { gearUnit: { select: { productId: true } } } },
      },
    });

    if (booking === null) throw new NotFoundError("No such booking");

    if (booking.userId !== user.id) {
      throw new ForbiddenError("You can only review your own rentals");
    }

    // The gate: you may review gear you actually took out and gave back.
    if (booking.status !== "RETURNED") {
      throw new ConflictError(
        "You can review a rental once it has been returned",
        "NOT_RETURNED",
      );
    }

    if (booking.review) {
      throw new ConflictError("This rental already has a review", "ALREADY_REVIEWED");
    }

    const rented = booking.items.some(
      (item) => item.gearUnit.productId === input.productId,
    );

    if (!rented) {
      throw new ConflictError(
        "That product was not part of this booking",
        "PRODUCT_NOT_IN_BOOKING",
      );
    }

    const review = await prisma.review.create({
      data: {
        rating: input.rating,
        body: input.body,
        userId: user.id,
        productId: input.productId,
        bookingId: booking.id,
      },
      select: { id: true, rating: true, body: true, createdAt: true },
    });

    return {
      id: review.id,
      rating: review.rating,
      body: review.body,
      authorName: user.name,
      createdAt: review.createdAt.toISOString(),
    };
  },
};
