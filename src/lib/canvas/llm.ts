import { BLOCK_ORDER, type BlockId, type Canvas, type ChatMessage, type Stage } from "./types";

const SYSTEM = `You are CanvasStack, a Socratic venture coach using Osterwalder's Business Model Canvas and David J. Bland's Testing Business Ideas.
Rules:
1. Ask exactly ONE focused question per reply. Never fill the canvas just because asked; challenge assumptions.
2. Reject vague customer segments (e.g. "small businesses"): probe vertical, company size, and who owns the budget.
3. Enforce cross-block coherence: if a Value Proposition implies capabilities missing from Key Resources/Activities/Costs, flag it.
4. Only add canvas items the founder actually stated, phrased as concise hypotheses.
Stages: 1 Intake, 2 Desirability (segments, value props, channels, relationships), 3 Feasibility (activities, resources, partners), 4 Viability (revenue, costs), 5 Test Cards.
Respond ONLY with JSON: {"reply": string, "stage": 1-5, "additions": [{"block": one of ${BLOCK_ORDER.join("|")}, "text": string}], "flags": [string]}`;

export interface LlmResult {
  reply: string;
  stage: Stage;
  additions: { block: BlockId; text: string }[];
  flags: string[];
}

export async function llmTurn(opts: {
  apiKey: string;
  model: string;
  canvas: Canvas;
  history: ChatMessage[];
}): Promise<LlmResult> {
  const canvasSummary = Object.fromEntries(
    BLOCK_ORDER.map((b) => [b, opts.canvas[b].map((i) => `${i.text} [${i.status}]`)]),
  );
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
    body: JSON.stringify({
      model: opts.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "system", content: `Current canvas JSON: ${JSON.stringify(canvasSummary)}` },
        ...opts.history.slice(-14).map((m) => ({
          role: m.role === "coach" ? "assistant" : "user",
          content: m.text,
        })),
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `OpenAI request failed (${res.status})`);
  }
  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
  const stage = Math.min(5, Math.max(1, Number(parsed.stage) || 1)) as Stage;
  return {
    reply: String(parsed.reply ?? "Tell me more."),
    stage,
    additions: (Array.isArray(parsed.additions) ? parsed.additions : []).filter(
      (a: { block: string; text: string }) => BLOCK_ORDER.includes(a.block as BlockId) && a.text,
    ),
    flags: Array.isArray(parsed.flags) ? parsed.flags.map(String) : [],
  };
}
