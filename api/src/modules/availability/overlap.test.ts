import { describe, expect, it } from "vitest";
import { overlaps, type DateRange } from "./overlap";

const range = (start: string, end: string): DateRange => ({ start, end });

/** The existing booking every case is measured against: 6th–9th March. */
const booked = range("2026-03-06", "2026-03-09");

describe("overlaps", () => {
  it("returns true for the exact same range", () => {
    expect(overlaps(booked, range("2026-03-06", "2026-03-09"))).toBe(true);
  });

  it("returns true when the request starts before and ends inside", () => {
    expect(overlaps(booked, range("2026-03-04", "2026-03-07"))).toBe(true);
  });

  it("returns true when the request starts inside and ends after", () => {
    expect(overlaps(booked, range("2026-03-08", "2026-03-12"))).toBe(true);
  });

  it("returns true when the request sits entirely inside", () => {
    expect(overlaps(booked, range("2026-03-07", "2026-03-08"))).toBe(true);
  });

  it("returns true when the request entirely contains the booking", () => {
    expect(overlaps(booked, range("2026-03-01", "2026-03-31"))).toBe(true);
  });

  it("returns true when the request ends on the booking's first day", () => {
    expect(overlaps(booked, range("2026-03-01", "2026-03-06"))).toBe(true);
  });

  it("returns true when the request starts on the booking's last day", () => {
    expect(overlaps(booked, range("2026-03-09", "2026-03-12"))).toBe(true);
  });

  it("returns false when the request ends the day before", () => {
    expect(overlaps(booked, range("2026-03-01", "2026-03-05"))).toBe(false);
  });

  it("returns false when the request starts the day after", () => {
    expect(overlaps(booked, range("2026-03-10", "2026-03-14"))).toBe(false);
  });

  it("handles a single-day request inside the booking", () => {
    expect(overlaps(booked, range("2026-03-07", "2026-03-07"))).toBe(true);
  });

  it("handles a single-day request outside the booking", () => {
    expect(overlaps(booked, range("2026-03-05", "2026-03-05"))).toBe(false);
  });

  it("is symmetric — argument order does not matter", () => {
    const request = range("2026-03-08", "2026-03-12");
    expect(overlaps(booked, request)).toBe(overlaps(request, booked));
  });

  it("works across a month boundary", () => {
    expect(
      overlaps(range("2026-01-28", "2026-02-02"), range("2026-02-01", "2026-02-05")),
    ).toBe(true);
  });

  it("works across a year boundary", () => {
    expect(
      overlaps(range("2025-12-30", "2026-01-02"), range("2026-01-01", "2026-01-05")),
    ).toBe(true);
  });
});
