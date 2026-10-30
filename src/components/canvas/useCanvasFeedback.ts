import { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "@/lib/canvas/store";
import { STEPS } from "@/lib/canvas/coach";
import { BLOCK_ORDER, type BlockId, type Canvas } from "@/lib/canvas/types";

/** Presentation only: infer the block being discussed without changing coaching progress. */
export function questionBlock(text: string, fallback: BlockId): BlockId {
  const question = text.match(/[^.!?\n]*\?/g)?.at(-1) ?? text;
  if (/who is this for|for whom|who.*job or pain/i.test(question)) return "segments";
  const cues: [BlockId, RegExp][] = [
    ["costs", /cost|expense|margin/i], ["revenue", /price|revenue|pay|charge/i],
    ["keyPartners", /partner|supplier|alliance/i], ["keyResources", /resource|skill|equipment|asset/i],
    ["keyActivities", /activit|workflow|deliver|perform/i], ["relationships", /support|relationship|retain|retention/i],
    ["channels", /channel|discover|reach|find.*provider/i], ["valueProps", /benefit|value proposition|workaround|problem|pain/i],
    ["segments", /homeowner|customer|household|who|whom/i],
  ];
  return cues.find(([, cue]) => cue.test(question))?.[0] ?? fallback;
}

export function changedNotes(before: Canvas, after: Canvas) {
  return BLOCK_ORDER.flatMap((block) => after[block].filter((item) => {
    const old = before[block].find((i) => i.id === item.id);
    return !old || old.text !== item.text || old.status !== item.status;
  }).map((item) => ({ block, id: item.id, added: !before[block].some((i) => i.id === item.id) })));
}

export function useCanvasFeedback() {
  const s = useCanvasStore();
  const canvas = s.versions.at(-1)?.canvas;
  const session = s.versions[0]?.id;
  const previous = useRef({ canvas, session });
  const [flashing, setFlashing] = useState<string[]>([]);
  useEffect(() => {
    const old = previous.current;
    previous.current = { canvas, session };
    if (!canvas || !old.canvas || old.session !== session) { setFlashing([]); return; }
    const changes = changedNotes(old.canvas, canvas);
    if (!changes.length) return;
    setFlashing(changes.map((i) => i.id));
  }, [canvas, session]);
  useEffect(() => {
    if (!flashing.length) return;
    const timer = setTimeout(() => setFlashing([]), 2400);
    return () => clearTimeout(timer);
  }, [flashing]);
  const last = s.messages.filter((m) => m.role === "coach" && !m.coherenceKey && !m.retryUserId).at(-1);
  const fallback = STEPS[s.step]?.block ?? "segments";
  if (last && STEPS[s.step]?.block && last.text.includes(STEPS[s.step]!.question)) return { activeBlock: fallback, flashing };
  return { activeBlock: questionBlock(last?.text ?? "", fallback), flashing };
}