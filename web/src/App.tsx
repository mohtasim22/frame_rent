import { cn } from "@/lib/utils";
import { useHealth } from "@/hooks/useHealth";
import { GearListPage } from "@/pages/GearListPage";
import { Link, Route, Routes } from "react-router";
import { GearDetailPage } from "@/pages/GearDetailPage";
import { ErrorBoundary } from "./components/states/ErrorBoundry";
import { NotFoundPage } from "./pages/NotFoundPage";
import { useCartCount } from "./store/cart";
import { ShoppingCart } from "lucide-react";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { BookingConfirmationPage } from "./pages/BookingConfirmationPage";

export default function App() {
  const health = useHealth();
  const cartCount = useCartCount();

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="font-semibold tracking-tight">
            FrameRent
          </Link>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  "size-2 rounded-full",
                  health.isSuccess
                    ? "bg-emerald-500"
                    : health.isError
                      ? "bg-destructive"
                      : "bg-muted-foreground/40",
                )}
              />
              {health.isSuccess
                ? `API up ${Math.round(health.data.uptime)}s`
                : health.isError
                  ? "API unreachable"
                  : "checking…"}
            </span>
            <Link
              to="/cart"
              className="flex items-center gap-1.5 text-sm"
              aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
            >
              <ShoppingCart className="size-4" aria-hidden="true" />
              {cartCount}
            </Link>
          </div>
        </div>
      </header>

      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<GearListPage />} />
          <Route path="/gear/:slug" element={<GearDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route
            path="/booking/:reference"
            element={<BookingConfirmationPage />}
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}
