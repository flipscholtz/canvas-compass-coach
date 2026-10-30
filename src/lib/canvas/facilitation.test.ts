import { describe, expect, it } from "vitest";
import { coachTurn } from "./coach";
import { coachHelp } from "./help";
import { ensureFacilitatorQuestion } from "./facilitation";
import { emptyCanvas, type ChatMessage } from "./types";

describe("facilitator turn rules", () => {
  it("repairs live replies missing a question or containing several", () => {
    for (const text of ["You mentioned homeowners.", "Who pays? How much?"]) {
      const reply = ensureFacilitatorQuestion(text, "Domestic cleaning for homeowners", 1);
      expect(reply.match(/\?/g)).toHaveLength(1);
      expect(reply.endsWith("?")).toBe(true);
    }
  });
  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])("ends step %i with exactly one question in fewer than 80 words", (step) => {
    const r = coachTurn(emptyCanvas(), step, "Homeowners hire reliable domestic cleaners weekly");
    expect(r.reply.match(/\?/g)).toHaveLength(1);
    expect(r.reply.trim().endsWith("?")).toBe(true);
    expect(r.reply.split(/\s+/).length).toBeLessThan(80);
  });
  it("drafts a partial answer without advancing or inventing missing details", () => {
    const r = coachTurn(emptyCanvas(), 2, "Homeowners");
    expect(r.nextStep).toBe(2);
    expect(r.additions.map((a) => a.text)).toEqual(["Homeowners"]);
  });
  it("waits for consent at a completed stage then moves exactly one stage", () => {
    const r = coachTurn(emptyCanvas(), 1, "Three homeowners described hiring cleaners last week");
    expect(r.stage).toBe(1);
    expect(r.nextStep).toBe(1);
    const history: ChatMessage[] = [{ id: "c", role: "coach", text: r.reply }];
    const consent = coachTurn(emptyCanvas(), 1, "yes", history);
    expect(consent.stage).toBe(2);
    expect(consent.nextStep).toBe(2);
    expect(consent.additions).toEqual([]);
    const decline = coachTurn(emptyCanvas(), 1, "not yet", history);
    expect(decline.stage).toBe(1);
    expect(decline.nextStep).toBe(1);
  });
  it.each(["ok", "Can you tell me a joke?", "what do you mean?", "help"])("handles %s without creating venture facts or advancing", (text) => {
    const r = coachTurn(emptyCanvas(), 2, text);
    expect(r.additions).toEqual([]);
    expect(r.nextStep).toBe(2);
    expect(r.reply.match(/\?/g)).toHaveLength(1);
  });
  it("keeps research help concise with one question and no automatic save", () => {
    const r = coachHelp({ text: "Can you help me find some data?", canvas: emptyCanvas(), question: "How many homeowners hire domestic workers?" });
    expect(r?.reply.match(/\?/g)).toHaveLength(1);
    expect(r?.reply.split(/\s+/).length).toBeLessThan(80);
    expect(r?.offer.decision).toBeUndefined();
  });
});