import { useState } from "react";
import { format } from "date-fns";
import { UNIT_CONDITIONS, UNIT_STATUSES } from "@shared/types/domain";
import type { UnitCondition, UnitStatus } from "@shared/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { formatCents } from "@/lib/format";
import { ImageManager } from "@/components/admin/ImageManager";
import { ProductForm } from "@/components/admin/ProductForm";
import {
  useAddUnit,
  useAdminProducts,
  useCreateHold,
  useSetProductActive,
  useUnits,
  useUpdateUnit,
} from "@/hooks/useAdmin";

function UnitPanel({ productId }: { productId: string }) {
  const units = useUnits(productId);
  const addUnit = useAddUnit(productId);
  const updateUnit = useUpdateUnit();
  const createHold = useCreateHold();

  const [serial, setSerial] = useState("");
  const [holdUnit, setHoldUnit] = useState<string | null>(null);
  const [reason, setReason] = useState("Sensor clean");
  const [start, setStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [end, setEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  if (units.isPending) return <Skeleton className="mt-3 h-24 w-full rounded-lg" />;
  if (units.isError) {
    return <ErrorState error={units.error} onRetry={() => units.refetch()} />;
  }

  return (
    <div className="mt-3 rounded-lg border p-3">
      <ul className="divide-y">
        {units.data.map((unit) => (
          <li key={unit.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
            <span className="font-mono text-xs">{unit.serialNumber}</span>

            <select
              value={unit.status}
              onChange={(event) =>
                updateUnit.mutate({
                  id: unit.id,
                  status: event.target.value as UnitStatus,
                })
              }
              className="rounded-md border bg-transparent px-2 py-1 text-xs"
              aria-label={`Status of ${unit.serialNumber}`}
            >
              {UNIT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <select
              value={unit.condition}
              onChange={(event) =>
                updateUnit.mutate({
                  id: unit.id,
                  condition: event.target.value as UnitCondition,
                })
              }
              className="rounded-md border bg-transparent px-2 py-1 text-xs"
              aria-label={`Condition of ${unit.serialNumber}`}
            >
              {UNIT_CONDITIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHoldUnit(holdUnit === unit.id ? null : unit.id)}
            >
              Hold…
            </Button>

            {unit.notes && (
              <span className="text-xs text-muted-foreground">{unit.notes}</span>
            )}
          </li>
        ))}
      </ul>

      {updateUnit.isError && (
        <p className="mt-2 text-sm text-destructive">{updateUnit.error.message}</p>
      )}

      {holdUnit && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
          <label className="text-sm">
            <span className="text-muted-foreground">Reason</span>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">From</span>
            <Input
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="mt-1"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">To</span>
            <Input
              type="date"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="mt-1"
            />
          </label>
          <Button
            size="sm"
            disabled={createHold.isPending}
            onClick={() =>
              createHold.mutate(
                { gearUnitId: holdUnit, reason, start, end },
                { onSuccess: () => setHoldUnit(null) },
              )
            }
          >
            {createHold.isPending ? "Saving…" : "Open hold"}
          </Button>

          {createHold.isError && (
            <p className="w-full text-sm text-destructive">{createHold.error.message}</p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
        <label className="text-sm">
          <span className="text-muted-foreground">New serial number</span>
          <Input
            value={serial}
            onChange={(event) => setSerial(event.target.value)}
            placeholder="CANON-EOS-R5-03"
            className="mt-1"
          />
        </label>
        <Button
          size="sm"
          variant="outline"
          disabled={serial.trim() === "" || addUnit.isPending}
          onClick={() =>
            addUnit.mutate(
              { serialNumber: serial.trim(), condition: "NEW", status: "AVAILABLE" },
              { onSuccess: () => setSerial("") },
            )
          }
        >
          Add unit
        </Button>

        {addUnit.isError && (
          <p className="w-full text-sm text-destructive">{addUnit.error.message}</p>
        )}
      </div>
    </div>
  );
}

export function AdminInventoryPage() {
  const gear = useAdminProducts();
  const setActive = useSetProductActive();
  const [openProduct, setOpenProduct] = useState<string | null>(null);
  const [openImages, setOpenImages] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Products, units, images and maintenance holds.
          </p>
        </div>

        <Button onClick={() => setCreating((open) => !open)}>
          {creating ? "Close" : "New product"}
        </Button>
      </div>

      {creating && <ProductForm onDone={() => setCreating(false)} />}

      {gear.isPending && <Skeleton className="mt-6 h-96 w-full rounded-xl" />}
      {gear.isError && (
        <div className="mt-6">
          <ErrorState error={gear.error} onRetry={() => gear.refetch()} />
        </div>
      )}

      {gear.isSuccess && (
        <ul className="mt-6 space-y-2">
          {gear.data.map((item) => (
            <li
              key={item.id}
              className={`rounded-xl border p-4 ${item.isActive ? "" : "opacity-60"}`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1 truncate font-medium">
                  {item.name}
                </span>
                {!item.isActive && <Badge variant="outline">Archived</Badge>}
                <Badge variant="secondary">
                  {item._count.units} {item._count.units === 1 ? "unit" : "units"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatCents(item.dailyRateCents)}/day
                </span>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setOpenImages(openImages === item.id ? null : item.id)
                  }
                >
                  {openImages === item.id ? "Hide images" : "Images"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setOpenProduct(openProduct === item.id ? null : item.id)
                  }
                >
                  {openProduct === item.id ? "Hide units" : "Units"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(editing === item.id ? null : item.id)}
                >
                  {editing === item.id ? "Close" : "Edit"}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={setActive.isPending}
                  onClick={() =>
                    setActive.mutate({ id: item.id, isActive: !item.isActive })
                  }
                >
                  {item.isActive ? "Archive" : "Restore"}
                </Button>
              </div>

              {editing === item.id && (
                <ProductForm product={item} onDone={() => setEditing(null)} />
              )}

              {openImages === item.id && (
                <ImageManager
                  productId={item.id}
                  productName={item.name}
                  images={item.images}
                />
              )}

              {openProduct === item.id && <UnitPanel productId={item.id} />}
            </li>
          ))}
        </ul>
      )}

      {setActive.isError && (
        <p className="mt-4 text-sm text-destructive">{setActive.error.message}</p>
      )}
    </div>
  );
}
