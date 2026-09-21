import { Link, useParams } from "react-router";
import { Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/api/client";
import { useGearDetail } from "@/hooks/useGear";
import { formatCents } from "@/lib/format";
import { specRows } from "@/lib/specs";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { useState } from "react";
import { AvailabilityCalendar } from "@/components/gear/AvailabilityCalendar";
import { ProductReviews } from "@/components/gear/ProductReviews";
import { useCartStore } from "@/store/cart";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export function GearDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const gear = useGearDetail(slug ?? "");
  const [imageFailed, setImageFailed] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const addLine = useCartStore((state) => state.addLine);
  const inCart = useCartStore(
    (state) => state.lines.filter((line) => line.slug === slug).length,
  );

  if (gear.isPending) {
    return (
      <section className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-4/3 w-full rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </section>
    );
  }

  if (gear.isError) {
    const notFound =
      gear.error instanceof ApiError && gear.error.status === 404;

    return (
      <section className="mx-auto w-full max-w-5xl px-6 py-10">
        {notFound ? (
          <EmptyState
            title="We don't have that one"
            description="It may have been retired from the catalogue."
            action={
              <Link to="/gear" className="text-sm underline underline-offset-4">
                Browse the catalogue
              </Link>
            }
          />
        ) : (
          <ErrorState error={gear.error} onRetry={() => gear.refetch()} />
        )}
      </section>
    );
  }

  const item = gear.data.data;

  const image = imageFailed ? undefined : item.images[0];

  const units = item._count.units;

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link
        to="/gear"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        ← Back to the catalogue
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="aspect-4/3 overflow-hidden rounded-xl border bg-muted">
          {image ? (
            <img
              src={image}
              alt={item.name}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Camera className="size-10" aria-hidden="true" />
            </div>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {item.brand.name} · {item.category.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {item.name}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {item.description}
          </p>

          <div className="mt-6 rounded-xl border p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold">
                {formatCents(item.dailyRateCents)}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  / day
                </span>
              </span>
              <Badge variant="secondary">
                {units} {units === 1 ? "unit" : "units"}
              </Badge>
            </div>

            <dl className="mt-4 space-y-1 text-sm">
              {item.weeklyRateCents !== null && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Weekly rate</dt>
                  <dd>{formatCents(item.weeklyRateCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Security deposit</dt>
                <dd>{formatCents(item.depositCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Turnaround</dt>
                <dd>
                  {item.bufferDays} {item.bufferDays === 1 ? "day" : "days"}
                </dd>
              </div>
            </dl>
          </div>

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Specifications
          </h2>
          <dl className="mt-3 divide-y border-t">
            {specRows(item.specs).map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <AvailabilityCalendar
          item={item}
          range={range}
          onRangeChange={setRange}
        />

        <Button
          className="w-full"
          disabled={!range?.from || !range.to}
          onClick={() => {
            if (!range?.from || !range.to) return;

            addLine({
              productId: item.id,
              slug: item.slug,
              name: item.name,
              imageUrl: item.images[0] ?? null,
              dailyRateCents: item.dailyRateCents,
              weeklyRateCents: item.weeklyRateCents,
              depositCents: item.depositCents,
              start: format(range.from, "yyyy-MM-dd"),
              end: format(range.to, "yyyy-MM-dd"),
            });

            setRange(undefined);
          }}
        >
          {range?.from && range.to ? "Add to cart" : "Select dates to continue"}
        </Button>
        {inCart > 0 && (
          <p className="text-center text-sm text-muted-foreground">
            In your cart: {inCart} date {inCart === 1 ? "range" : "ranges"}
          </p>
        )}
      </div>

      <ProductReviews slug={item.slug} />
    </section>
  );
}
