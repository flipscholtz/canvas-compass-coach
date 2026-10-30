import { type BlockId } from "./types";

/** Reflect supplied words without inventing a venture fact. */
export function reflect(text: string): string {
  const words = text.trim().replace(/[?!\n]+/g, " ").replace(/[.]+$/, "").split(/\s+/).filter(Boolean);
  return `You're saying “${words.slice(0, 12).join(" ")}${words.length > 12 ? "…" : ""}”.`;
}

export const FOCUS_QUESTIONS: Record<BlockId, string> = {
  segments: "Which specific customer group would you start with?",
  valueProps: "What frustration did that customer describe in their last experience?",
  channels: "Where did that customer find their last provider?",
  relationships: "What support would that customer need after their first purchase?",
  keyActivities: "Which delivery activity needs to work reliably first?",
  keyResources: "Which essential resource do you still need to secure?",
  keyPartners: "Which partner could you approach for a small pilot?",
  revenue: "What would you charge for one paid pilot?",
  costs: "Which cost would most affect your margin on that pilot?",
};

export function facilitate(text: string, value: string, question: string): string {
  return `${reflect(text)} ${value} ${question}`;
}

export const FACILITATOR_PROMPT = `Actively lead like an experienced workshop facilitator, not a passive questionnaire.
Every reply has three conversational parts, without headings:
Reflect: one short sentence picking up the latest user message in their own words.
Add value: one interpretation, constructive challenge or practical tip tied to the BMC block being worked on.
Ask: finish with exactly one clear follow-up question moving toward the CURRENT stage's goal.
Aim for fewer than 80 words. One question at a time; no compound question lists.
Never finish without a question. When a stage is complete, briefly summarise what was learned and ask whether to move on; stay in the current stage until the user agrees.
Engage unexpected or off-topic messages briefly and helpfully, then nudge back with a fresh question. Do not refuse merely because a message is off-topic, and never repeat the previous question word for word. Keep normal safety boundaries.
Accept partial or messy answers. Draft only supplied facts as untested hypotheses and ask for the most useful missing detail; do not demand a correct answer or invent facts.
Intake: customer, job/pain and observed evidence. Desirability: customer value, reach and relationships. Feasibility: activities, resources and partners. Viability: revenue and costs. Experiments: a risky claim, a cheap test and a decision threshold.`;