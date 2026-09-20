import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * A cart line is one product for one date range.
 * The same product can appear twice with different dates.
 *
 * Prices here are a SNAPSHOT for display only — the server recomputes
 * every total from the database when the booking is created (F3).
 */

export type CartLine = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  dailyRateCents: number;
  weeklyRateCents: number | null;
  depositCents: number;
  start: string;
  end: string;
};

export type NewCartLine = Omit<CartLine, "id">;

type CartState = {
  lines: CartLine[];
  addLine: (line: NewCartLine) => string;
  removeLine: (id: string) => void;
  updateDates: (id: string, start: string, end: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

      addLine: (line) => {
        // Same product, same dates, twice — almost always a double click.
        const existing = get().lines.find(
          (candidate) =>
            candidate.slug === line.slug &&
            candidate.start === line.start &&
            candidate.end === line.end,
        );
        if (existing) return existing.id;

        const id = crypto.randomUUID();
        set((state) => ({ lines: [...state.lines, { ...line, id }] }));
        return id;
      },

      removeLine: (id) =>
        set((state) => ({ lines: state.lines.filter((line) => line.id !== id) })),

      updateDates: (id, start, end) =>
        set((state) => ({
          lines: state.lines.map((line) =>
            line.id === id ? { ...line, start, end } : line,
          ),
        })),

      clear: () => set({ lines: [] }),
    }),
    {
      name: "framerent-cart",
      version: 1,
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);

/** Primitive selectors — safe to call directly. */
export const useCartCount = () => useCartStore((state) => state.lines.length);
