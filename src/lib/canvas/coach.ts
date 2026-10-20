import { BLOCKS, type BlockId, type Canvas, type Stage, type TestCard, uid } from "./types";

/** Scripted Socratic path through the canvas (one question per step). */
export interface Step {
  block: BlockId | null;
  stage: Stage;
  question: string;
}

export const STEPS: Step[] = [
  {
    block: null,
    stage: 1,
    question:
      "Let's start where founders usually skip ahead. In one sentence: what painful problem have you personally seen, and who was suffering from it?",
  },
  {
    block: "segments",
    stage: 2,
    question:
      "Who exactly is your first customer segment? Name the role, the industry vertical and the company or household size — and who controls the budget.",
  },
  {
    block: "valueProps",
    stage: 2,
    question:
      "What job does that segment hire you for? Describe the gain you create or the pain you relieve — in their words, not yours.",
  },
  {
    block: "channels",
    stage: 2,
    question:
      "Where does that buyer already go to discover solutions like yours? Which channels will reach them first?",
  },
  {
    block: "relationships",
    stage: 2,
    question:
      "Once they find you, what kind of relationship do they expect — self-service, dedicated account manager, community, co-creation?",
  },
  {
    block: "keyActivities",
    stage: 3,
    question:
      "Moving backstage. What are the two or three activities you must perform brilliantly for that value proposition to actually work?",
  },
  {
    block: "keyResources",
    stage: 3,
    question:
      "Which resources are indispensable — people, data, IP, capital, licences? Be honest about what you already have versus what you'd need.",
  },
  {
    block: "keyPartners",
    stage: 3,
    question: "Who will you depend on that you don't control? Name suppliers, platforms or alliances.",
  },
  {
    block: "revenue",
    stage: 4,
    question:
      "Now the financial engine. What will your segment actually pay for, how (subscription, usage, licence) and roughly how much?",
  },
  {
    block: "costs",
    stage: 4,
    question:
      "What are your three biggest cost drivers? Are you cost-driven or value-driven?",
  },
  {
    block: null,
    stage: 5,
    question:
      "Your canvas is a stack of guesses until tested. Which single assumption, if wrong, would kill this business? Hit “Generate Test Card from Riskiest Assumption” or tell me which one worries you most.",
  },
];

const VAGUE_SEGMENTS = [
  "small businesses",
  "small business",
  "smes",
  "sme",
  "businesses",
  "companies",
  "everyone",
  "anyone",
  "people",
  "consumers",
  "users",
  "customers",
  "millennials",
  "students",
  "enterprises",
  "b2b",
  "b2c",
];

/** Returns a probing question if the answer is too vague to commit to the canvas. */
export function vaguenessProbe(block: BlockId | null, answer: string): string | null {
  const a = answer.trim().toLowerCase().replace(/[.!]+$/, "");
  const words = a.split(/\s+/).filter(Boolean);
  if (block === "segments") {
    if (VAGUE_SEGMENTS.includes(a) || (words.length <= 3 && VAGUE_SEGMENTS.some((v) => a.includes(v)))) {
      return `“${answer.trim()}” is a market, not a segment. Which vertical? What company size or headcount? And who personally owns the credit card or budget for this?`;
    }
  }
  if (words.length < 3) {
    return `That's a bit thin to put on a canvas. Can you be more specific about the ${
      block ? BLOCKS[block].title.toLowerCase() : "problem"
    } — who, what, and why it matters?`;
  }
  return null;
}

/** Splits an answer into canvas items. */
export function extractItems(answer: string): string[] {
  return answer
    .split(/[;\n]|,(?![^(]*\))|\band also\b/i)
    .map((s) => s.trim().replace(/^[-•*]\s*/, "").replace(/[.]+$/, ""))
    .filter((s) => s.length > 2)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .slice(0, 5);
}

const has = (canvas: Canvas, block: BlockId, re: RegExp) =>
  canvas[block].some((i) => i.status !== "invalidated" && re.test(i.text));

/** Cross-block coherence checks. Each returns a flag string when inconsistent. */
export function coherenceFlags(canvas: Canvas): string[] {
  const flags: string[] = [];
  const techVP = /\b(ai|ml|machine learning|real[- ]time|algorithm|automat|predict|diagnos|platform|software|saas)\b/i;
  const techRes = /\b(engineer|developer|data|ml|scientist|cto|tech|ip|model|dataset|software)\b/i;
  if (has(canvas, "valueProps", techVP) && canvas.keyResources.length > 0 && !has(canvas, "keyResources", techRes)) {
    flags.push(
      "Coherence: your Value Proposition promises a technology-driven outcome, but Key Resources lists no engineers, proprietary data or IP. Who builds it?",
    );
  }
  if (has(canvas, "relationships", /\b(dedicated|account manager|personal|white[- ]glove|consult)/i) &&
      has(canvas, "revenue", /\b(freemium|free|ads|advertis|\$?[0-9]{1,2}\s*(\/|per)\s*month)\b/i)) {
    flags.push(
      "Coherence: high-touch, dedicated relationships rarely survive a low-price or freemium revenue model. How does the unit economics close?",
    );
  }
  if (has(canvas, "segments", /\b(enterprise|corporate|bank|government|hospital|industrial|manufactur)/i) &&
      has(canvas, "channels", /\b(app store|instagram|tiktok|social media|viral)\b/i)) {
    flags.push(
      "Coherence: enterprise buyers are rarely acquired via consumer social channels. What does their buying committee actually read?",
    );
  }
  if (canvas.revenue.length > 0 && canvas.segments.length === 0) {
    flags.push("Coherence: you have revenue streams but no defined customer segment. Who is paying?");
  }
  if (canvas.keyActivities.length > 0 && canvas.costs.length > 0 &&
      has(canvas, "keyActivities", /\b(r&d|research|develop|build)/i) &&
      !has(canvas, "costs", /\b(salar|engineer|r&d|develop|staff|people)/i)) {
    flags.push("Coherence: R&D is a key activity, yet engineering salaries don't appear in your cost structure.");
  }
  return flags;
}

