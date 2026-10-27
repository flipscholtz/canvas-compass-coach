import { extractAssumptions } from "./assumptions";
import { BLOCK_ORDER, BLOCKS, type AssumptionLens, type BlockId, type Canvas } from "./types";

export interface AssumptionOption {
  key: string;
  block: BlockId;
  item: string;
  lens: AssumptionLens;
  text: string;
}

export interface CallSheet {
  goal: string;
  persona: { who: string; mustHave: string[]; avoid: string[] };
  screener: string[];
  opening: string[];
  sections: { assumption: AssumptionOption; questions: string[]; signals: { confirm: string[]; refute: string[] } }[];
  closing: string[];
  logistics: string[];
}

/** Every untested assumption on the canvas, one option each. Validated/invalidated items are skipped. */
export function listAssumptions(canvas: Canvas): AssumptionOption[] {
  const out: AssumptionOption[] = [];
  for (const block of BLOCK_ORDER) {
    for (const it of canvas[block] ?? []) {
      if (it.status !== "hypothesis") continue;
      const as = it.assumptions?.length ? it.assumptions : extractAssumptions(block, it.text);
      as.forEach((a, i) => out.push({ key: `${it.id}:${i}`, block, item: it.text, lens: a.lens, text: a.text }));
    }
  }
  return out;
}

const Q: Record<AssumptionLens, (a: AssumptionOption) => string[]> = {
  desirability: (a) => [
    `Tell me about the last time you dealt with this. What happened?`,
    `How are you handling it today? What does that cost you in time or money?`,
    `What have you already tried to fix it? Why did you stop (or keep) using it?`,
    `If this problem disappeared tomorrow, what would change for you?`,
    `Probe "${a.item}": where does that match or not match your experience?`,
  ],
  feasibility: (a) => [
    `Walk me through how you currently get this done, step by step.`,
    `Who else is involved, and what tools or people do you rely on?`,
    `What would make it hard for you to switch to a new way of doing this?`,
    `Probe "${a.item}": what would have to be true for that to work for you?`,
  ],
  viability: (a) => [
    `What do you currently spend on this, and who approves that spend?`,
    `How did you decide what to pay last time? What did you compare it to?`,
    `When did you last buy something like this? How long did the decision take?`,
    `Probe "${a.item}": would you commit to that today (pre-order, deposit, pilot)? Why or why not?`,
  ],
};

const SIGNALS: Record<AssumptionLens, { confirm: string[]; refute: string[] }> = {
  desirability: {
    confirm: ["Describes a specific recent incident unprompted", "Has already spent time or money on workarounds"],
    refute: ["Speaks only hypothetically (\"I would…\")", "Cannot recall the last time it happened"],
  },
  feasibility: {
    confirm: ["Current process has a clear gap you could fill", "Named people/tools you can realistically partner with"],
    refute: ["Hidden dependencies or approvals you hadn't mapped", "Switching cost described as high"],
  },
  viability: {
    confirm: ["Current spend at or above your price", "Agrees to a concrete next step (deposit, pilot, intro)"],
    refute: ["Compliments without commitment", "Price compared to a much cheaper or free alternative"],
  },
};

function persona(canvas: Canvas) {
  const seg = canvas.segments.filter((i) => i.status !== "invalidated").map((i) => i.text);
  const ch = canvas.channels.map((i) => i.text);
  return {
    who: seg[0] ?? "Not yet defined. Add a Customer Segment before booking interviews.",
    mustHave: [
      ...seg.slice(1, 3).map((s) => `Also fits: ${s}`),
      "Has faced the problem in the last 3 months",
      "Is the person who decides or pays (or can introduce you to them)",
    ],
    avoid: ["Friends, family or colleagues", "People who already know your idea", "Anyone outside the segment above"],
    recruitVia: ch.length ? ch : ["Where this segment already gathers (groups, forums, events)"],
  };
}

export function buildCallSheet(canvas: Canvas, selected: AssumptionOption[]): CallSheet {
  const p = persona(canvas);
  const lenses = new Set(selected.map((a) => a.lens));
  return {
    goal: selected.length
      ? `Find evidence for or against ${selected.length} assumption${selected.length > 1 ? "s" : ""} (${[...lenses].join(", ")}) through past behaviour, not opinions.`
      : "Select at least one assumption to test.",
    persona: { who: p.who, mustHave: p.mustHave, avoid: p.avoid },
    screener: [
      `Do you consider yourself: ${p.who}? (yes / no)`,
      "When did you last run into this problem? (disqualify if more than 3 months ago)",
      "Are you involved in deciding or paying for a solution? (yes / no / influence)",
    ],
    opening: [
      "Thank them; confirm 20–30 minutes; ask permission to take notes.",
      "\"We're not selling anything. We want to learn how you handle this today.\"",
      "Don't pitch the idea until the final minutes, if at all.",
    ],
    sections: selected.map((a) => ({ assumption: a, questions: Q[a.lens](a), signals: SIGNALS[a.lens] })),
    closing: [
      "Is there anything I should have asked but didn't?",
      "Who else should I speak to about this?",
      "Can I follow up when we have something to show you?",
    ],
    logistics: [
      `Recruit via: ${p.recruitVia.join("; ")}`,
      "Aim for 5–8 interviews per segment; stop when answers repeat.",
      "Two people per call: one asks, one notes exact quotes.",
      "Within 24 hours, mark each assumption supported, contradicted or unclear.",
    ],
  };
}

export const blockTitle = (b: BlockId) => BLOCKS[b].title;
