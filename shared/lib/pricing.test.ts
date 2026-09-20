import { describe, expect, it } from "vitest";
import { quoteRental, rentalDays, type RentalRates } from "./pricing";

const r5: RentalRates = {
  dailyRateCents: 8500,
  weeklyRateCents: 51000,
  depositCents: 50000,
};

describe("rentalDays", () => {
  it("counts a single day as one", () => {
    expect(rentalDays("2026-03-06", "2026-03-06")).toBe(1);
  });

  it("is inclusive on both ends", () => {
    expect(rentalDays("2026-03-06", "2026-03-09")).toBe(4);
  });

  it("counts across a month boundary", () => {
    expect(rentalDays("2026-03-30", "2026-04-02")).toBe(4);
  });

  it("counts across a year boundary", () => {
    expect(rentalDays("2026-12-30", "2027-01-02")).toBe(4);
  });
});

describe("quoteRental", () => {
  it("charges the daily rate below a week", () => {
    expect(quoteRental(r5, 3).subtotalCents).toBe(25500);
  });

  it("charges the weekly rate at exactly seven days", () => {
    const quote = quoteRental(r5, 7);
    expect(quote.weeks).toBe(1);
    expect(quote.extraDays).toBe(0);
    expect(quote.subtotalCents).toBe(51000);
  });

  it("adds leftover days at the daily rate", () => {
    const quote = quoteRental(r5, 9);
    expect(quote.weeks).toBe(1);
    expect(quote.extraDays).toBe(2);
    expect(quote.subtotalCents).toBe(51000 + 2 * 8500);
  });

  it("charges two weeks for fourteen days", () => {
    expect(quoteRental(r5, 14).subtotalCents).toBe(102000);
  });

  it("falls back to the daily rate when there is no weekly rate", () => {
    const noWeekly: RentalRates = { ...r5, weeklyRateCents: null };
    expect(quoteRental(noWeekly, 10).subtotalCents).toBe(85000);
  });

  it("never charges more than the plain daily rate", () => {
    const badRates: RentalRates = {
      dailyRateCents: 1000,
      weeklyRateCents: 9000, // more than 7 × daily
      depositCents: 0,
    };
    expect(quoteRental(badRates, 7).subtotalCents).toBe(7000);
  });

  it("adds the deposit to the total but not the subtotal", () => {
    const quote = quoteRental(r5, 2);
    expect(quote.subtotalCents).toBe(17000);
    expect(quote.totalCents).toBe(17000 + 50000);
  });

  it("rejects a rental shorter than one day", () => {
    expect(() => quoteRental(r5, 0)).toThrow();
  });
});
