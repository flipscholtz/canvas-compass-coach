import { describe, it, expect } from "vitest";
import { analyzeJourney } from "./journey";
import { emptyCanvas, type CanvasVersion } from "./types";

const v = (id: string, segs: string[], status: "hypothesis" | "invalidated" = "hypothesis"): CanvasVersion => {
  const c = emptyCanvas();
  c.segments = segs.map((t, i) => ({ id: id + i, text: t, status }));
  c.costs = [{ id: id + "c", text: "Cloud hosting", status: "hypothesis" }];
  return { id, label: id, note: "n", createdAt: "", canvas: c };
};

describe("analyzeJourney", () => {
  it("detects a segment pivot and the invalidated hypothesis it dropped", () => {
    const j = analyzeJourney([v("v1", ["Consumers"], "invalidated"), v("v2", ["Retail brands"])]);
    expect(j.transitions[0]!.pivotBlocks).toEqual(["segments"]);
    expect(j.insights.some((i) => i.kind === "learning")).toBe(true);
  });
  it("flags founding hypotheses carried untested through every version", () => {
    const j = analyzeJourney([v("v1", ["A"]), v("v2", ["B"])]);
    expect(j.insights.some((i) => i.kind === "blindspot" && i.block === "costs")).toBe(true);
  });
});
