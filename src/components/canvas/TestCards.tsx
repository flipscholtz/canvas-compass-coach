import { FlaskConical, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/lib/canvas/store";
import { generateTestCard, riskiestAssumption } from "@/lib/canvas/coach";
import { BLOCKS } from "@/lib/canvas/types";


export function TestCards({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const s = useCanvasStore();
  const head = s.versions[s.versions.length - 1]!.canvas;

  function generate() {
    const r = riskiestAssumption(head, s.cards);
    if (!r) { toast("No untested assumptions left to test."); return; }
    const seg = head.segments.find((i) => i.status !== "invalidated")?.text;
    s.addCard(generateTestCard(r.block, r.item.text, seg));
    if (!open) onToggle();
    toast.success(`Test card drafted for ${BLOCKS[r.block].title}`);
  }

  return (
    <div className="rounded-lg border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <button onClick={onToggle} className="flex items-center gap-2">
          <FlaskConical className="size-4 text-signal" />
          <span className="font-display font-semibold">Test Cards</span>
          <span className="rounded-full bg-muted px-2 font-mono text-[10px]">{s.cards.length}</span>
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
        <Button size="sm" variant="outline" onClick={generate}>
          Generate Test Card from Riskiest Assumption
        </Button>
      </div>
      {open && (
        <div className="grid gap-3 border-t p-4 md:grid-cols-2">
          {s.cards.length === 0 && (
            <p className="text-sm text-muted-foreground md:col-span-2">
              No experiments yet. Every yellow sticky is a guess — turn the riskiest one into a test.
            </p>
          )}
          {s.cards.map((c) => (
            <article key={c.id} className="rounded-md border bg-background p-3 text-sm">
              <header className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-signal">{BLOCKS[c.block].title}</p>
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
