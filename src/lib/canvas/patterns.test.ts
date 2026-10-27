import { describe, expect, it } from "vitest";
import { emptyCanvas, type BlockId } from "./types";
import { suggestPattern, filledBlocks } from "./patterns";

const fill = (e: Partial<Record<BlockId, string>>) => {
  const c = emptyCanvas();
  for (const [b, t] of Object.entries(e)) c[b as BlockId] = [{ id: b, text: t!, status: "hypothesis" }];
  return c;
};

describe("suggestPattern", () => {
  it("detects freemium as FREE and suggests an alternative with blocks to change", () => {
    const r = suggestPattern(fill({ revenue: "Freemium: premium upgrade at R99", valueProps: "Free practice quizzes", segments: "Learners", channels: "App", costs: "Hosting" }));
    expect(r.match).toBe("free");
    expect(r.evidenceBlocks).toContain("revenue");
    expect(r.alternative).not.toBe("free");
    expect(r.changes.length).toBeGreaterThan(0);
  });
  it("says none fits when signals are absent", () => {
    const r = suggestPattern(fill({ segments: "Parents", valueProps: "Weekly tutoring", channels: "Schools", revenue: "R250 per month", costs: "Tutor pay" }));
    expect(r.match).toBeNull();
  });
  it("counts filled blocks", () => {
    expect(filledBlocks(fill({ segments: "a", revenue: "b" }))).toHaveLength(2);
  });
});
