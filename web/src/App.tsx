import { Route, Routes } from "react-router";
import { Header } from "@/components/layout/Header";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ErrorBoundary } from "@/components/states/ErrorBoundry";
import { GearListPage } from "@/pages/GearListPage";
import { GearDetailPage } from "@/pages/GearDetailPage";
import { CartPage } from "@/pages/CartPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { BookingConfirmationPage } from "@/pages/BookingConfirmationPage";
import { MyRentalsPage } from "@/pages/MyRentalsPage";
import { SignInPage } from "@/pages/SignInPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminBookingsPage } from "@/pages/admin/AdminBookingsPage";
import { AdminInventoryPage } from "@/pages/admin/AdminInventoryPage";
import { AdminOccupancyPage } from "@/pages/admin/AdminOccupancyPage";

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />

      <ErrorBoundary>
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
      </ErrorBoundary>
    </div>
  );
}
