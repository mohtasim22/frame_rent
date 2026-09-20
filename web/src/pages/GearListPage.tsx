import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { GearCard } from "@/components/gear/GearCard";
import { GearFilterBar } from "@/components/gear/GearFilterBar";
import { useGear } from "@/hooks/useGear";
import { useGearFilters } from "@/hooks/useGearFilters";
import { GearPagination } from "@/components/gear/GearPagination";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";

export function GearListPage() {
  const { filters, activeCount, clearAll, setPage } = useGearFilters();
  const gear = useGear({ ...filters, perPage: 12 });

  const meta = gear.data?.meta;
  const items = gear.data?.data ?? [];
  const firstIndex = meta ? (meta.page - 1) * meta.perPage + 1 : 0;

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Camera &amp; lens rental
        </h1>
        {meta && meta.total > 0 && (
          <p className="text-sm text-muted-foreground">
            Showing {firstIndex}–{firstIndex + items.length - 1} of {meta.total}
          </p>
        )}
      </div>

      <GearFilterBar />

      {gear.isPending && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      )}

      {gear.isError && (
        <ErrorState error={gear.error} onRetry={() => gear.refetch()} />
      )}

      {gear.isSuccess &&
        items.length === 0 &&
        (meta && meta.total > 0 ? (
          <EmptyState
            title="There's nothing on this page"
            description={`This search has ${meta.total} results, but not on page ${meta.page}.`}
            action={
              <Button variant="outline" size="sm" onClick={() => setPage(1)}>
                Back to the first page
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No gear matches these filters"
            description="Try removing a filter or widening the price range."
            action={
              activeCount > 0 ? (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ))}

      {gear.isSuccess && items.length > 0 && (
        <>
          <div
            className={cn(
              "mt-8 grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
              gear.isPlaceholderData && "opacity-60",
            )}
          >
            {items.map((item) => (
              <GearCard key={item.id} item={item} />
            ))}
          </div>

          {meta && (
            <GearPagination page={meta.page} totalPages={meta.totalPages} />
          )}
        </>
      )}
    </section>
  );
}
