import { Link } from "react-router";
import { Aperture } from "lucide-react";

const BROWSE = [
  { to: "/gear?category=bodies", label: "Camera bodies" },
  { to: "/gear?category=lenses", label: "Lenses" },
  { to: "/gear?category=lighting", label: "Lighting" },
  { to: "/gear?category=audio", label: "Audio" },
  { to: "/gear?category=support", label: "Support" },
  { to: "/gear", label: "Everything" },
];

const ACCOUNT = [
  { to: "/rentals", label: "My rentals" },
  { to: "/cart", label: "Cart" },
  { to: "/sign-in", label: "Sign in" },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t bg-secondary/40">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <Aperture className="size-5 text-brand-ink" aria-hidden="true" />
            FrameRent
          </span>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Professional cameras, lenses and lighting, rented by the day. Every
            item is tracked as an individual unit, so when we say it&rsquo;s
            available on your dates, it is.
          </p>
        </div>

        <nav aria-labelledby="footer-browse">
          <h2 id="footer-browse" className="text-sm font-medium">
            Browse
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {BROWSE.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-account">
          <h2 id="footer-account" className="text-sm font-medium">
            Your account
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {ACCOUNT.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-5 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} FrameRent — a portfolio project.</p>
          <p>Deposits are refunded on return. Bring photo ID.</p>
        </div>
      </div>
    </footer>
  );
}
