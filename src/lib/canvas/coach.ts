import { extractAssumptions } from "./assumptions";
import { coachHelp } from "./help";
import { facilitate, FOCUS_QUESTIONS } from "./facilitation";
import { BRIDGES, balanceNote, jumpRequest, missingFoundations } from "./sequence";
import { type Assumption, BLOCKS, type BlockId, type Canvas, type ChatMessage, type Stage, type TestCard, uid } from "./types";

/** Scripted Socratic path through the canvas (one question per step). */
export interface Step {
  block: BlockId | null;
  /** Customer-profile detail (jobs, pains, gains) gathered before the value proposition. */
  profile?: "job" | "pain" | "gain";
  stage: Stage;
  question: string;
}

export const STEPS: Step[] = [
  { block: null, stage: 1, question: "Let's start with the customer. Who is this for, and what job or pain do they have?" },
  { block: null, stage: 1, question: "How do you know this pain matters from their recent behaviour?" },
  { block: "segments", stage: 2, question: "Which specific customer group would you start with?" },
  { block: "segments", profile: "job", stage: 2, question: "What job is that customer trying to get done when this comes up?" },
  { block: "segments", profile: "pain", stage: 2, question: "What frustrates or worries them most about how they do that job today?" },
  { block: "segments", profile: "gain", stage: 2, question: "What outcome would make them say the job went really well?" },
  { block: "valueProps", stage: 2, question: "Given those jobs, pains and gains, what would you offer them first?" },
  { block: "channels", stage: 2, question: "Where did that customer discover their last solution?" },
  { block: "relationships", stage: 2, question: "Once they find you, what kind of relationship do they expect — self-service, personal help or community?" },
  { block: "revenue", stage: 4, question: "What would you charge for one paid pilot?" },
  { block: "keyResources", stage: 3, question: "Which essential resource do you still need to secure?" },
  { block: "keyActivities", stage: 3, question: "Which delivery activity needs to work reliably first?" },
  { block: "keyPartners", stage: 3, question: "Which supplier, platform or partner would you depend on first?" },
  { block: "costs", stage: 4, question: "Which cost would most affect your margin on that pilot?" },
  { block: null, stage: 5, question: "Your canvas is a stack of guesses until tested. Which single assumption, if wrong, would kill this business?" },
];

/** Highest stage reached by the scripted path up to a step (stages never move backwards). */
export const stageThrough = (i: number) => Math.max(1, ...STEPS.slice(0, i + 1).map((x) => x.stage)) as Stage;

/** Question for a step, with a bridge sentence when it opens a new block. */
export function stepQuestion(i: number): string {
  const st = STEPS[i];
  if (!st) return "";
  const prev = STEPS[i - 1];
  return st.block && prev?.block !== st.block ? `${BRIDGES[st.block]} ${st.question}` : st.question;
}

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
      return "Which industry or household type would you focus on first?";
    }
  }
  if (words.length < 3) {
    return block ? FOCUS_QUESTIONS[block] : "Which customer's recent experience could help us understand this pain?";
  }
  return null;
}

/** Splits an answer into canvas items. */
export function extractItems(answer: string): string[] {
  return answer
    .split(/[;\n]|,(?![^(]*\))|\band also\b/i)
    .map((s) => s.trim().replace(/^[-•*]\s*/, "").replace(/[.]+$/, ""))
    .filter((s) => s.length > 2)
    // Keep relative clauses ("…, who own the budget") attached to the item they describe.
    .reduce<string[]>((acc, part) => {
      if (acc.length && /^(who|which|that|where|whose|with|and who)\b/i.test(part)) acc[acc.length - 1] += `, ${part}`;
      else acc.push(part);
      return acc;
    }, [])
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
  additions: { block: BlockId; text: string; assumptions?: Assumption[] }[];
  flags: string[];
  assumptions: Assumption[];
  nextStep: number;
  stage: Stage;
}

const PRICE = /(?:\b(?:R|ZAR|USD|EUR|GBP)\s?\d[\d\s,.]*k?|[$€£]\s?\d[\d,.]*k?|\d[\d,.]*\s?(?:rand|dollars|euros))/i;

/** Sentences in an answer that state a price or amount, kept verbatim for Revenue Streams. */
export function priceFacts(answer: string): string[] {
  return answer
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((x) => x.trim().replace(/[.;]+$/, ""))
    .filter((x) => x && PRICE.test(x));
}

