import { describe, expect, it } from "vitest";
import {
  canTransition,
  isOverdue,
  lateFeeCents,
  nextStatuses,
} from "./lifecycle";

describe("canTransition", () => {
  it("walks the happy path", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "PICKED_UP")).toBe(true);
    expect(canTransition("PICKED_UP", "RETURNED")).toBe(true);
  });

  it("refuses to skip a step", () => {
    expect(canTransition("PENDING", "PICKED_UP")).toBe(false);
    expect(canTransition("PENDING", "RETURNED")).toBe(false);
    expect(canTransition("CONFIRMED", "RETURNED")).toBe(false);
  });

  it("refuses to go backwards", () => {
    expect(canTransition("PICKED_UP", "CONFIRMED")).toBe(false);
    expect(canTransition("RETURNED", "PICKED_UP")).toBe(false);
  });

  it("treats RETURNED and CANCELLED as terminal", () => {
    expect(nextStatuses("RETURNED")).toHaveLength(0);
    expect(nextStatuses("CANCELLED")).toHaveLength(0);
  });

  it("will not cancel gear that has already gone out", () => {
    expect(canTransition("PICKED_UP", "CANCELLED")).toBe(false);
  });

  it("lets an overdue rental come back", () => {
    expect(canTransition("OVERDUE", "RETURNED")).toBe(true);
  });
});

describe("isOverdue", () => {
  it("is not overdue on the last day — ranges are inclusive", () => {
    expect(isOverdue("PICKED_UP", "2026-10-09", "2026-10-09")).toBe(false);
  });

  it("is overdue the day after", () => {
    expect(isOverdue("PICKED_UP", "2026-10-09", "2026-10-10")).toBe(true);
  });

  it("only applies to gear that is actually out", () => {
    expect(isOverdue("CONFIRMED", "2026-10-09", "2026-11-01")).toBe(false);
    expect(isOverdue("RETURNED", "2026-10-09", "2026-11-01")).toBe(false);
  });
});

describe("lateFeeCents", () => {
  it("charges nothing when returned on time or early", () => {
    expect(lateFeeCents(8500, "2026-10-09", "2026-10-09", 50000)).toBe(0);
    expect(lateFeeCents(8500, "2026-10-09", "2026-10-07", 50000)).toBe(0);
  });

  it("charges a day's rate per day late", () => {
    expect(lateFeeCents(8500, "2026-10-09", "2026-10-12", 50000)).toBe(25500);
  });

  it("never exceeds the deposit", () => {
    expect(lateFeeCents(8500, "2026-10-09", "2026-12-09", 50000)).toBe(50000);
  });
});
