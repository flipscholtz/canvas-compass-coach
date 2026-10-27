import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { FileDown } from "lucide-react";
import { ArrowRight, Compass, Flag, Lightbulb, Mountain, Shuffle, EyeOff, CircleDashed } from "lucide-react";
import { useCanvasStore } from "@/lib/canvas/store";
import { analyzeJourney, type Insight } from "@/lib/canvas/journey";
import { BLOCKS, BLOCK_ORDER } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

const ICON: Record<Insight["kind"], typeof Flag> = {
  pivot: Shuffle, learning: Lightbulb, foundation: Mountain, unstable: Flag, blindspot: EyeOff, untouched: CircleDashed,
};
const TONE: Record<Insight["kind"], string> = {
  pivot: "border-signal/40 bg-signal/5", learning: "border-invalid/40 bg-invalid/5", foundation: "border-valid/40 bg-valid/5",
  unstable: "border-hypo/50 bg-hypo/10", blindspot: "border-hypo/50 bg-hypo/10", untouched: "border-border bg-muted/40",
};

export function JourneyPanel() {
  const versions = useCanvasStore((s) => s.versions);
  const cards = useCanvasStore((s) => s.cards);
  const j = useMemo(() => analyzeJourney(versions, cards), [versions, cards]);
  const maxChurn = Math.max(1, ...Object.values(j.churn));

  return (
    <div className="space-y-5 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
      <div>
        <h2 className="font-display text-lg font-semibold">Business model journey</h2>
        <p className="text-xs text-muted-foreground">What {versions.length} version{versions.length !== 1 && "s"} of your canvas reveal — and where to look next.</p>
      </div>
        <div className="flex shrink-0 gap-2">
          <Link to="/callsheet" className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"><FileDown className="size-3.5" /> Interview call sheet</Link>
          <Link to="/report" className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"><FileDown className="size-3.5" /> PDF report</Link>
        </div>
      </div>

      <ol className="flex flex-wrap items-center gap-2 text-xs">
        {versions.map((v, i) => (
          <li key={v.id} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="size-3 text-muted-foreground" />}
            <span className="rounded-md border bg-paper px-2 py-1"><b className="font-mono">{v.label}</b> · {v.note}</span>
          </li>
        ))}
      </ol>

      {j.transitions.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Each step</h3>
          {j.transitions.map((t) => (
            <div key={t.to} className="rounded-md border p-3 text-xs">
              <div className="mb-1 font-medium">{t.from} → {t.to} {t.pivotBlocks.length > 0 && <span className="ml-1 rounded bg-signal px-1.5 py-0.5 text-[10px] text-signal-foreground">PIVOT</span>}</div>
              <div className="text-muted-foreground">+{t.added.length} added · −{t.removed.length} removed</div>
              {t.removed.slice(0, 4).map((r, i) => <div key={"r" + i} className="text-invalid">− {BLOCKS[r.block].title}: {r.text}</div>)}
              {t.added.slice(0, 4).map((a, i) => <div key={"a" + i} className="text-valid">+ {BLOCKS[a.block].title}: {a.text}</div>)}
            </div>
          ))}
        </section>
      )}

      {j.transitions.length > 0 && (
        <section className="space-y-1">
          <h3 className="text-sm font-semibold">Where you changed your mind most</h3>
          {BLOCK_ORDER.filter((b) => j.churn[b] > 0).sort((a, b) => j.churn[b] - j.churn[a]).map((b) => (
            <div key={b} className="flex items-center gap-2 text-xs">
              <span className="w-32 shrink-0">{BLOCKS[b].title}</span>
              <div className="h-2 flex-1 rounded bg-muted"><div className="h-2 rounded bg-signal" style={{ width: `${(j.churn[b] / maxChurn) * 100}%` }} /></div>
              <span className="w-6 text-right font-mono">{j.churn[b]}</span>
            </div>
          ))}
        </section>
      )}

      {j.insights.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Insights</h3>
          {j.insights.map((ins, i) => {
            const I = ICON[ins.kind];
            return (
              <div key={i} className={cn("flex gap-2 rounded-md border p-3 text-xs", TONE[ins.kind])}>
                <I className="mt-0.5 size-4 shrink-0" />
                <div><div className="font-medium">{ins.title}</div><div className="text-muted-foreground">{ins.detail}</div></div>
              </div>
            );
          })}
        </section>
      )}

      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Compass className="size-4" /> Questions for your next direction</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">{j.directions.map((d, i) => <li key={i}>{d}</li>)}</ul>
      </section>
    </div>
  );
}
