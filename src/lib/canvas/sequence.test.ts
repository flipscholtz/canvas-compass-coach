import { describe, expect, it } from "vitest";
import { coachTurn, STEPS, stepQuestion } from "./coach";
import { balanceFlags, INTERVIEW_ORDER } from "./sequence";
import { emptyCanvas } from "./types";

describe("recommended canvas sequence", () => {
  it("visits blocks in the recommended order", () => {
    const order = STEPS.map((s) => s.block).filter((b, i, a) => b && a.indexOf(b) === i);
    expect(order).toEqual(["segments", "valueProps", "channels", "relationships", "revenue", "keyResources", "keyActivities", "keyPartners", "costs"]);
    expect(INTERVIEW_ORDER).toEqual(order);
  });
  it("asks about jobs, pains and gains before the value proposition", () => {
    const vp = STEPS.findIndex((s) => s.block === "valueProps");
    expect(STEPS.slice(0, vp).filter((s) => s.profile).map((s) => s.profile)).toEqual(["job", "pain", "gain"]);
  });
  it("explains how Channels builds on earlier blocks", () => {
    expect(stepQuestion(STEPS.findIndex((s) => s.block === "channels"))).toContain("Now that we know who you serve and what you offer them");
  });
  it("recommends going back before costs, but allows an override", () => {
    const r = coachTurn(emptyCanvas(), 2, "Can we talk about costs?");
    expect(r.nextStep).toBe(2);
    expect(r.reply).toMatch(/go back first/);
    const o = coachTurn(emptyCanvas(), 2, "Let's go to costs anyway");
    expect(STEPS[o.nextStep]!.block).toBe("costs");
  });
  it("flags empty and much thinner blocks", () => {
    const c = emptyCanvas();
    c.segments = [1, 2, 3].map((n) => ({ id: `${n}`, text: `s${n}`, status: "hypothesis" as const }));
    c.valueProps = [{ id: "v", text: "v", status: "hypothesis" }];
    expect(balanceFlags(c, "channels")).toEqual({ empty: ["channels"], thin: ["valueProps"] });
  });
});
