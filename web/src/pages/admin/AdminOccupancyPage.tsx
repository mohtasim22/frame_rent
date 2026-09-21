import { useState } from "react";
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import type { OccupancyCell } from "@shared/schemas/admin.schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { useOccupancy } from "@/hooks/useAdmin";

/**
 * One colour per state, defined once. The legend and the grid read the same
 * object, so a cell can never mean something the legend does not explain.
 */
const CELLS: Record<OccupancyCell, { className: string; label: string }> = {
  free: { className: "bg-muted", label: "Free" },
  booked: { className: "bg-emerald-600", label: "Booked" },
  buffer: { className: "bg-emerald-600/30", label: "Turnaround" },
  hold: { className: "bg-amber-500", label: "Maintenance hold" },
  offline: { className: "bg-muted-foreground/40", label: "Offline" },
};

export function AdminOccupancyPage() {
  const [monthOffset, setMonthOffset] = useState(0);

  const month = addMonths(new Date(), monthOffset);
  const from = format(startOfMonth(month), "yyyy-MM-dd");
  const to = format(endOfMonth(month), "yyyy-MM-dd");

  const occupancy = useOccupancy(from, to);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Occupancy</h1>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMonthOffset((n) => n - 1)}>
            ←
          </Button>
          <span className="min-w-36 text-center text-sm font-medium">
            {format(month, "MMMM yyyy")}
          </span>
          <Button variant="outline" size="sm" onClick={() => setMonthOffset((n) => n + 1)}>
            →
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(CELLS).map(([key, cell]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`size-3 rounded-sm ${cell.className}`} aria-hidden="true" />
            {cell.label}
          </span>
        ))}
      </div>

      {occupancy.isPending && <Skeleton className="mt-6 h-96 w-full rounded-xl" />}

      {occupancy.isError && (
        <div className="mt-6">
          <ErrorState error={occupancy.error} onRetry={() => occupancy.refetch()} />
        </div>
      )}

      {occupancy.isSuccess && (
        <div className="mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full border-collapse text-xs">
            <caption className="sr-only">
              Every unit down the side, every day of {format(month, "MMMM yyyy")}{" "}
              across the top.
            </caption>

            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-background p-2 text-left font-medium"
                >
                  Unit
                </th>
                {occupancy.data.dates.map((day) => (
                  <th
                    key={day}
                    scope="col"
                    className="p-1 text-center font-normal text-muted-foreground"
                  >
                    {format(parseISO(day), "d")}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {occupancy.data.rows.map((row) => (
                <tr key={row.unitId} className="border-t">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 whitespace-nowrap bg-background p-2 text-left font-normal"
                  >
                    <span className="font-mono text-xs">{row.serialNumber}</span>
                    <span className="ml-2 text-muted-foreground">{row.productName}</span>
                  </th>

                  {row.days.map((cell, index) => (
                    <td key={occupancy.data.dates[index]} className="p-0.5">
                      <div
                        className={`h-5 w-full rounded-sm ${CELLS[cell].className}`}
                        title={`${row.serialNumber} · ${occupancy.data.dates[index]} · ${CELLS[cell].label}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
