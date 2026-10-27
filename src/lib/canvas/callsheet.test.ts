import { describe, it, expect } from "vitest";
import { buildCallSheet, listAssumptions } from "./callsheet";
import { emptyCanvas } from "./types";

describe("call sheet", () => {
  it("skips tested items and uses the segment as persona", () => {
    const c = emptyCanvas();
    c.segments.push({ id: "s", text: "Grade 12 parents in Gauteng", status: "hypothesis" });
    c.revenue.push({ id: "r", text: "R250 per month", status: "validated" });
    const opts = listAssumptions(c);
    expect(opts.every((o) => o.block !== "revenue")).toBe(true);
    const sheet = buildCallSheet(c, opts);
    expect(sheet.persona.who).toBe("Grade 12 parents in Gauteng");
    expect(sheet.sections).toHaveLength(opts.length);
  });
});
