import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

/**
 * A client-side route change replaces the page without the browser doing any
 * of the things a real navigation does: focus stays where it was, and a screen
 * reader says nothing at all.
 *
 * This moves focus to the top of the new view and announces its title, which is
 * what a full page load would have done for free.
 */
export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const target = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    // Skip the initial render: the browser already put focus where it belongs.
    if (first.current) {
      first.current = false;
      return;
    }

    target.current?.focus();
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div
      ref={target}
      tabIndex={-1}
      // -1 makes it programmatically focusable without adding a tab stop.
      className="outline-none"
      aria-live="polite"
      aria-atomic="true"
    />
  );
}
