import type { Assumption, AssumptionLens, BlockId, Canvas, CanvasItem, TestCard } from "./types";
import { uid } from "./types";

const BLOCK_LENS: Record<BlockId, AssumptionLens> = {
  segments: "desirability",
  valueProps: "desirability",
  channels: "desirability",
  relationships: "desirability",
  keyActivities: "feasibility",
  keyResources: "feasibility",
  keyPartners: "feasibility",
  revenue: "viability",
  costs: "viability",
};

/** Primary assumption per block: what the founder takes for granted by writing this down. */
const PRIMARY: Record<BlockId, (t: string) => string> = {
  segments: (t) => `“${t}” feel this problem urgently enough to act on it now`,
  valueProps: (t) => `customers value “${t}” more than the workaround they already use`,
  channels: (t) => `your buyers actually discover and trust solutions through “${t}”`,
  relationships: (t) => `customers want “${t}” and it is affordable for you to provide at scale`,
  keyActivities: (t) => `you can perform “${t}” reliably with the team and time you have`,
  keyResources: (t) => `you can get and keep “${t}” at a cost the model can bear`,
  keyPartners: (t) => `“${t}” will commit to working with an unproven venture on acceptable terms`,
  revenue: (t) => `customers will pay for “${t}” in this form and at this price`,
  costs: (t) => `“${t}” stays predictable and does not grow faster than revenue`,
};

/** Keyword cues that reveal a second, cross-lens assumption hidden in the statement. */
const CUES: { re: RegExp; lens: AssumptionLens; text: string }[] = [
  { re: /\b(ai|ml|machine learning|algorithm|automat|real[- ]time|predict|platform|app|software)\b/i, lens: "feasibility", text: "the technology can be built to the promised quality, on your timeline and budget" },
  { re: /(€|\$|£|\bper (month|year|seat|site|user)\b|\bsubscription\b|\blicen[cs]e\b|\bfee\b)/i, lens: "viability", text: "this price point covers acquisition and delivery costs with margin to spare" },
  { re: /\b(free|freemium|ads|advertis)/i, lens: "viability", text: "enough free users will convert or attract advertisers to fund the business" },
  { re: /\b(enterprise|corporate|government|hospital|bank|manufactur|industrial)/i, lens: "feasibility", text: "you can survive a long, multi-stakeholder sales cycle before revenue arrives" },
  { re: /\b(viral|word of mouth|referr|community|influencer)/i, lens: "desirability", text: "customers will spread the word without being paid or prompted" },
  { re: /\b(partner|integrat|marketplace|reseller)/i, lens: "feasibility", text: "a third party you don't control will prioritise your success" },
  { re: /\b(save|faster|cheaper|reduce|cut)\b/i, lens: "desirability", text: "the saving is big enough for the customer to notice and justify switching" },
  { re: /\b(regulat|complian|csrd|gdpr|audit|licen[cs]ing)\b/i, lens: "viability", text: "the regulation creating demand will stay in force and on schedule" },
];

/** Extracts 1–2 underlying assumptions from a statement placed in a canvas block. */
export function extractAssumptions(block: BlockId, text: string): Assumption[] {
  const out: Assumption[] = [{ lens: BLOCK_LENS[block], text: PRIMARY[block](text) }];
  const cue = CUES.find((c) => c.re.test(text) && c.lens !== BLOCK_LENS[block]) ?? CUES.find((c) => c.re.test(text));
  if (cue) out.push({ lens: cue.lens, text: cue.text });
  return out.slice(0, 2);
}

const LENS_WEIGHT: Record<AssumptionLens, number> = { desirability: 3, viability: 2, feasibility: 1 };
const BLOCK_WEIGHT: Record<BlockId, number> = {
  segments: 9, valueProps: 8, revenue: 7, channels: 6, keyResources: 5, keyPartners: 4, relationships: 3, keyActivities: 2, costs: 1,
};

export interface RiskPick {
  block: BlockId;
  item: CanvasItem;
  assumption: Assumption;
}

/**
 * The single most critical unverified assumption: untested items only, founder-stated
 * before co-pilot suggestions, weighted by block (who/what/pay first) then lens
 * (desirability kills ventures most often), skipping ones already on a test card.
 */
export function pickRiskiest(canvas: Canvas, cards: TestCard[]): RiskPick | null {
  const covered = new Set(cards.map((c) => c.assumption ?? c.title));
  let best: (RiskPick & { score: number }) | null = null;
  for (const block of Object.keys(canvas) as BlockId[]) {
    for (const item of canvas[block]) {
      if (item.status !== "hypothesis") continue;
      const list = item.assumptions?.length ? item.assumptions : extractAssumptions(block, item.text);
      for (const a of list) {
        if (covered.has(a.text)) continue;
        const score = BLOCK_WEIGHT[block] * 10 + LENS_WEIGHT[a.lens] * 2 + (item.source === "suggested" ? 0 : 5);
        if (!best || score > best.score) best = { block, item, assumption: a, score };
      }
    }
  }
  return best && { block: best.block, item: best.item, assumption: best.assumption };
}

const EXPERIMENT: Record<AssumptionLens, { exp: string; metric: string; criteria: string }> = {
  desirability: {
    exp: "run 8 problem-discovery interviews with people matching the segment, then show a one-page offer with a call to action",
    metric: "how many describe this pain unprompted and how many take the call to action (sign-up, booked call)",
    criteria: "≥ 5 of 8 confirm the pain and ≥ 3 of 8 take the call to action",
  },
  feasibility: {
    exp: "deliver the outcome manually (concierge / Wizard-of-Oz) for 3 real customers using only resources we can secure today",
    metric: "hours, cost and error rate per delivered outcome",
    criteria: "we deliver for all 3 within the time and cost assumed in the canvas",
  },
  viability: {
    exp: "ask 15 qualified prospects to commit to a pre-order or letter of intent at the proposed price",
    metric: "the number of signed LOIs or paid deposits, and the price objections raised",
    criteria: "≥ 3 of 15 commit money at the proposed price",
  },
};

export function testCardFromAssumption(pick: RiskPick): TestCard {
  const e = EXPERIMENT[pick.assumption.lens];
  return {
    id: uid(),
    title: `Riskiest: ${pick.item.text}`,
    block: pick.block,
    lens: pick.assumption.lens,
    assumption: pick.assumption.text,
    hypothesis: `We believe that ${pick.assumption.text}.`,
    experiment: `To verify that, we will ${e.exp}.`,
    metric: `And measure ${e.metric}.`,
    criteria: `We are right if ${e.criteria}.`,
  };
}
