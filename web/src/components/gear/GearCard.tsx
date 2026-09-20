import { Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GearItem } from "@shared/schemas/gear.schema";
import { formatCents } from "@/lib/format";
import { Link } from "react-router";
import { useState } from "react";

export function GearCard({ item }: { item: GearItem }) {
  const units = item._count.units;
  const [imageFailed, setImageFailed] = useState(false);
  const image = imageFailed ? undefined : item.images[0];

  return (
    <Link
      to={`/gear/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
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
            <Camera className="size-8" aria-hidden="true" />
          </div>
        )}

        {item.mount && (
          <Badge variant="secondary" className="absolute left-2 top-2">
            {item.mount}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {item.brand.name} · {item.category.name}
        </p>

        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">
          {item.name}
        </h3>

        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <p className="text-base font-semibold">
              {formatCents(item.dailyRateCents)}
              <span className="text-xs font-normal text-muted-foreground">
                {" "}
                / day
              </span>
            </p>
            {item.weeklyRateCents !== null && (
              <p className="text-xs text-muted-foreground">
                {formatCents(item.weeklyRateCents)} / week
              </p>
            )}
          </div>

          <span className="text-xs text-muted-foreground">
            {units} {units === 1 ? "unit" : "units"}
          </span>
        </div>
      </div>
    </Link>
  );
}