/** Deterministic, rule-based Socratic turn for demo/offline mode. */
export function coachTurn(canvas: Canvas, stepIndex: number, answer: string, history: ChatMessage[] = []): CoachResult {
  const step = STEPS[Math.max(0, Math.min(stepIndex, STEPS.length - 1))] ?? STEPS[0];
  if (!step) throw new Error("No coaching question available");
  const message = answer.trim();
  const next = STEPS[stepIndex + 1] ?? step;
  const previous = [...history].reverse().find((m) => m.role === "coach")?.text ?? "";
  const nextStage = Math.max(stageThrough(stepIndex), next.stage) as Stage;
  const awaitingMove = /Shall we move on to /i.test(previous) && nextStage > stageThrough(stepIndex);
  if (awaitingMove && /^(yes|ok(?:ay)?|sure|let['’]s|move on|continue|go ahead)\b/i.test(message)) {
    return { reply: facilitate(message, "We'll carry those hypotheses forward and keep their evidence separate.", stepQuestion(stepIndex + 1)), additions: [], flags: [], assumptions: [], nextStep: stepIndex + 1, stage: nextStage };
  }
  if (awaitingMove && /^(no|not yet|stay|wait)\b/i.test(message)) {
    return { reply: facilitate(message, "We can strengthen this stage before moving on.", step.block ? FOCUS_QUESTIONS[step.block] : "Which recent customer experience still needs checking?"), additions: [], flags: [], assumptions: [], nextStep: stepIndex, stage: step.stage };
  }
  const jump = jumpRequest(message);
  if (jump && jump.block !== step.block) {
    const target = STEPS.findIndex((x) => x.block === jump.block);
    const missing = missingFoundations(canvas, jump.block);
    const confirmed = jump.override || (/go there anyway/i.test(previous) && previous.includes(BLOCKS[jump.block].title));
    if (missing.length && !confirmed) {
      const names = missing.map((b) => BLOCKS[b].title).join(" and ");
      return { reply: facilitate(message, `I'd recommend we go back first: ${names} ${missing.length > 1 ? "are" : "is"} still empty, and ${BLOCKS[jump.block].title} builds on them. Say "go to ${BLOCKS[jump.block].title} anyway" if you'd still like to go there anyway.`, step.question), additions: [], flags: [], assumptions: [], nextStep: stepIndex, stage: stageThrough(stepIndex) };
    }
    if (target >= 0) return { reply: facilitate(message, `Let's look at ${BLOCKS[jump.block].title} now; we can come back to the earlier blocks.`, STEPS[target]!.question), additions: [], flags: [], assumptions: [], nextStep: target, stage: Math.max(stageThrough(stepIndex), STEPS[target]!.stage) as Stage };
  }
  const help = coachHelp({ text: message, canvas, history, block: step.block, question: step.question });
  if (help) return { reply: help.reply, additions: [], flags: [], assumptions: [], nextStep: stepIndex, stage: step.stage };
  let assistance: string | undefined;
  const focus = step.block ? FOCUS_QUESTIONS[step.block] : "Which customer's recent experience could help us understand this pain?";
  if (/^(ok(?:ay)?|yes|sure|thanks|thank you|got it)[.!\s]*$/i.test(message)) {
    assistance = facilitate(message, "Let's make the next step concrete rather than guess.", awaitingMove ? `Shall we move on to ${STAGE_NAMES[nextStage]}?` : focus);
  } else if (/\?|^(help|what do you mean|explain|can you|could you|please help|i don['’]t understand)\b/i.test(message)) {
    assistance = facilitate(message, `A useful way to explore that is a concrete example; for ${step.block ? BLOCKS[step.block].title : "the customer and their pain"}, recent behaviour is stronger than a prediction.`, focus);
  }
  if (assistance) return { reply: assistance, additions: [], flags: [], assumptions: [], nextStep: stepIndex, stage: step.stage };
  const probe = step.profile ? null : vaguenessProbe(step.block, answer);
  if (stepIndex >= STEPS.length - 1) {
    return {
      reply: facilitate(message, "Treat that as a candidate risk, not a proven fact; decide your threshold before running a test.", "What result would make you rethink the model?"),
      additions: [],
      flags: [],
      assumptions: [],
      nextStep: stepIndex,
      stage: 5,
    };
  }
  const block = step.block;
  const label = step.profile ? `${step.profile[0]!.toUpperCase()}${step.profile.slice(1)}: ` : "";
  const additions = block ? extractItems(answer).map((text) => ({ block, text: label + text, assumptions: extractAssumptions(block, text) })) : [];
  // Never drop concrete prices the founder volunteers off-step (e.g. "R2000 a month").
  if (step.block !== "revenue") {
    for (const text of priceFacts(answer)) additions.push({ block: "revenue", text, assumptions: extractAssumptions("revenue", text) });
  }
  const projected: Canvas = { ...canvas };
  for (const a of additions) {
    projected[a.block] = [...projected[a.block], { id: "tmp", text: a.text, status: "hypothesis" }];
  }
  const before = new Set(coherenceFlags(canvas));
  const flags = coherenceFlags(projected).filter((f) => !before.has(f));
  // Surface 1–2 assumptions from the whole statement (deduped), without answering for the founder.
  const seen = new Set<string>();
  const assumptions = additions
    .flatMap((a) => a.assumptions ?? [])
    .filter((a) => (seen.has(a.text) ? false : (seen.add(a.text), true)))
    .slice(0, 2);
  const stageComplete = !probe && nextStage > stageThrough(stepIndex);
  const balance = stageComplete && block ? balanceNote(projected, block) : "";
  const value = probe
    ? `That's enough for a provisional ${block ? BLOCKS[block].title : "customer"} draft; one missing detail would sharpen it.`
    : stageComplete
      ? `${STAGE_NAMES[step.stage]} now has a starting point for ${STAGE_GOALS[step.stage]}; these remain hypotheses, not verified evidence.${balance ? ` ${balance}` : ""}`
      : block ? `I've drafted that in ${BLOCKS[block].title}; test the behaviour behind it before treating it as fact.` : "Start with a recent customer experience rather than proposed features.";
  const tension = flags[0]?.replace(/^Coherence: /, "").replace(/[^.!?]*\?/, "").trim();
  const reply = facilitate(message, tension || value, probe ?? (stageComplete ? `Shall we move on to ${STAGE_NAMES[nextStage]}?` : stepQuestion(stepIndex + 1)));
  return {
    reply,
    additions,
    flags,
    assumptions,
    nextStep: probe || stageComplete ? stepIndex : stepIndex + 1,
    stage: probe || stageComplete ? stageThrough(stepIndex) : nextStage,
  };
}

const STAGE_NAMES: Record<Stage, string> = { 1: "Intake", 2: "Desirability", 3: "Feasibility", 4: "Viability", 5: "Experiments" };
const STAGE_GOALS: Record<Stage, string> = { 1: "the customer, pain and evidence", 2: "customer value, reach and relationships", 3: "delivery activities, resources and partners", 4: "pricing and cost drivers", 5: "the risky claim and its test" };

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

const ASSUMPTION_TEMPLATES: Record<BlockId, string[]> = {
  segments: [
    "{seg} experience this problem at least monthly",
    "{seg} already spend money or time on a workaround",
    "A single budget owner within {seg} can sign off without a committee",
    "{seg} are reachable in large enough numbers to build a business",
  ],
  valueProps: [
    "{seg} rank this pain in their top 3 priorities",
    "{seg} prefer our solution over their current workaround",
    "The main gain ({vp}) is noticeable within the first week of use",
    "{seg} trust a new provider to deliver {vp}",
  ],
  channels: [
    "{seg} search for solutions online before asking peers",
    "A partner or referral channel can deliver qualified leads at low cost",
    "{seg} will book a demo or trial from a cold outreach message",
  ],
  relationships: [
    "{seg} are happy to onboard themselves without human help",
    "{seg} will stay active after 30 days without ongoing check-ins",
    "Existing customers will refer peers once they see results",
  ],
  keyActivities: [
    "We can deliver {vp} manually before automating it",
    "Onboarding a new customer takes under one day of our effort",
    "Quality can be kept high as volume grows 10×",
  ],
  keyResources: [
    "We can hire or contract the skills needed to build {vp} within 3 months",
    "The data we need is accessible, legal to use and good enough",
    "Our current funding covers 12 months of learning experiments",
  ],
  keyPartners: [
    "At least one established partner will pilot with an unproven startup",
    "Key suppliers will offer terms that keep our margins healthy",
    "Partners won't copy our offer once they see it works",
  ],
  revenue: [
    "{seg} will pay up front rather than only after results",
    "{seg} consider our proposed price fair relative to their workaround",
    "Customers will expand spend within the first year",
  ],
  costs: [
    "Acquiring a customer costs less than one-third of their first-year revenue",
    "Serving each extra customer costs little once the product is built",
    "Our biggest cost driver can be cut in half at scale",
  ],
};

/** Deterministic, context-aware assumptions for a block (skips ones already on the canvas). */
export function suggestAssumptions(canvas: Canvas, block: BlockId, count = 3): string[] {
  const live = (b: BlockId) =>
    canvas[b].find((i) => i.status !== "invalidated" && i.source !== "suggested")?.text;
  const seg = live("segments") ?? "our target customers";
  const vp = live("valueProps")?.replace(/[.]+$/, "") ?? "our core benefit";
  const existing = new Set(canvas[block].map((i) => i.text.toLowerCase()));
  return ASSUMPTION_TEMPLATES[block]
    .map((t) => t.replace(/\{seg\}/g, seg).replace(/\{vp\}/g, vp))
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .filter((t) => !existing.has(t.toLowerCase()))
    .slice(0, count);
}
