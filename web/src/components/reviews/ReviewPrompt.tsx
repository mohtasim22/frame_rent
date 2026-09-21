import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Star } from "lucide-react";
import {
  createReviewSchema,
  reviewableSchema,
  reviewSchema,
} from "@shared/schemas/review.schema";
import type { CreateReview } from "@shared/schemas/review.schema";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";

const reviewableList = z.array(reviewableSchema);

/**
 * Shows only what this user is actually allowed to review. The server decides
 * that list from their own returned bookings — the component never guesses.
 */
export function ReviewPrompt() {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");

  const reviewable = useQuery({
    queryKey: ["reviews", "mine"],
    queryFn: ({ signal }) =>
      api.get("/api/v1/reviews/mine", { schema: reviewableList, signal }),
    select: (result) => result.data,
  });

  const submit = useMutation({
    mutationFn: (input: CreateReview) =>
      api.post("/api/v1/reviews", input, { schema: reviewSchema }),
    retry: false,
    onSuccess: () => {
      setBody("");
      setRating(5);
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });

  if (!reviewable.isSuccess || reviewable.data.length === 0) return null;

  const next = reviewable.data[0];

  return (
    <div className="mt-6 rounded-xl border p-4">
      <p className="text-sm font-medium">How was the {next.productName}?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Booking {next.reference}, returned {next.endDate}
      </p>

      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            aria-pressed={rating === n}
          >
            <Star
              className={`size-6 ${
                n <= rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      <textarea
        rows={3}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Anything worth telling the next photographer?"
        className="mt-3 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />

      {submit.isError && (
        <p className="mt-2 text-sm text-destructive">{submit.error.message}</p>
      )}

      <Button
        className="mt-3"
        size="sm"
        disabled={submit.isPending}
        onClick={() =>
          submit.mutate(
            createReviewSchema.parse({
              bookingId: next.bookingId,
              productId: next.productId,
              rating,
              body: body.trim() === "" ? null : body.trim(),
            }),
          )
        }
      >
        {submit.isPending ? "Posting…" : "Post review"}
      </Button>
    </div>
  );
}
