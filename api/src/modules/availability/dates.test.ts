import { describe, expect, it } from "vitest";
import { addDays, eachDay, padRange } from "./dates";

describe("addDays", () => {
  it("adds a day inside a month", () => {
    expect(addDays("2026-03-06", 1)).toBe("2026-03-07");
  });

  it("crosses a month boundary", () => {
    expect(addDays("2026-03-31", 1)).toBe("2026-04-01");
  });

  it("crosses a year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles a leap year", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("handles a non-leap year", () => {
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });

  it("goes backwards", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("returns the same day for zero", () => {
    expect(addDays("2026-03-06", 0)).toBe("2026-03-06");
  });
});

describe("eachDay", () => {
  it("returns a single day when start equals end", () => {
    expect(eachDay("2026-03-06", "2026-03-06")).toEqual(["2026-03-06"]);
  });

  it("is inclusive on both ends", () => {
    expect(eachDay("2026-03-06", "2026-03-09")).toEqual([
      "2026-03-06",
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
    ]);
  });

  it("returns nothing when end is before start", () => {
    expect(eachDay("2026-03-09", "2026-03-06")).toEqual([]);
  });

  it("counts the days in February correctly", () => {
    expect(eachDay("2026-02-01", "2026-02-28")).toHaveLength(28);
  });
});

describe("padRange", () => {
  it("widens both ends by the buffer", () => {
    expect(padRange({ start: "2026-03-06", end: "2026-03-09" }, 1)).toEqual({
      start: "2026-03-05",
      end: "2026-03-10",
    });
  });

  it("widens by more than one day", () => {
    expect(padRange({ start: "2026-03-06", end: "2026-03-09" }, 2)).toEqual({
      start: "2026-03-04",
      end: "2026-03-11",
    });
  });

  it("returns the range unchanged when there is no buffer", () => {
    const range = { start: "2026-03-06", end: "2026-03-09" };
    expect(padRange(range, 0)).toEqual(range);
  });

  it("crosses a month boundary", () => {
    expect(padRange({ start: "2026-03-01", end: "2026-03-31" }, 1)).toEqual({
      start: "2026-02-28",
      end: "2026-04-01",
    });
  });
});
