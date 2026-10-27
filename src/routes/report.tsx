import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/lib/canvas/store";
import { analyzeJourney } from "@/lib/canvas/journey";
import { BLOCKS, type BlockId, type Canvas } from "@/lib/canvas/types";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "BMC Report — CanvasStack" },
      { name: "description", content: "Printable Business Model Canvas report with every version and the journey between them." },
      { property: "og:title", content: "BMC Report — CanvasStack" },
      { property: "og:description", content: "Canvas versions, pivots and insights in one printable report." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportPage,
});

const AREA: Record<BlockId, string> = {
  keyPartners: "1 / 1 / 3 / 3", keyActivities: "1 / 3 / 2 / 5", keyResources: "2 / 3 / 3 / 5",
  valueProps: "1 / 5 / 3 / 7", relationships: "1 / 7 / 2 / 9", channels: "2 / 7 / 3 / 9",
  segments: "1 / 9 / 3 / 11", costs: "3 / 1 / 4 / 6", revenue: "3 / 6 / 4 / 11",
};
const DOT = { hypothesis: "bg-hypo", validated: "bg-valid", invalidated: "bg-invalid" } as const;

function ReportPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => { Promise.resolve(useCanvasStore.persist.rehydrate()).then(() => setReady(true)); }, []);
  if (!ready) return <div className="min-h-screen bg-background" />;
  return <Report />;
}

function MiniCanvas({ canvas }: { canvas: Canvas }) {
  return (
    <div className="grid gap-1 text-[9px] leading-snug" style={{ gridTemplateColumns: "repeat(10, 1fr)", gridTemplateRows: "auto auto auto" }}>
      {(Object.keys(AREA) as BlockId[]).map((b) => (
        <div key={b} style={{ gridArea: AREA[b] }} className="min-h-20 rounded border bg-card p-1.5">
          <div className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">{BLOCKS[b].title}</div>
          <ul className="space-y-0.5">
            {(canvas[b] ?? []).map((it) => (
              <li key={it.id} className="flex gap-1"><span className={`mt-1 size-1.5 shrink-0 rounded-full ${DOT[it.status]}`} />{it.text}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Report() {
  const s = useCanvasStore();
  const j = useMemo(() => analyzeJourney(s.versions, s.cards), [s.versions, s.cards]);
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="report min-h-screen bg-muted/40 py-8 print:bg-background print:py-0">
      <style>{`@page { size: A4 landscape; margin: 12mm; } @media print { .report * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { break-after: page; box-shadow: none !important; } .avoid { break-inside: avoid; } }`}</style>
      <div className="mx-auto mb-4 flex max-w-5xl justify-between px-4 print:hidden">
        <Button variant="outline" size="sm" asChild><Link to="/"><ArrowLeft /> Back to app</Link></Button>
        <Button size="sm" onClick={() => window.print()} className="bg-signal text-signal-foreground hover:bg-signal/90"><Printer /> Print / Save as PDF</Button>
      </div>

      <section className="page mx-auto mb-6 max-w-5xl rounded-lg bg-paper p-10 shadow print:p-0">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">Business Model Canvas Report</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">{s.scenarioName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{today} · {s.versions.length} version{s.versions.length !== 1 && "s"} · {s.cards.length} test card{s.cards.length !== 1 && "s"}</p>
        <h2 className="mt-8 font-display text-xl font-semibold">The journey</h2>
        <ol className="mt-3 space-y-2 border-l-2 border-signal pl-4">
          {s.versions.map((v) => (
            <li key={v.id} className="text-sm"><b className="font-mono">{v.label}</b> — {v.note}</li>
          ))}
        </ol>
        {j.transitions.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {j.transitions.map((t) => (
              <div key={t.to} className="avoid rounded border bg-card p-3 text-xs">
                <div className="font-medium">{t.from} → {t.to} {t.pivotBlocks.length > 0 && <span className="ml-1 rounded bg-signal px-1.5 text-[10px] text-signal-foreground">PIVOT</span>}</div>
                <div className="text-muted-foreground">+{t.added.length} added · −{t.removed.length} removed</div>
                {t.removed.slice(0, 3).map((r, i) => <div key={i} className="text-invalid">− {BLOCKS[r.block].title}: {r.text}</div>)}
                {t.added.slice(0, 3).map((a, i) => <div key={i} className="text-valid">+ {BLOCKS[a.block].title}: {a.text}</div>)}
              </div>
            ))}
          </div>
        )}
      </section>

      {s.versions.map((v) => (
        <section key={v.id} className="page mx-auto mb-6 max-w-5xl rounded-lg bg-paper p-8 shadow print:p-0">
          <div className="mb-3 flex items-baseline justify-between border-b pb-2">
            <h2 className="font-display text-2xl font-semibold">{v.label}</h2>
            <span className="text-xs text-muted-foreground">{v.note}</span>
          </div>
          <MiniCanvas canvas={v.canvas} />
          <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground">
            <span><span className="mr-1 inline-block size-2 rounded-full bg-hypo" />Untested</span>
            <span><span className="mr-1 inline-block size-2 rounded-full bg-valid" />Validated</span>
            <span><span className="mr-1 inline-block size-2 rounded-full bg-invalid" />Invalidated</span>
          </div>
        </section>
      ))}

      <section className="page mx-auto max-w-5xl rounded-lg bg-paper p-10 shadow print:p-0">
        <h2 className="font-display text-2xl font-semibold">Insights & next direction</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {j.insights.map((ins, i) => (
            <div key={i} className="avoid rounded border bg-card p-3 text-xs"><div className="font-medium">{ins.title}</div><div className="text-muted-foreground">{ins.detail}</div></div>
          ))}
        </div>
        <h3 className="mt-6 font-display text-lg font-semibold">Questions to answer next</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{j.directions.map((d, i) => <li key={i}>{d}</li>)}</ul>
        <p className="mt-8 text-[10px] text-muted-foreground">Generated by CanvasStack. Coaching heuristic only; not professional legal, financial or regulatory advice.</p>
      </section>
    </div>
  );
}
