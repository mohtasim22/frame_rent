import { NavLink, Outlet } from "react-router";

const TABS = [
  { to: "/admin", label: "Today", end: true },
  { to: "/admin/bookings", label: "Bookings", end: false },
  { to: "/admin/inventory", label: "Inventory", end: false },
  { to: "/admin/occupancy", label: "Occupancy", end: false },
];

export function AdminLayout() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10">
      <nav className="mb-8 flex gap-1 rounded-lg border p-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-muted font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </section>
  );
}
