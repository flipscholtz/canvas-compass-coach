import { z } from "zod";
import { BLOCK_ORDER } from "./types";

export const COACH_TIMEOUT_MS = 30_000;
export const COACH_FALLBACK = "Sorry, I lost my train of thought there. Shall I try again?";

const nonempty = z.string().trim().min(1);
const turnSchema = z.object({
  reply: nonempty,
  stage: z.number().int().min(1).max(5),
  additions: z.array(z.object({ block: z.string().refine((b) => BLOCK_ORDER.includes(b as typeof BLOCK_ORDER[number])), text: nonempty })),
  flags: z.array(nonempty),
  assumptions: z.array(z.object({ lens: z.enum(["desirability", "feasibility", "viability"]), text: nonempty })),
});

export function parseCoachResponse(raw: string) {
  try {
    return turnSchema.parse(JSON.parse(raw));
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