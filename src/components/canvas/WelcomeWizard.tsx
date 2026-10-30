import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Route, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KEY = "canvasstack-welcome-seen";

/** Live tour: each step points at an element marked with data-tour="…"; steps without a visible target are centred. */
const STEPS: { target?: string; title: string; body: string }[] = [
  { title: "Welcome to CanvasStack", body: "A Socratic co-pilot for your Business Model Canvas. It asks questions rather than giving answers, so you see what you're taking for granted. Everything stays in this browser, with no sign-up needed. Note: CanvasStack is a coaching aid, not professional legal, financial or regulatory advice." },
  { target: "coach", title: "Talk to the coach", body: "Answer here, even roughly. Each reply reflects what you said, adds one tip and asks one question. Answers become sticky notes, and the coach surfaces the assumptions behind them. Ask for help (\"where do I find this data?\") whenever you're stuck. Collapse the panel to see the canvas full-screen." },
  { target: "stage", title: "Stage progress", body: "Shows where you are: Intake, Desirability, Feasibility, Viability, then Test Cards. Tap it to see all five stages. The coach asks before moving on." },
  { target: "canvas", title: "Your canvas", body: "Blocks are numbered in the order the coach covers them, starting with Customer Segments, and the block being discussed is highlighted. Changed notes briefly glow. Notes start as Untested hypotheses; marking one Validated or Invalidated asks which test and result back it up. The lightbulb suggests assumptions to test." },
  { target: "actions", title: "Quick actions", body: "Riskiest assumption drafts a Test Card, Coherence check reviews how the blocks fit together, and Challenge VP pushes on your value proposition. A pill lights up when the coach suggests it. Not sure? \"Skip for now\" parks the topic as an untested assumption." },
  { target: "tabs", title: "Explore", body: "Experiments holds Test Cards and the Experiment Designer, which prints an interview call sheet. Journey shows pivots, lessons and a PDF report. Changelog & Decisions records every change and why, plus App updates." },
  { target: "stack", title: "Versions", body: "Save snapshot keeps a checkpoint while you refine the same model. Fork pivot starts a new direction: say whether you know your pivot or want a suggested pattern, name it, give a reason, and mark blocks to rethink. Earlier versions open read-only." },
  { target: "scenarios", title: "Scenarios", body: "Start a new scenario, or save and load your own. Two protected demos are included: VeriTrace and LearnLoop." },
  { target: "info", title: "About the advice", body: "The (i) button repeats the disclaimer: coaching heuristic aid, not professional advice." },
  { target: "tour", title: "Ready?", body: "Start answering the coach, or open a demo scenario. You can replay this tour any time from here." },
];

type Rect = { top: number; left: number; width: number; height: number };
const CARD_W = 320;
const PAD = 8;

function findTarget(name?: string) {
  if (!name) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width && r.height ? el : null;
}

function cardPos(r: Rect | null, cardH: number) {
  const vw = window.innerWidth, vh = window.innerHeight;
  if (!r || vw < 640) return { top: Math.max(16, vh / 2 - cardH / 2), left: Math.max(16, vw / 2 - CARD_W / 2) };
  const clampTop = (t: number) => Math.min(Math.max(16, t), vh - cardH - 16);
  const clampLeft = (l: number) => Math.min(Math.max(16, l), vw - CARD_W - 16);
  if (r.top + r.height + cardH + 24 < vh) return { top: r.top + r.height + 16, left: clampLeft(r.left) };
  if (r.left + r.width + CARD_W + 24 < vw) return { top: clampTop(r.top), left: r.left + r.width + 16 };
  if (r.left - CARD_W - 24 > 0) return { top: clampTop(r.top), left: r.left - CARD_W - 16 };
  if (r.top - cardH - 24 > 0) return { top: r.top - cardH - 16, left: clampLeft(r.left) };
  return { top: clampTop(r.top + 24), left: clampLeft(r.left + 24) };
}

export function WelcomeWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardH, setCardH] = useState(220);
  useEffect(() => { if (open) setI(0); }, [open]);
  const st = STEPS[i]!;
  const last = i === STEPS.length - 1;
  const close = useCallback(() => { localStorage.setItem(KEY, "1"); onOpenChange(false); }, [onOpenChange]);

  const measure = useCallback(() => {
    const el = findTarget(st.target);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    // Clip very tall targets (e.g. the coach pane) to the visible viewport.
    const top = Math.max(r.top, 8), bottom = Math.min(r.bottom, vh - 8);
    setRect({ top: top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: bottom - top + PAD * 2 });
  }, [st.target]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = findTarget(st.target);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    measure();
    const t = setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [open, i, st.target, measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setI((k) => Math.min(k + 1, STEPS.length - 1));
      if (e.key === "ArrowLeft") setI((k) => Math.max(k - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;
  const pos = cardPos(rect, cardH);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={st.title}>
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-signal transition-all duration-300"
          style={{ ...rect, boxShadow: "0 0 0 9999px color-mix(in oklab, var(--foreground) 55%, transparent)" }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: "color-mix(in oklab, var(--foreground) 55%, transparent)" }} />
      )}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      <div
        ref={(n) => { if (n && Math.abs(n.offsetHeight - cardH) > 2) setCardH(n.offsetHeight); }}
        className="absolute rounded-lg border bg-card p-4 shadow-xl transition-all duration-300"
        style={{ top: pos.top, left: pos.left, width: CARD_W }}
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-signal">Step {i + 1} of {STEPS.length}</div>
          <button aria-label="Close tour" onClick={close} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </div>
        <h2 className="font-display text-lg font-semibold">{st.title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{st.body}</p>
        <div className="mt-3 flex gap-1.5">
          {STEPS.map((_, k) => (
            <button key={k} aria-label={`Step ${k + 1}`} onClick={() => setI(k)} className={cn("h-1.5 rounded-full transition-all", k === i ? "w-6 bg-signal" : "w-1.5 bg-muted-foreground/30")} />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={close}>Skip</Button>
          <div className="flex gap-2">
            {i > 0 && <Button variant="outline" size="sm" onClick={() => setI(i - 1)}>Back</Button>}
            <Button size="sm" onClick={() => (last ? close() : setI(i + 1))}>{last ? "Get started" : "Next"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const welcomeSeen = () => localStorage.getItem(KEY) === "1";
export { Route as TourIcon };
