import { describe, expect, it } from "vitest";
import { changedNotes, questionBlock } from "./useCanvasFeedback";
import { emptyCanvas } from "@/lib/canvas/types";

describe("canvas presentation feedback", () => {
  it("finds added and edited notes without changing the canvas", () => {
    const before = emptyCanvas();
    before.revenue = [{ id: "price", text: "R250", status: "hypothesis" }];
    const after = { ...before, revenue: [{ ...before.revenue[0], id: "price", text: "R350", status: "hypothesis" as const }], segments: [{ id: "customer", text: "Homeowners", status: "hypothesis" as const }] };
    expect(changedNotes(before, after)).toEqual([{ block: "segments", id: "customer", added: true }, { block: "revenue", id: "price", added: false }]);
    expect(before.revenue[0]?.text).toBe("R250");
    expect(changedNotes(after, after)).toEqual([]);
  });
  it("uses the last coach question rather than incidental reflection words", () => {
    expect(questionBlock("Your costs matter. Which homeowners could you interview?", "costs")).toBe("segments");
    expect(questionBlock("What price would you test?", "segments")).toBe("revenue");
    expect(questionBlock("What would you try next?", "channels")).toBe("channels");
  });
});