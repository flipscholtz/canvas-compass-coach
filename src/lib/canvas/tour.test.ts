import { describe, expect, it } from "vitest";
import { shouldShowTour } from "./tour";

describe("account first-load tour", () => {
  it("shows the tour for new or reset accounts", () => {
    expect(shouldShowTour(false)).toBe(true);
    expect(shouldShowTour(undefined)).toBe(true);
    expect(shouldShowTour(null)).toBe(true);
  });
  it("does not automatically show a completed tour", () => {
    expect(shouldShowTour(true)).toBe(false);
  });
});