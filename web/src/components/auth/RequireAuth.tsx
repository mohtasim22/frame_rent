import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";

/**
 * Convenience, NOT security. This only decides what to render; every protected
 * endpoint is guarded again on the server by requireUser / requireAdmin,
 * because anything this component enforces can be bypassed with curl.
 */
export function RequireAuth({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { data, isPending } = useSession();
  const location = useLocation();

  if (isPending) {
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-10">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="mt-4 h-32 w-full rounded-xl" />
      </section>
    );
  }

  if (!data) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?next=${next}`} replace />;
  }

  if (adminOnly && data.user.role !== "ADMIN") {
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Not your floor</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is for staff accounts.
        </p>
      </section>
    );
  }

  return <>{children}</>;
}
