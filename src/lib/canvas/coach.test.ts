import { describe, expect, it } from "vitest";
import { coachTurn, coherenceFlags, vaguenessProbe } from "./coach";
import { emptyCanvas } from "./types";

describe("Socratic coach rules", () => {
  it("rejects 'Small businesses' as a vague segment", () => {
    expect(vaguenessProbe("segments", "Small businesses")).toMatch(/vertical/i);
  });

  it("does not advance when the segment is vague", () => {
    const r = coachTurn(emptyCanvas(), 2, "Small businesses");
    expect(r.nextStep).toBe(1);
    expect(r.additions).toHaveLength(0);
  });

  it("adds specific segment answers as hypotheses and advances", () => {
    const r = coachTurn(emptyCanvas(), 2, "Operations managers at Dutch dental clinics with 5-20 staff");
    expect(r.nextStep).toBe(3);
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

import { extractAssumptions, pickRiskiest, stripBelievePrefix, testCardFromAssumption } from "./assumptions";
describe("assumption extraction & riskiest assumption", () => {
  it("extracts 1–2 assumptions with the block's lens first", () => {
    const a = extractAssumptions("valueProps", "Real-time AI diagnostics");
    expect(a.length).toBeGreaterThanOrEqual(1);
    expect(a.length).toBeLessThanOrEqual(2);
    expect(a[0]!.lens).toBe("desirability");
    expect(a[1]!.lens).toBe("feasibility");
  });
  it("tags revenue statements as viability", () => {
    expect(extractAssumptions("revenue", "Annual licence")[0]!.lens).toBe("viability");
  });
  it("coach turn surfaces assumptions from the founder's answer", () => {
    const r = coachTurn(emptyCanvas(), 3, "Cut audit preparation time from months to days");
    expect(r.assumptions.length).toBeGreaterThan(0);
  });
  it("picks an untested customer-segment assumption over a cost one and skips validated items", () => {
    const c = emptyCanvas();
    c.costs = [{ id: "c", text: "Cloud hosting", status: "hypothesis" }];
    c.segments = [
      { id: "v", text: "Validated segment", status: "validated" },
      { id: "s", text: "Dental clinic managers", status: "hypothesis" },
    ];
    const pick = pickRiskiest(c, []);
    expect(pick?.item.id).toBe("s");
    const card = testCardFromAssumption(pick!);
    expect(card.hypothesis.startsWith("We believe that")).toBe(true);
    expect(card.experiment.startsWith("To verify that, we will")).toBe(true);
    expect(card.metric.startsWith("And measure")).toBe(true);
    expect(card.criteria.startsWith("We are right if")).toBe(true);
    expect(pickRiskiest(c, [card])?.assumption.text).not.toBe(pick!.assumption.text);
  });
  it("never doubles the 'We believe that' prefix on assumptions or test cards", () => {
    expect(stripBelievePrefix("We believe that parents will pay R250")).toBe("parents will pay R250");
    expect(stripBelievePrefix("we believe that parents will pay R250")).toBe("parents will pay R250");
    expect(stripBelievePrefix("schools will promote the offer")).toBe("schools will promote the offer");
    const pick = pickRiskiest(
      emptyCanvas(),
      [],
    ) ?? {
      block: "revenue" as const,
      item: { id: "x", text: "Parents pay R250/month", status: "hypothesis" as const },
      assumption: { lens: "viability" as const, text: "We believe that parents will pay R250/month" },
    };
    const card = testCardFromAssumption(pick);
    expect(card.hypothesis).toBe("We believe that parents will pay R250/month.");
  });
});

import { extractItems } from "./coach";
it("keeps relative clauses attached to their segment", () => {
  expect(extractItems("Practice managers at dental clinics, who own the admin budget")).toEqual([
    "Practice managers at dental clinics, who own the admin budget",
  ]);
});

import { useCanvasStore } from "./store";
describe("changelog & decision log", () => {
  it("logs additions, status decisions and version commits with author and version", () => {
    const st = useCanvasStore.getState();
    st.reset();
    st.setAuthor("Ana");
    st.addItems([{ block: "segments", text: "Vet clinic owners" }]);
    const item = useCanvasStore.getState().versions[0]!.canvas.segments[0]!;
    useCanvasStore.getState().updateItem("segments", item.id, { status: "validated" });
    useCanvasStore.getState().commitVersion("v2.0 · Vet pivot", "Dentists had no budget");
    const log = useCanvasStore.getState().log;
    expect(log.map((e) => e.category)).toEqual(["version", "status", "added"]);
    expect(log[0]!.kind).toBe("decision");
    expect(log[0]!.rationale).toBe("Dentists had no budget");
    expect(log[1]!.kind).toBe("decision");
    expect(log[2]!.kind).toBe("change");
    expect(log[2]!.author).toBe("Ana");
    expect(log[2]!.version).toBe("v1.0");
  });
  it("reset clears the log", () => {
    useCanvasStore.getState().addDecision({ summary: "x", rationale: "y" });
    useCanvasStore.getState().reset();
    expect(useCanvasStore.getState().log).toHaveLength(0);
  });
});

describe("scenarios", () => {
  it("seeds two demo scenarios and round-trips save/load", () => {
    const st = useCanvasStore.getState();
    expect(st.scenarios.map((x) => x.name)).toEqual(["VeriTrace · Industrial Carbon ESG SaaS", "LearnLoop · Matric Exam-Prep Tutoring"]);
    st.newScenario("Mine");
    useCanvasStore.getState().saveScenario("Mine");
    const id = useCanvasStore.getState().scenarioId!;
    useCanvasStore.getState().loadScenario(useCanvasStore.getState().scenarios.find((x) => x.name.startsWith("LearnLoop"))!.id);
    expect(useCanvasStore.getState().versions).toHaveLength(2);
    useCanvasStore.getState().loadScenario(id);
    expect(useCanvasStore.getState().scenarioName).toBe("Mine");
  });
});

import { priceFacts, STEPS } from "./coach";
describe("tier-1 fixes", () => {
  it("captures an off-step price into Revenue Streams", () => {
    expect(priceFacts("Parents would pay R2000 a month. They hate traffic.")).toEqual(["Parents would pay R2000 a month"]);
    const r = coachTurn(emptyCanvas(), 0, "Parents of matric learners; they'd pay R2000 a month");
    expect(r.additions.some((a) => a.block === "revenue" && a.text.includes("R2000"))).toBe(true);
  });
  it("opens with customer segment, then asks for evidence before features", () => {
    expect(STEPS[0]!.question).toContain("Who is this for");
    expect(STEPS[1]!.question).toContain("How do you know");
  });
  it("stage only moves forward", () => {
    useCanvasStore.getState().newScenario();
    useCanvasStore.getState().setProgress(5, 4);
    useCanvasStore.getState().setProgress(0, 1);
    expect(useCanvasStore.getState().stage).toBe(4);
  });
  it("restores deleted demo scenarios", () => {
    const st = useCanvasStore.getState();
    st.scenarios.forEach((x) => st.deleteScenario(x.id));
    useCanvasStore.getState().restoreDemos();
    expect(useCanvasStore.getState().scenarios.filter((x) => x.demo).length).toBe(2);
  });
});
