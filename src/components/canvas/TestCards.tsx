import { FlaskConical, Trash2, ChevronDown, FileDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/lib/canvas/store";
import { useRiskiest } from "./useRiskiest";
import { LENS_STYLE } from "./AssumptionChip";
import { BLOCKS } from "@/lib/canvas/types";


export function TestCards() {
  const s = useCanvasStore();
  const open = s.drawerOpen;
  const onToggle = () => s.setDrawerOpen(!open);
  const identifyRiskiest = useRiskiest();

  return (
    <div className="rounded-lg border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <button onClick={onToggle} className="flex items-center gap-2">
          <FlaskConical className="size-4 text-signal" />
          <span className="font-display font-semibold">Test Cards</span>
          <span className="rounded-full bg-muted px-2 font-mono text-[10px]">{s.cards.length}</span>
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
        <div className="flex items-center gap-2">
          <Link to="/callsheet" className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"><FileDown className="size-3.5" /> Experiment designer</Link>
          <Button size="sm" variant="outline" onClick={identifyRiskiest}>
            Extract & Test Riskiest Assumption
          </Button>
        </div>
      </div>
      {open && (
        <div className="grid gap-3 border-t p-4 md:grid-cols-2">
          {s.cards.length === 0 && (
            <p className="text-sm text-muted-foreground md:col-span-2">
              No experiments yet. Every yellow sticky is a guess — turn the riskiest one into a test.
            </p>
          )}
          {s.cards.map((c) => (
            <article key={c.id} className={cn("rounded-md border bg-background p-3 text-sm", s.highlightCardId === c.id && "border-signal ring-2 ring-signal/30")}>
              <header className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-signal">
                    {BLOCKS[c.block].title}
                    {c.lens && <span className={cn("rounded px-1 py-px", LENS_STYLE[c.lens])}>{c.lens}</span>}
                  </p>
                  <h4 className="font-medium leading-snug">{c.title}</h4>
                </div>
                <button aria-label="Delete test card" onClick={() => s.removeCard(c.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              </header>
              <dl className="space-y-1.5 text-xs">
                {[
                  ["Hypothesis", c.hypothesis],
                  ["Experiment", c.experiment],
                  ["Metric", c.metric],
                  ["Criteria", c.criteria],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[72px_1fr] gap-2">
                    <dt className="font-mono text-[10px] uppercase text-muted-foreground">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
