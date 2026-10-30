import { BLOCKS, type BlockId, type Canvas } from "./types";

/** Recommended interview sequence for the canvas (Osterwalder: customer side first). */
export const INTERVIEW_ORDER: BlockId[] = [
  "segments", "valueProps", "channels", "relationships", "revenue",
  "keyResources", "keyActivities", "keyPartners", "costs",
];

export const blockNumber = (b: BlockId) => INTERVIEW_ORDER.indexOf(b) + 1;

/** One sentence linking a block to the ones before it. */
export const BRIDGES: Record<BlockId, string> = {
  segments: "Everything on the canvas builds on the customer, so let's start there: Customer Segments.",
  valueProps: "Now that we know their jobs, pains and gains, we can shape what you offer them: Value Propositions.",
  channels: "Now that we know who you serve and what you offer them, let's look at how you'll reach them: Channels.",
  relationships: "With a way to reach them, the next question is how you'll win and keep them: Customer Relationships.",
  revenue: "Customers who are reached and kept are the ones who pay, so let's look at Revenue Streams.",
  keyResources: "To deliver that offer and earn that revenue you'll need certain assets: Key Resources.",
  keyActivities: "Those resources have to be put to work, so let's look at Key Activities.",
  keyPartners: "Some of those activities or resources may come from others: Key Partners.",
  costs: "With resources, activities and partners in place, we can see what it all costs: Cost Structure.",
};

const CUES: [BlockId, RegExp][] = [
  ["costs", /\bcosts?\b|expenses?|cost structure|budget/i],
  ["revenue", /revenue|pric(e|ing)|monetis|monetiz|charge/i],
  ["keyPartners", /partners?\b|suppliers?/i],
  ["keyResources", /resources?/i],
  ["keyActivities", /activit/i],
  ["relationships", /relationships?|retention/i],
  ["channels", /channels?|marketing|distribution/i],
  ["valueProps", /value prop/i],
];

/** Detects "let's talk about costs" style requests to jump to another block. */
export function jumpRequest(text: string): { block: BlockId; override: boolean } | null {
  if (!/\b(talk about|move (on )?to|jump (ahead )?to|go to|skip to|look at|do|start with|work on|discuss)\b/i.test(text)) return null;
  const block = CUES.find(([, cue]) => cue.test(text))?.[0];
  if (!block) return null;
  return { block, override: /\b(anyway|regardless|override|insist|still)\b/i.test(text) };
}

/** Foundation blocks that should have content before a later block is worked on. */
export function missingFoundations(canvas: Canvas, target: BlockId): BlockId[] {
  const before = INTERVIEW_ORDER.slice(0, INTERVIEW_ORDER.indexOf(target));
  return before.filter((b) => (b === "segments" || b === "valueProps") && !canvas[b].some((i) => i.status !== "invalidated"));
}

/** Gentle balance check: empty blocks and blocks much thinner than the rest. */
export function balanceFlags(canvas: Canvas, upTo: BlockId = "costs"): { empty: BlockId[]; thin: BlockId[] } {
  const scope = INTERVIEW_ORDER.slice(0, INTERVIEW_ORDER.indexOf(upTo) + 1);
  const count = (b: BlockId) => canvas[b].filter((i) => i.status !== "invalidated").length;
  const max = Math.max(0, ...INTERVIEW_ORDER.map(count));
  return {
    empty: scope.filter((b) => count(b) === 0),
    thin: max >= 3 ? scope.filter((b) => count(b) > 0 && count(b) * 3 <= max) : [],
  };
}

export function balanceNote(canvas: Canvas, upTo: BlockId): string {
  const { empty, thin } = balanceFlags(canvas, upTo);
  const names = (bs: BlockId[]) => bs.map((b) => BLOCKS[b].title).join(", ");
  if (empty.length) return `Balance check: ${names(empty)} ${empty.length > 1 ? "are" : "is"} still empty.`;
  if (thin.length) return `Balance check: ${names(thin)} ${thin.length > 1 ? "are" : "is"} much thinner than the rest.`;
  return "";
}