export interface CoachResult {
  reply: string;
  additions: { block: BlockId; text: string }[];
  flags: string[];
  nextStep: number;
  stage: Stage;
}

/** Deterministic, rule-based Socratic turn for demo/offline mode. */
export function coachTurn(canvas: Canvas, stepIndex: number, answer: string): CoachResult {
  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)]!;
  const probe = vaguenessProbe(step.block, answer);
  if (probe) {
    return { reply: probe, additions: [], flags: [], nextStep: stepIndex, stage: step.stage };
  }
  if (stepIndex >= STEPS.length - 1) {
    return {
      reply:
        "Good — that's the assumption to attack first. I've drafted it as a test. Before you run it: what result would make you willing to pivot?",
      additions: [],
      flags: [],
      nextStep: stepIndex,
      stage: 5,
    };
  }
  const additions = step.block ? extractItems(answer).map((text) => ({ block: step.block!, text })) : [];
  const projected: Canvas = { ...canvas };
  for (const a of additions) {
    projected[a.block] = [...projected[a.block], { id: "tmp", text: a.text, status: "hypothesis" }];
  }
  const before = new Set(coherenceFlags(canvas));
  const flags = coherenceFlags(projected).filter((f) => !before.has(f));
  const next = STEPS[stepIndex + 1]!;
  const ack = step.block
    ? `Noted under ${BLOCKS[step.block].title} as untested hypotheses (yellow).`
    : "That's a real starting point.";
  const reply = flags.length
    ? `${ack} But before we move on — ${flags[0]!.replace(/^Coherence: /, "")}`
    : `${ack} ${next.question}`;
  return {
    reply,
    additions,
    flags,
    nextStep: flags.length ? stepIndex + 1 : stepIndex + 1,
    stage: next.stage,
  };
}

const RISK_ORDER: BlockId[] = ["segments", "valueProps", "revenue", "channels", "keyResources", "keyPartners", "relationships", "keyActivities", "costs"];

/** Picks the riskiest untested assumption not yet covered by a card. */
export function riskiestAssumption(canvas: Canvas, cards: TestCard[]) {
  const covered = new Set(cards.map((c) => c.title));
  for (const block of RISK_ORDER) {
    for (const item of canvas[block]) {
      if (item.status === "hypothesis" && !covered.has(`Test: ${item.text}`)) return { block, item };
    }
  }
  return null;
}

const EXPERIMENTS: Record<BlockId, { exp: string; metric: string; criteria: string }> = {
  segments: { exp: "run 8 problem-discovery interviews with people matching this profile", metric: "the number who describe this pain unprompted and rank it top-3", criteria: "≥ 5 of 8 confirm it as a top-3 problem" },
  valueProps: { exp: "publish a one-page value proposition landing page with a waitlist", metric: "visitor-to-signup conversion from targeted traffic", criteria: "≥ 8% of 300 targeted visitors sign up" },
  revenue: { exp: "offer a pre-sale / letter of intent at the proposed price", metric: "number of signed LOIs or paid deposits", criteria: "≥ 3 of 15 qualified prospects commit money" },
  channels: { exp: "run a 2-week, $300 test campaign through this channel", metric: "cost per qualified lead", criteria: "CPL below one-tenth of expected first-year revenue per customer" },
  keyResources: { exp: "build a concierge / Wizard-of-Oz prototype with current resources", metric: "hours of effort per delivered outcome", criteria: "delivery in under 4 hours per customer" },
  keyPartners: { exp: "pitch 5 candidate partners with a draft term sheet", metric: "partners agreeing to a pilot", criteria: "≥ 2 of 5 agree to a pilot" },
  relationships: { exp: "onboard 5 customers using this relationship model", metric: "30-day retention and support hours", criteria: "≥ 4 of 5 active after 30 days" },
  keyActivities: { exp: "time-box a manual run of this activity for 3 customers", metric: "cycle time and error rate", criteria: "cycle time under target with < 10% rework" },
  costs: { exp: "obtain 3 vendor quotes for this cost line", metric: "median quoted cost", criteria: "within 20% of the modelled cost" },
};

export function generateTestCard(block: BlockId, text: string, segment?: string): TestCard {
  const e = EXPERIMENTS[block];
  const who = segment ?? "our target customers";
  return {
    id: uid(),
    title: `Test: ${text}`,
    block,
    hypothesis: `We believe that ${who} will ${block === "segments" ? `recognise “${text}” as a segment with an urgent, budgeted problem` : `respond to “${text}” with real behaviour, not polite interest`}.`,
    experiment: `To verify that, we will ${e.exp}.`,
    metric: `And measure ${e.metric}.`,
    criteria: `We are right if ${e.criteria}.`,
  };
}
