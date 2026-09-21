import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Star } from "lucide-react";
import { reviewSummarySchema } from "@shared/schemas/review.schema";
import { api } from "@/api/client";
import { Skeleton } from "@/components/ui/skeleton";

function Stars({ rating, label }: { rating: number; label?: string }) {
  return (
    <span
      className="flex items-center gap-0.5"
      role="img"
      aria-label={label ?? `${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-4 ${
            n <= rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"
          }`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function ProductReviews({ slug }: { slug: string }) {
  const reviews = useQuery({
    queryKey: ["reviews", slug],
    queryFn: ({ signal }) =>
      api.get(`/api/v1/gear/${encodeURIComponent(slug)}/reviews`, {
        schema: reviewSummarySchema,
        signal,
      }),
    select: (result) => result.data,
    staleTime: 60_000,
  });

  if (reviews.isPending) {
    return <Skeleton className="mt-3 h-24 w-full rounded-xl" />;
  }

  // A failed review fetch must not take the product page down with it.
  if (reviews.isError) return null;

  const { count, average, reviews: rows } = reviews.data;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Reviews
        </h2>
        {average !== null && (
          <>
            <Stars
              rating={Math.round(average)}
              label={`Average ${average.toFixed(1)} out of 5 from ${count} reviews`}
            />
            <span className="text-sm text-muted-foreground">
              {average.toFixed(1)} · {count}
            </span>
          </>
        )}
      </div>

      {count === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No reviews yet. Only people who have rented this can leave one.
        </p>
      ) : (
        <ul className="mt-3 divide-y border-t">
          {rows.map((review) => (
            <li key={review.id} className="py-3">
              <div className="flex items-center gap-2">
                <Stars rating={review.rating} />
                <span className="text-sm font-medium">{review.authorName}</span>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(review.createdAt), "d MMM yyyy")}
                </span>
              </div>
              {review.body && <p className="mt-1 text-sm">{review.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
