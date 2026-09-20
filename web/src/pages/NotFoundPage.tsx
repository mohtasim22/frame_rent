import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="text-sm font-mono text-muted-foreground">404</p>
      <h1 className="mt-2 text-xl font-semibold">That page doesn't exist</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The link may be out of date, or the address may have a typo.
      </p>
      <Link to="/" className="mt-6 inline-block text-sm underline underline-offset-4">
        Browse the catalogue
      </Link>
    </div>
  );
}
