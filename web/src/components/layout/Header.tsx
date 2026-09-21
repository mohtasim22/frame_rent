import { Link, useNavigate } from "react-router";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHealth } from "@/hooks/useHealth";
import { useCartCount } from "@/store/cart";
import { signOut, useSession } from "@/lib/auth-client";

export function Header() {
  const health = useHealth();
  const cartCount = useCartCount();
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link to="/" className="font-semibold tracking-tight">
          FrameRent
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
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
            className="flex items-center gap-1.5"
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
          >
            <ShoppingCart className="size-4" aria-hidden="true" />
            {cartCount}
          </Link>

          {isPending ? null : session ? (
            <>
              <Link to="/rentals" className="underline-offset-4 hover:underline">
                My rentals
              </Link>

              {session.user.role === "ADMIN" && (
                <Link to="/admin" className="underline-offset-4 hover:underline">
                  Admin
                </Link>
              )}

              <button
                type="button"
                className="text-muted-foreground underline-offset-4 hover:underline"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/sign-in" className="underline-offset-4 hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
