import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router";
import { Header } from "@/components/layout/Header";
import { RouteAnnouncer } from "@/components/layout/RouteAnnouncer";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ErrorBoundary } from "@/components/states/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { GearListPage } from "@/pages/GearListPage";
import { GearDetailPage } from "@/pages/GearDetailPage";
import { CartPage } from "@/pages/CartPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { BookingConfirmationPage } from "@/pages/BookingConfirmationPage";
import { MyRentalsPage } from "@/pages/MyRentalsPage";
import { SignInPage } from "@/pages/SignInPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

/**
 * The admin console is split out of the main bundle. Almost nobody who loads
 * this site is staff, so shipping the occupancy grid and the lifecycle console
 * to every visitor is paying for a screen they will never open.
 */
const AdminLayout = lazy(() =>
  import("@/pages/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })),
);
const AdminDashboardPage = lazy(() =>
  import("@/pages/admin/AdminDashboardPage").then((m) => ({
    default: m.AdminDashboardPage,
  })),
);
const AdminBookingsPage = lazy(() =>
  import("@/pages/admin/AdminBookingsPage").then((m) => ({
    default: m.AdminBookingsPage,
  })),
);
const AdminInventoryPage = lazy(() =>
  import("@/pages/admin/AdminInventoryPage").then((m) => ({
    default: m.AdminInventoryPage,
  })),
);
const AdminOccupancyPage = lazy(() =>
  import("@/pages/admin/AdminOccupancyPage").then((m) => ({
    default: m.AdminOccupancyPage,
  })),
);

function RouteFallback() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-4 h-64 w-full rounded-xl" />
    </section>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <RouteAnnouncer />

      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<GearListPage />} />
            <Route path="/gear/:slug" element={<GearDetailPage />} />
            <Route path="/cart" element={<CartPage />} />

            <Route path="/sign-in" element={<SignInPage mode="sign-in" />} />
            <Route path="/sign-up" element={<SignInPage mode="sign-up" />} />

            <Route
              path="/checkout"
              element={
                <RequireAuth>
                  <CheckoutPage />
                </RequireAuth>
              }
            />
            <Route
              path="/rentals"
              element={
                <RequireAuth>
                  <MyRentalsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/booking/:reference"
              element={
                <RequireAuth>
                  <BookingConfirmationPage />
                </RequireAuth>
              }
            />

            <Route
              path="/admin"
              element={
                <RequireAuth adminOnly>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="inventory" element={<AdminInventoryPage />} />
              <Route path="occupancy" element={<AdminOccupancyPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
