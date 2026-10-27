import { useEffect, useState } from "react";
import { FlaskConical, GitBranch, Layers, LayoutGrid, Lightbulb, MessageCircleQuestion, Route, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const KEY = "canvasstack-welcome-seen";

const STEPS = [
  { icon: Layers, title: "Welcome to CanvasStack", body: "A Socratic co-pilot for your Business Model Canvas. It asks questions rather than giving answers, so you see what you're taking for granted. Everything stays in this browser; no sign-up needed." },
  { icon: MessageCircleQuestion, title: "Talk to the coach", body: "Answer the coach's questions on the left. It turns your answers into sticky notes, pushes back on vague answers, and highlights the underlying assumptions (desirability, feasibility, viability)." },
  { icon: LayoutGrid, title: "Your canvas", body: "Every note starts as an Untested hypothesis. Click a note to see its assumptions, edit it, or mark it Validated / Invalidated. Use the lightbulb on a block for suggested assumptions, and Check coherence to spot gaps and tensions." },
  { icon: FlaskConical, title: "Test what matters", body: "\"Identify My Riskiest Assumption\" picks the assumption most likely to sink the venture and drafts a Test Card. The Interview call sheet (Journey tab) prints a persona, screener and questions for customer interviews." },
  { icon: GitBranch, title: "Versions & journey", body: "Commit or fork canvas versions as you learn. The Journey tab shows pivots, lessons and next questions, and exports a PDF report of every version." },
  { icon: ScrollText, title: "Scenarios & log", body: "Save and load scenarios (two demos included: VeriTrace and LearnLoop). The Changelog & Decisions tab records every change and the decisions behind it." },
  { icon: Lightbulb, title: "Ready?", body: "Start with a blank canvas and answer the coach, or open Scenarios to explore a demo. You can reopen this tour any time with the Tour button in the header." },
];

export function WelcomeWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [i, setI] = useState(0);
  useEffect(() => { if (open) setI(0); }, [open]);
  const close = () => { localStorage.setItem(KEY, "1"); onOpenChange(false); };
  const st = STEPS[i]!;
  const last = i === STEPS.length - 1;
  const Icon = st.icon;
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 grid size-11 place-items-center rounded-lg bg-ink text-ink-foreground"><Icon className="size-5" /></div>
          <DialogTitle className="font-display text-xl">{st.title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{st.body}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1.5 py-1">
          {STEPS.map((_, k) => (
            <button key={k} aria-label={`Step ${k + 1}`} onClick={() => setI(k)} className={cn("h-1.5 rounded-full transition-all", k === i ? "w-6 bg-signal" : "w-1.5 bg-muted-foreground/30")} />
          ))}
        </div>
        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button variant="ghost" onClick={close}>Skip</Button>
          <div className="flex gap-2">
            {i > 0 && <Button variant="outline" onClick={() => setI(i - 1)}>Back</Button>}
            <Button onClick={() => (last ? close() : setI(i + 1))}>{last ? "Get started" : "Next"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const welcomeSeen = () => localStorage.getItem(KEY) === "1";
export { Route as TourIcon };
