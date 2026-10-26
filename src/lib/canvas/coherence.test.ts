import { beforeEach, describe, expect, it } from "vitest";
import { analyzeCoherence, coherenceKey } from "./coherence";
import { BLOCK_ORDER, emptyCanvas, type Canvas, type BlockId } from "./types";
import { useCanvasStore } from "./store";

const revenue = "Parents will pay R250 per learner per month for weekly online Mathematics and Physical Sciences tutoring.";
const costs = "The main operating costs will be tutor payments, internet and software subscriptions, learning materials, marketing and administration.";
function tutoring(): Canvas {
  const canvas = emptyCanvas();
  const add = (block: BlockId, text: string) => { canvas[block] = [{ id: block, text, status: "hypothesis" }]; };
  add("segments", "Parents of Grade 10–12 learners in Johannesburg who pay for tutoring");
  add("valueProps", "Weekly online Mathematics and Physical Sciences tutoring to improve exam results");
  add("channels", "School referrals and parent WhatsApp groups");
  add("relationships", "Personal feedback and ongoing parent support");
  add("revenue", revenue);
  add("costs", costs);
  return canvas;
}

describe("local coherence review", () => {
  beforeEach(() => useCanvasStore.getState().reset());
  it("A: reports insufficient information and all nine empty blocks", () => {
    const report = analyzeCoherence(emptyCanvas());
    expect(report.findings.filter((f) => f.id.startsWith("gap-")).map((f) => f.blocks[0]).sort()).toEqual([...BLOCK_ORDER].sort());
    expect(report.findings.find((f) => f.id === "financial")).toBeUndefined();
  });
  it("B: identifies missing tutoring delivery blocks with actual context", () => {
    const report = analyzeCoherence(tutoring());
    for (const block of ["keyResources", "keyActivities", "keyPartners"]) {
      expect(report.findings.find((f) => f.id === `gap-${block}`)?.kind).toBe("missing");
    }
    const delivery = report.findings.find((f) => f.id === "delivery");
    expect(delivery?.entries.some((e) => e.item.text === revenue)).toBe(true);
    expect(delivery?.blocks).toContain("keyActivities");
  });
  it("C: prioritises missing figures for R250 tutoring without calculating a loss", () => {
    const finding = analyzeCoherence(tutoring()).findings[0];
    expect(finding?.id).toBe("financial");
    expect(finding?.kind).toBe("missing");
    expect(finding?.entries.map((e) => e.item.text)).toEqual(expect.arrayContaining([revenue, costs]));
    expect(finding?.why).toContain("expected paying learner numbers");
    expect(finding?.why).toContain("tutor payment rates and other operating expense amounts");
  });
  it("D: changed entries produce changed findings and fingerprints", () => {
    const canvas = tutoring();
    const before = coherenceKey(canvas);
    canvas.costs = [{ id: "costs", text: "Tutor payments R100 per learner per month; fixed software R500 monthly", status: "hypothesis" }];
    canvas.segments.push({ id: "count", text: "40 paying learners", status: "hypothesis" });
    expect(coherenceKey(canvas)).not.toBe(before);
    const financial = analyzeCoherence(canvas).findings.find((f) => f.id === "financial");
    expect(financial?.kind).toBe("potential");
    expect(financial?.entries.map((e) => e.item.text)).not.toContain(costs);
  });
  it("E: does not manufacture a price contradiction or promote hypotheses to confirmed", () => {
    const report = analyzeCoherence(tutoring());
    expect(report.findings.find((f) => f.id === "value-price")?.kind).toBe("potential");
    expect(report.findings.every((f) => ["missing", "potential", "recorded"].includes(f.kind))).toBe(true);
    expect(report.findings.flatMap((f) => f.entries).every((e) => e.item.status === "hypothesis")).toBe(true);
  });
  it("excludes invalidated statements and never changes recorded statuses", () => {
    const canvas = tutoring();
    const item = canvas.revenue[0];
    if (!item) throw new Error("Missing fixture");
    item.status = "invalidated";
    canvas.keyPartners = [{ id: "p", text: "No external partners required", status: "validated" }];
    const original = JSON.stringify(canvas);
    const report = analyzeCoherence(canvas);
    expect(report.findings.find((f) => f.id === "financial")?.entries.some((e) => e.item.text === revenue)).toBe(false);
    expect(report.findings.find((f) => f.id === "evidence")?.entries.find((e) => e.item.id === "p")?.item.status).toBe("validated");
    expect(JSON.stringify(canvas)).toBe(original);
  });
  it("F: repeated checks are idempotent even after another chat message; edits permit a new report", () => {
    const store = useCanvasStore.getState();
    store.addItems([{ block: "revenue", text: revenue }, { block: "costs", text: costs }]);
    expect(store.checkCoherence()).toBe(true);
    store.pushMessage({ role: "user", text: "Thanks" });
    const length = useCanvasStore.getState().messages.length;
    expect(store.checkCoherence()).toBe(false);
    expect(useCanvasStore.getState().messages).toHaveLength(length);
    store.addItems([{ block: "segments", text: "40 paying learners" }]);
    expect(store.checkCoherence()).toBe(true);
    expect(useCanvasStore.getState().messages).toHaveLength(length + 1);
  });
  it("reviews the selected snapshot rather than mixing it with the working canvas", () => {
    const store = useCanvasStore.getState();
    store.addItems([{ block: "revenue", text: revenue }]);
    const snapshot = useCanvasStore.getState().versions[0];
    if (!snapshot) throw new Error("Missing snapshot");
    store.commitVersion("v1.1", "Added costs");
    store.addItems([{ block: "costs", text: costs }]);
    store.setViewing(snapshot.id);
    store.checkCoherence();
    expect(useCanvasStore.getState().messages.at(-1)?.flags?.join(" ")).not.toContain(costs);
    store.setViewing(null);
    store.checkCoherence();
    expect(useCanvasStore.getState().messages.at(-1)?.flags?.join(" ")).toContain(costs);
  });
});