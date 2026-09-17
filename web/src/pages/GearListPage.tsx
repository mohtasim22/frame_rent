import { Skeleton } from "@/components/ui/skeleton";
import { GearCard } from "@/components/gear/GearCard";
import { useGear } from "@/hooks/useGear";

export function GearListPage() {
  const gear = useGear({ perPage: 12 });

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Camera &amp; lens rental
        </h1>
        {gear.isSuccess && (
          <p className="text-sm text-muted-foreground">
            {gear.data.data.length} of {gear.data.meta?.total} items
          </p>
        )}
      </div>

      {gear.isPending && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-xl" />

          ))}
        </div>
      )}

      {gear.isError && (
        <p className="mt-8 text-sm text-destructive">{gear.error.message}</p>
      )}

      {gear.isSuccess && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {gear.data.data.map((item) => (
            <GearCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
