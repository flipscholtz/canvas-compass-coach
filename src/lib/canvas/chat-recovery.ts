import { z } from "zod";
import { BLOCK_ORDER, type BlockId } from "./types";

export const COACH_TIMEOUT_MS = 30_000;
export const COACH_FALLBACK = "The live coach couldn't answer just now, but your message is saved. Tap Retry, or keep going with the offline coach.";

const ALIASES: Record<string, BlockId> = {
  customersegments: "segments", customersegment: "segments", segment: "segments", segments: "segments", customers: "segments",
  valuepropositions: "valueProps", valueproposition: "valueProps", valueprops: "valueProps", valueprop: "valueProps", vp: "valueProps",
  channels: "channels", channel: "channels",
  customerrelationships: "relationships", customerrelationship: "relationships", relationships: "relationships", relationship: "relationships",
  revenuestreams: "revenue", revenuestream: "revenue", revenue: "revenue", pricing: "revenue",
  keyresources: "keyResources", resources: "keyResources", keyresource: "keyResources",
  keyactivities: "keyActivities", activities: "keyActivities", keyactivity: "keyActivities",
  keypartners: "keyPartners", partners: "keyPartners", keypartnerships: "keyPartners", keypartner: "keyPartners",
  coststructure: "costs", costs: "costs", cost: "costs",
};

/** Models often write "Customer Segments" or "value_propositions"; map them to canvas blocks. */
export function normalizeBlock(raw: unknown): BlockId | null {
  if (typeof raw !== "string") return null;
  if (BLOCK_ORDER.includes(raw as BlockId)) return raw as BlockId;
  return ALIASES[raw.toLowerCase().replace(/[^a-z]/g, "")] ?? null;
}

const LENSES = ["desirability", "feasibility", "viability"] as const;
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const turnSchema = z.object({ reply: z.string().trim().min(1) }).passthrough();

/** Only a usable reply is required; malformed extras are dropped instead of failing the whole turn. */
export function parseCoachResponse(raw: string) {
  try {
    const obj = turnSchema.parse(JSON.parse(raw)) as Record<string, unknown> & { reply: string };
    const list = (v: unknown) => (Array.isArray(v) ? v : []) as Record<string, unknown>[];
    const additions = list(obj.additions).flatMap((a) => {
      const block = normalizeBlock(a?.block);
      const t = text(a?.text);
      return block && t ? [{ block, text: t }] : [];
    });
    const assumptions = list(obj.assumptions).flatMap((a) => {
      const lens = text(a?.lens).toLowerCase() as typeof LENSES[number];
      const t = text(a?.text);
      return LENSES.includes(lens) && t ? [{ lens, text: t }] : [];
    });
    const flags = (Array.isArray(obj.flags) ? obj.flags : []).map(text).filter(Boolean);
    const n = Math.round(Number(obj.stage));
    const stage = Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 1;
    return { reply: obj.reply.trim(), stage, additions, assumptions, flags };
  } catch (error) {
    console.error("[CanvasStack coach] Invalid AI response", { error, rawResponse: raw });
    throw error;
  }
}

/** Bounds the whole turn, including transport and parsing; late results cannot update chat. */
export async function withCoachDeadline<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("Coach response exceeded 30 seconds"));
      controller.abort();
    }, COACH_TIMEOUT_MS);
  });
  try {
    return await Promise.race([run(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
