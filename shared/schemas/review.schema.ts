import { z } from "zod";

export const createReviewSchema = z.object({
  bookingId: z.string().min(1),
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).nullable().default(null),
});

export type CreateReview = z.infer<typeof createReviewSchema>;

export const reviewSchema = z.object({
  id: z.string(),
  rating: z.number().int(),
  body: z.string().nullable(),
  authorName: z.string(),
  createdAt: z.string(),
});

export type Review = z.infer<typeof reviewSchema>;

export const reviewSummarySchema = z.object({
  count: z.number().int(),
  average: z.number().nullable(),
  reviews: z.array(reviewSchema),
});

export type ReviewSummary = z.infer<typeof reviewSummarySchema>;

/** What a signed-in user may review right now, from their own history. */
export const reviewableSchema = z.object({
  bookingId: z.string(),
  reference: z.string(),
  productId: z.string(),
  productName: z.string(),
  slug: z.string(),
  endDate: z.string(),
});

export type Reviewable = z.infer<typeof reviewableSchema>;
