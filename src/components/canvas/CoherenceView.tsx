import { useState } from "react";
import { ChevronDown, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BLOCKS, type CanvasItem } from "@/lib/canvas/types";
import { presentCoherence, THEME_LABEL, type CoherenceFinding, type CoherenceReport, type PresentedFinding } from "@/lib/canvas/coherence";

function status(item: CanvasItem) {
  if (item.status === "validated") return item.evidence ? { label: "Evidence recorded", cls: "text-valid" } : { label: "Marked validated · no evidence", cls: "text-signal" };
  if (item.status === "invalidated") return { label: "Invalidated", cls: "text-muted-foreground line-through" };
  return { label: "Untested hypothesis", cls: "text-muted-foreground" };
}

function Issue({ p, onFocus, open, toggle }: { p: PresentedFinding; onFocus: (f: CoherenceFinding) => void; open: boolean; toggle: () => void }) {
  const f = p.finding;
  return (
    <li className="rounded-md border bg-background">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-start gap-2 px-3 py-2 text-left">
        <span className={cn("mt-1 size-2 shrink-0 rounded-full", f.kind === "missing" ? "bg-signal" : "bg-muted-foreground")} />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium">{f.title}</span>
          <span className="block text-[11px] text-muted-foreground">{f.kind === "missing" ? "Missing" : "Possible inconsistency"} · {f.blocks.map((b) => BLOCKS[b].title).join(" ↔ ")}</span>
        </span>
        <ChevronDown className={cn("mt-0.5 size-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-1.5 border-t px-3 py-2 text-xs">
          <p><span className="font-medium">Why it matters: </span>{f.why}</p>
          <p><span className="font-medium">Next step: </span>{f.action}</p>
          {p.quotes.map(({ block, item }) => {
            const st = status(item);
            return <p key={item.id} className="text-[11px]">{BLOCKS[block].title}: “{item.text}” <span className={st.cls}>· {st.label}</span></p>;
          })}
          {p.seenElsewhere > 0 && <p className="text-[11px] text-muted-foreground">+{p.seenElsewhere} entr{p.seenElsewhere === 1 ? "y" : "ies"} quoted above</p>}
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onFocus(f)}><Crosshair className="size-3" /> Work on this</Button>
        </div>
      )}
    </li>
  );
}

export function CoherenceView({ report, onFocus }: { report: CoherenceReport; onFocus: (f: CoherenceFinding) => void }) {
  const view = presentCoherence(report);
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<string | null>(view.top[0]?.finding.id ?? null);
  const e = view.evidence;
  const item = (p: PresentedFinding) => <Issue key={p.finding.id} p={p} onFocus={onFocus} open={open === p.finding.id} toggle={() => setOpen((o) => (o === p.finding.id ? null : p.finding.id))} />;
  return (
    <div className="space-y-2" data-testid="coherence-report">
      {!all ? (
        <>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Top {view.top.length} gaps</p>
          <ul className="space-y-1.5">{view.top.map(item)}</ul>
        </>
      ) : (
        view.groups.map((g) => (
          <div key={g.theme} className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{THEME_LABEL[g.theme]}</p>
            <ul className="space-y-1.5">{g.findings.map(item)}</ul>
            {!!g.thinBlocks.length && (
              <p className="text-[11px] text-muted-foreground">Still thin: {g.thinBlocks.map((f) => (
                <button key={f.id} type="button" className="mr-2 underline underline-offset-2" onClick={() => onFocus(f)}>{BLOCKS[f.blocks[0]!].title}</button>
              ))}</p>
            )}
          </div>
        ))
      )}
      <p className="text-[11px] text-muted-foreground">
        Evidence: {e.untested} untested · {e.evidenced} with evidence{e.unsupported ? ` · ${e.unsupported} marked validated without evidence` : ""}{e.invalidated ? ` · ${e.invalidated} invalidated` : ""}. Untested entries are not treated as facts.
      </p>
      <Button type="button" variant="link" className="h-auto p-0 text-xs text-signal" onClick={() => setAll((a) => !a)}>
        {all ? "Show top gaps only" : "See all issues by theme"}
      </Button>
    </div>
  );
}
