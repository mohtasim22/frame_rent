import { Link } from "react-router";
import { format, parseISO } from "date-fns";
import { AlertTriangle, PackageCheck, PackageOpen, Wrench } from "lucide-react";
import type { AdminBookingRow } from "@shared/schemas/admin.schema";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { formatCents } from "@/lib/format";
import { statusTone } from "@/lib/status";
import { useDashboard } from "@/hooks/useAdmin";

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "warning";
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${tone === "warning" ? "border-destructive/40" : ""}`}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={`mt-2 text-2xl font-semibold ${tone === "warning" ? "text-destructive" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function BookingList({ rows, empty }: { rows: AdminBookingRow[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className="mt-3 divide-y border-t">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
          <Link
            to={`/admin/bookings?q=${encodeURIComponent(row.reference)}`}
            className="font-mono text-xs underline-offset-4 hover:underline"
          >
            {row.reference}
          </Link>
          <span className="min-w-0 flex-1 truncate">{row.headline}</span>
          <span className="text-muted-foreground">{row.customerName}</span>
          <span className="text-muted-foreground">
            {format(parseISO(row.startDate), "d MMM")} –{" "}
            {format(parseISO(row.endDate), "d MMM")}
          </span>
          <Badge variant={statusTone(row.status)}>{row.status}</Badge>
          <span className="font-medium">{formatCents(row.totalCents)}</span>
        </li>
      ))}
    </ul>
  );
}

export function AdminDashboardPage() {
  const dashboard = useDashboard();

  if (dashboard.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (dashboard.isError) {
    return <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />;
  }

  const data = dashboard.data;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {format(parseISO(data.date), "EEEE d MMMM yyyy")}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<PackageOpen className="size-4" aria-hidden="true" />}
          label="Pickups due"
          value={data.pickupsDue.length}
        />
        <Stat
          icon={<PackageCheck className="size-4" aria-hidden="true" />}
          label="Returns due"
          value={data.returnsDue.length}
        />
        <Stat
          icon={<AlertTriangle className="size-4" aria-hidden="true" />}
          label="Overdue"
          value={data.overdue.length}
          tone={data.overdue.length > 0 ? "warning" : undefined}
        />
        <Stat
          icon={<Wrench className="size-4" aria-hidden="true" />}
          label="In maintenance"
          value={`${data.unitsInMaintenance} / ${data.unitsTotal}`}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Going out today
        </h2>
        <BookingList rows={data.pickupsDue} empty="Nothing to hand over." />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Coming back today
        </h2>
        <BookingList rows={data.returnsDue} empty="Nothing due back." />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-destructive">
          Overdue
        </h2>
        <BookingList rows={data.overdue} empty="Nothing overdue. Good day." />
      </section>
    </div>
  );
}
