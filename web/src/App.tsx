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

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}
