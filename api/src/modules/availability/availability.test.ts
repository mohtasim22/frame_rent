import { describe, expect, it } from "vitest";
import { findFreeUnitId, unavailableDays } from "./availability";
import type { DateRange } from "./overlap";
import { padRange } from "./dates";

const range = (start: string, end: string): DateRange => ({ start, end });

describe("unavailableDays", () => {
  it("blocks nothing while at least one unit stays free", () => {
    // RF50-01 busy 2–6, RF50-02 busy 5–9, RF50-03 busy 1–3 and 11–12.
    const units = [
      [range("2026-03-02", "2026-03-06")],
      [range("2026-03-05", "2026-03-09")],
      [range("2026-03-01", "2026-03-03"), range("2026-03-11", "2026-03-12")],
    ];

    expect(unavailableDays(units, "2026-03-01", "2026-03-12")).toEqual([]);
  });

  it("blocks only the days on which every unit is busy", () => {
    const units = [
      [range("2026-03-01", "2026-03-05")],
      [range("2026-03-01", "2026-03-05")],
      [range("2026-03-03", "2026-03-07")],
    ];

    expect(unavailableDays(units, "2026-03-01", "2026-03-07")).toEqual([
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
    ]);
  });

  it("blocks every day when all units are booked for the window", () => {
    const units = [
      [range("2026-03-01", "2026-03-10")],
      [range("2026-03-01", "2026-03-10")],
    ];

    expect(unavailableDays(units, "2026-03-04", "2026-03-06")).toEqual([
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
    ]);
  });

  it("blocks nothing when no unit has any booking", () => {
    expect(unavailableDays([[], []], "2026-03-01", "2026-03-03")).toEqual([]);
  });

  it("blocks everything when the product has no bookable units", () => {
    expect(unavailableDays([], "2026-03-01", "2026-03-03")).toEqual([
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
    ]);
  });

  it("treats a single free day between two bookings as available", () => {
    const units = [[range("2026-03-01", "2026-03-05"), range("2026-03-07", "2026-03-10")]];

    expect(unavailableDays(units, "2026-03-05", "2026-03-07")).toEqual([
      "2026-03-05",
      "2026-03-07",
    ]);
  });
  it("keeps a unit busy through its turnaround buffer", () => {
    const booked = padRange(range("2026-03-06", "2026-03-09"), 1);

    expect(unavailableDays([[booked]], "2026-03-04", "2026-03-12")).toEqual([
      "2026-03-05",
      "2026-03-06",
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
    ]);
  });
});

describe("findFreeUnitId", () => {
  const requested = range("2026-03-06", "2026-03-09");

  it("returns null when the product has no units", () => {
    expect(findFreeUnitId([], requested)).toBeNull();
  });

  it("returns the only unit when it is free", () => {
    expect(findFreeUnitId([{ id: "u1", ranges: [] }], requested)).toBe("u1");
  });

  it("returns null when the only unit is busy", () => {
    const units = [{ id: "u1", ranges: [range("2026-03-08", "2026-03-11")] }];
    expect(findFreeUnitId(units, requested)).toBeNull();
  });

  it("skips busy units and returns the first free one", () => {
    const units = [
      { id: "u1", ranges: [range("2026-03-01", "2026-03-07")] },
      { id: "u2", ranges: [range("2026-03-20", "2026-03-22")] },
      { id: "u3", ranges: [] },
    ];
    expect(findFreeUnitId(units, requested)).toBe("u2");
  });

  it("is deterministic — the same input always allocates the same unit", () => {
    const units = [
      { id: "u1", ranges: [range("2026-03-06", "2026-03-06")] },
      { id: "u2", ranges: [] },
      { id: "u3", ranges: [] },
    ];
    expect(findFreeUnitId(units, requested)).toBe("u2");
    expect(findFreeUnitId(units, requested)).toBe("u2");
  });

  it("treats a booking that only touches the last day as a conflict", () => {
    const units = [{ id: "u1", ranges: [range("2026-03-09", "2026-03-12")] }];
    expect(findFreeUnitId(units, requested)).toBeNull();
  });

  it("allocates a unit whose bookings sit either side of the request", () => {
    const units = [
      { id: "u1", ranges: [range("2026-03-01", "2026-03-05"), range("2026-03-10", "2026-03-14")] },
    ];
    expect(findFreeUnitId(units, requested)).toBe("u1");
  });
});

