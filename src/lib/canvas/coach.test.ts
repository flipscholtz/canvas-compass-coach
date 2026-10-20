import { describe, expect, it } from "vitest";
import { coachTurn, coherenceFlags, vaguenessProbe } from "./coach";
import { emptyCanvas } from "./types";

describe("Socratic coach rules", () => {
  it("rejects 'Small businesses' as a vague segment", () => {
    expect(vaguenessProbe("segments", "Small businesses")).toMatch(/vertical/i);
  });

  it("does not advance when the segment is vague", () => {
    const r = coachTurn(emptyCanvas(), 1, "Small businesses");
    expect(r.nextStep).toBe(1);
    expect(r.additions).toHaveLength(0);
  });

  it("adds specific segment answers as hypotheses and advances", () => {
    const r = coachTurn(emptyCanvas(), 1, "Operations managers at Dutch dental clinics with 5-20 staff");
    expect(r.nextStep).toBe(2);
    expect(r.additions[0]?.block).toBe("segments");
  });

  it("flags AI value proposition without engineering resources", () => {
    const c = emptyCanvas();
    c.valueProps = [{ id: "1", text: "Real-time AI diagnostics", status: "hypothesis" }];
    c.keyResources = [{ id: "2", text: "Sales team", status: "hypothesis" }];
    expect(coherenceFlags(c).some((f) => /Key Resources/.test(f))).toBe(true);
  });
});

import { suggestAssumptions } from "./coach";
describe("synthetic assumptions", () => {
  it("generates 3 assumptions per block using the stated segment", () => {
    const c = emptyCanvas();
    c.segments = [{ id: "1", text: "Dental clinic managers", status: "hypothesis" }];
    const out = suggestAssumptions(c, "revenue");
    expect(out).toHaveLength(3);
    expect(out[0]).toContain("Dental clinic managers");
  });
  it("does not repeat assumptions already on the canvas", () => {
    const c = emptyCanvas();
    const first = suggestAssumptions(c, "costs", 1)[0]!;
    c.costs = [{ id: "x", text: first, status: "hypothesis" }];
    expect(suggestAssumptions(c, "costs")).not.toContain(first);
  });
});

it("ignores co-pilot suggestions when picking the segment to reference", () => {
  const c = emptyCanvas();
  c.segments = [
    { id: "s", text: "Suggested thing", status: "hypothesis", source: "suggested" },
    { id: "r", text: "Dental clinic managers", status: "hypothesis" },
  ];
  expect(suggestAssumptions(c, "revenue")[0]).toContain("Dental clinic managers");
});
