import { Link, useNavigate } from "react-router";
import { Aperture, ShoppingCart } from "lucide-react";
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
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <Aperture className="size-6 text-brand-ink" aria-hidden="true" />
          FrameRent
        </Link>

        <Link
          to="/gear"
          className="mr-auto hidden text-[0.9375rem] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline sm:block"
        >
          Catalogue
        </Link>

        <div className="flex items-center gap-5 text-[0.9375rem]">
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
            className="flex items-center gap-1.5 underline-offset-4 hover:underline"
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
          >
            <ShoppingCart className="size-4" aria-hidden="true" />
            <span
              className={
                cartCount > 0
                  ? "rounded-full bg-brand px-1.5 text-xs font-medium text-brand-foreground"
                  : "text-muted-foreground"
              }
            >
              {cartCount}
            </span>
          </Link>

          {isPending ? null : session ? (
            <>
              <Link
                to="/rentals"
                className="underline-offset-4 hover:underline"
              >
                My rentals
              </Link>

              {session.user.role === "ADMIN" && (
                <Link
                  to="/admin"
                  className="underline-offset-4 hover:underline"
                >
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
            <Link
              to="/sign-in"
              className="font-semibold underline-offset-4 hover:text-brand-ink hover:underline"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
