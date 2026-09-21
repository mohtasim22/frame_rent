import { Link } from "react-router";
import {
  Aperture,
  CalendarCheck,
  Camera,
  Lightbulb,
  Mic,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GearCard } from "@/components/gear/GearCard";
import { cn } from "@/lib/utils";
import { useGear } from "@/hooks/useGear";

const CATEGORIES = [
  { slug: "bodies", label: "Camera bodies", icon: Camera },
  { slug: "lenses", label: "Lenses", icon: Aperture },
  { slug: "lighting", label: "Lighting", icon: Lightbulb },
  { slug: "audio", label: "Audio", icon: Mic },
  { slug: "support", label: "Support", icon: Sparkles },
];

const STEPS = [
  {
    icon: CalendarCheck,
    title: "Pick your dates",
    body: "The calendar shows real availability, unit by unit — not a guess, and not a form that emails somebody.",
  },
  {
    icon: ShieldCheck,
    title: "Reserve it",
    body: "A specific body or lens is assigned to you the moment you book. Nothing is double-booked, ever.",
  },
  {
    icon: Truck,
    title: "Collect and shoot",
    body: "Pay at pickup, bring photo ID. Your deposit comes back when the gear does.",
  },
];

export function HomePage() {
  const featured = useGear({ perPage: 4, sort: "newest" });

  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b">
        {/* Two soft washes of the brand hue. Decorative only, so hidden from
            assistive tech and non-interactive. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute -left-32 -top-40 size-[34rem] rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute -right-24 top-24 size-[26rem] rounded-full bg-brand/10 blur-3xl" />
        </div>

        <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand-foreground">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Same-week availability across Dublin
          </span>

          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
            Great glass,
            <span className="text-brand-ink"> rented by the day.</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Cinema-grade cameras, fast primes and lighting kits — booked in
            under a minute, with availability you can actually trust.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/gear"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-brand text-brand-foreground hover:bg-brand/90",
              )}
            >
              Browse the catalogue
            </Link>
            <Link
              to="/gear?category=lenses"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Just show me lenses
            </Link>
          </div>

          {/* The product count comes from the API, not a number typed into the
              markup that quietly goes stale the next time stock changes. */}
          <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              [featured.data?.meta?.total?.toString() ?? "—", "products"],
              ["Per unit", "availability"],
              ["1 day", "turnaround"],
              ["€0", "until pickup"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="text-2xl font-semibold tracking-tight">
                  {value}
                </dt>
                <dd className="mt-0.5 text-sm text-muted-foreground">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------------------------------------------------- categories */}
      <section className="mx-auto w-full max-w-6xl px-6 py-14">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Browse by kind
        </h2>

        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map(({ slug, label, icon: Icon }) => (
            <li key={slug}>
              <Link
                to={`/gear?category=${slug}`}
                className="group flex h-full flex-col justify-between gap-6 rounded-xl border bg-card p-4 transition-colors hover:border-brand/50 hover:bg-brand/5"
              >
                <Icon
                  className="size-6 text-muted-foreground transition-colors group-hover:text-brand-ink"
                  aria-hidden="true"
                />
                <span className="font-medium">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------ featured */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Newest in the fleet
          </h2>
          <Link
            to="/gear"
            className="text-sm underline underline-offset-4 hover:text-brand-ink"
          >
            See everything
          </Link>
        </div>

        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.isPending &&
            [0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 w-full rounded-xl" />
            ))}

          {featured.isSuccess &&
            featured.data.data.map((item) => (
              <GearCard key={item.id} item={item} />
            ))}
        </div>

        {/* A failed fetch here must not take the landing page down — the hero
            and the category links are still useful without it. */}
        {featured.isError && (
          <p className="mt-4 text-sm text-muted-foreground">
            Couldn&rsquo;t load the newest gear just now.{" "}
            <Link to="/gear" className="underline underline-offset-4">
              Browse the full catalogue
            </Link>
            .
          </p>
        )}
      </section>

      {/* -------------------------------------------------- how it works */}
      <section className="border-y bg-secondary/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            How renting works
          </h2>

          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <li key={title}>
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand/15 text-brand-ink">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-medium">
                  <span className="text-muted-foreground">{index + 1}. </span>
                  {title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------ closing */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">
          Got a shoot coming up?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Check what&rsquo;s free on your dates. It takes about thirty seconds
          and costs nothing until you collect.
        </p>
        <Link
          to="/gear"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-7 bg-brand text-brand-foreground hover:bg-brand/90",
          )}
        >
          Check availability
        </Link>
      </section>
    </>
  );
}
