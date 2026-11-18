import { stripBelievePrefix } from "./assumptions";
import { INTERVIEW_ORDER } from "./sequence";
import { serverChat } from "./llm.functions";
import { parseCoachResponse } from "./chat-recovery";
import { FACILITATOR_PROMPT, ensureFacilitatorQuestion } from "./facilitation";

type Msg = { role: "system" | "user" | "assistant"; content: string };

/** All live requests use authenticated, server-side Lovable AI. */
async function chat(messages: Msg[], signal?: AbortSignal): Promise<string> {
  const result = await serverChat({ data: { messages }, ...(signal ? { signal } : {}) });
  if (result.error) throw new Error(result.error);
  return result.content;
}
import { type Assumption, BLOCK_ORDER, type BlockId, type Canvas, type ChatMessage, type Stage } from "./types";

const SYSTEM = `You are CanvasStack, a Socratic venture coach using Osterwalder's Business Model Canvas and David J. Bland's Testing Business Ideas.
${FACILITATOR_PROMPT}
Rules:
1. Ask exactly ONE focused question per reply. Draft what the founder supplied, never answers they did not give.
2. Accept vague customer segments (e.g. "small businesses") as a provisional draft, then ask for ONE missing detail such as vertical, size or budget owner.
3. Enforce cross-block coherence: if a Value Proposition implies capabilities missing from Key Resources/Activities/Costs, flag it.
4. Only add canvas items the founder actually stated, phrased as concise hypotheses.
5. Surface 1-2 underlying assumptions embedded in the founder's latest statement, each classified as desirability, feasibility or viability. Phrase each as a clause completing "We believe that ..." (lower-case start, no trailing period). Never answer for the founder; reveal what they take for granted.
6. Open with Customer Segments: who is this for and what job or pain do they have. Follow the Mom Test: ask "how do you know?" (past behaviour, evidence) before ever asking about product features or solutions.
7. Capture every concrete fact the founder gives (prices, amounts, numbers, named partners) as an addition in the matching block, even if it is not the block being discussed (e.g. "R2000 a month" goes to revenue).
8. Off-topic requests alone are not venture facts; engage helpfully without fabricating additions or underlying assumptions.
9. Every message needs a nonempty, helpful reply, including questions, requests for data, clarification, "help" and "ok". These are not automatically answers or venture facts: do not add them to the canvas or advance the stage. Clarify the current question or help with the request first. For data requests, suggest credible sources and how to check relevance, never invent statistics or claim you searched the web; ask which country or area matters if unknown.
Block order: Customer Segments → Value Propositions → Channels → Customer Relationships → Revenue Streams → Key Resources → Key Activities → Key Partners → Cost Structure. Before drafting the Value Proposition, spend 2-3 questions on the segment's jobs-to-be-done, pains and gains, and build the value proposition on them. When moving to a new block, add one sentence explaining how it builds on the previous blocks (e.g. "Now that we know who you serve and what you offer them, let's look at how you'll reach them: Channels.").
Balance: if the founder wants to jump ahead (e.g. to costs) while Customer Segments or Value Propositions are empty, recommend going back first but let them override. Mention blocks that are empty or much thinner than the rest when summarising a stage.
Stages: 1 Intake, 2 Desirability (segments, value props, channels, relationships), 3 Feasibility (resources, activities, partners), 4 Viability (revenue, costs), 5 Experiments. Revenue is asked before Feasibility; the stage indicator never moves backwards. Never move backwards. Keep the current stage when asking permission to move on; advance only after agreement.
Use the exact block ids listed below. Additions are untested hypotheses; never claim anything is validated without evidence.
Respond ONLY with JSON: {"reply": string, "stage": 1-5, "additions": [{"block": one of ${BLOCK_ORDER.join("|")}, "text": string}], "assumptions": [{"lens": "desirability"|"feasibility"|"viability", "text": string}], "flags": [string]}`;

/** First block in interview order that is still empty after this turn: the next useful question. */
function nextGap(canvas: Canvas, filled: BlockId[]): BlockId | undefined {
  return INTERVIEW_ORDER.find((b) => !canvas[b].length && !filled.includes(b));
}

export interface LlmResult {
  reply: string;
  stage: Stage;
  additions: { block: BlockId; text: string }[];
  flags: string[];
  assumptions: Assumption[];
}

export async function llmTurn(opts: {
  canvas: Canvas;
  history: ChatMessage[];
  stage?: Stage;
  signal?: AbortSignal;
}): Promise<LlmResult> {
  const canvasSummary = Object.fromEntries(
    BLOCK_ORDER.map((b) => [b, opts.canvas[b].map((i) => `${i.text} [${i.status}]`)]),
  );
  const content = await chat([
        { role: "system", content: SYSTEM },
        { role: "system", content: `Current canvas JSON: ${JSON.stringify(canvasSummary)}` },
        { role: "system", content: `Current stage: ${opts.stage ?? 1}. Use the conversation to identify the active block and any pending invitation to move on.` },
        ...opts.history.slice(-14).map((m) => ({
          role: (m.role === "coach" ? "assistant" : "user") as Msg["role"],
          content: m.text,
        })),
  ], opts.signal);
  const parsed = parseCoachResponse(content);
  const stage = Math.min(5, Math.max(1, Number(parsed.stage) || 1)) as Stage;
  return {
    reply: ensureFacilitatorQuestion(parsed.reply, [...opts.history].reverse().find((m) => m.role === "user")?.text ?? "Let's continue", opts.stage ?? stage, nextGap(opts.canvas, parsed.additions.map((a) => a.block))),
    stage,
    additions: (Array.isArray(parsed.additions) ? parsed.additions : []).filter(
      (a: { block: string; text: string }) => BLOCK_ORDER.includes(a.block as BlockId) && a.text,
    ),
    flags: Array.isArray(parsed.flags) ? parsed.flags.map(String) : [],
    assumptions: (Array.isArray(parsed.assumptions) ? parsed.assumptions : [])
      .filter((a: Assumption) => ["desirability", "feasibility", "viability"].includes(a.lens) && a.text)
      .map((a: Assumption) => ({ ...a, text: stripBelievePrefix(a.text) }))
      .slice(0, 2),
  };
}

export async function llmSuggest(opts: { canvas: Canvas; blocks: BlockId[] }) {
  const canvasSummary = Object.fromEntries(BLOCK_ORDER.map((b) => [b, opts.canvas[b].map((i) => i.text)]));
  const content = await chat([
        {
          role: "system",
          content: `You generate testable business-model assumptions (David J. Bland style): short, specific, falsifiable statements, not already on the canvas. Use the exact block ids listed below. Additions are untested hypotheses; never claim anything is validated without evidence.
Respond ONLY with JSON: {"assumptions": [{"block": one of ${BLOCK_ORDER.join("|")}, "text": string}]}. Give 3 per requested block.`,
        },
        { role: "user", content: `Canvas: ${JSON.stringify(canvasSummary)}\nBlocks: ${opts.blocks.join(", ")}` },
  ]);
  const parsed = JSON.parse(content);
  return (Array.isArray(parsed.assumptions) ? parsed.assumptions : []).filter(
    (a: { block: string; text: string }) => opts.blocks.includes(a.block as BlockId) && a.text,
  ) as { block: BlockId; text: string }[];
}
