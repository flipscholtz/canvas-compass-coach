import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCanvasStore } from "@/lib/canvas/store";
import { blockTitle, buildCallSheet, listAssumptions } from "@/lib/canvas/callsheet";

export const Route = createFileRoute("/_authenticated/callsheet")({
  head: () => ({
    meta: [
      { title: "Experiment Designer | CanvasStack" },
      { name: "description", content: "Pick assumptions from your canvas and print an interview call sheet with persona, screener and questions." },
      { property: "og:title", content: "Experiment Designer | CanvasStack" },
      { property: "og:description", content: "Turn untested canvas assumptions into a printable interview plan." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const [ready, setReady] = useState(false);
  useEffect(() => { Promise.resolve(useCanvasStore.persist.rehydrate()).then(() => setReady(true)); }, []);
  if (!ready) return <div className="min-h-screen bg-background" />;
  return <Designer />;
}

const LENS_CLS = { desirability: "bg-signal/15 text-signal", feasibility: "bg-muted text-foreground", viability: "bg-valid/15 text-valid" } as const;

function Designer() {
  const s = useCanvasStore();
  const version = s.viewingId ? s.versions.find((v) => v.id === s.viewingId) : s.versions.at(-1);
  const options = useMemo(() => (version ? listAssumptions(version.canvas) : []), [version]);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(options.slice(0, 3).map((o) => o.key)));
  const selected = options.filter((o) => picked.has(o.key));
  const sheet = version ? buildCallSheet(version.canvas, selected) : null;
  const toggle = (k: string) => setPicked((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div className="min-h-screen bg-muted/40 py-8 print:bg-transparent print:py-0">
      <style>{`@media print { @page { size: A4 portrait; margin: 14mm; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .avoid { break-inside: avoid; } }`}</style>
      <div className="mx-auto max-w-3xl space-y-6 px-4 print:max-w-none print:px-0">
        <div className="flex items-center justify-between print:hidden">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to canvas</Link>
          <Button onClick={() => window.print()} disabled={!selected.length}><Printer className="size-4" /> Print / Save as PDF</Button>
        </div>

        <section className="rounded-lg border bg-card p-5 print:hidden">
          <h1 className="font-display text-xl font-semibold">Experiment designer</h1>
          <p className="mb-3 text-sm text-muted-foreground">Choose the untested assumptions these interviews should interrogate ({version?.label ?? "no canvas"}).</p>
          {options.length === 0 ? <p className="text-sm">No untested assumptions on this canvas yet. Add some sticky notes first.</p> : (
            <ul className="max-h-72 space-y-1.5 overflow-auto">
              {options.map((o) => (
                <li key={o.key}>
                  <label className="flex cursor-pointer items-start gap-2 rounded p-1.5 text-sm hover:bg-muted">
                    <Checkbox checked={picked.has(o.key)} onCheckedChange={() => toggle(o.key)} className="mt-0.5" />
                    <span><span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${LENS_CLS[o.lens]}`}>{o.lens}</span>
                      <span className="text-muted-foreground">{blockTitle(o.block)}:</span> {o.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        {sheet && selected.length > 0 && (
          <article className="space-y-5 rounded-lg border bg-card p-8 text-sm print:border-0 print:p-0">
            <header className="border-b pb-3">
              <div className="font-mono text-xs uppercase tracking-widest text-signal">Experiment designer</div>
              <h2 className="font-display text-2xl font-semibold">{s.scenarioName || "Untitled venture"}</h2>
              <p className="text-muted-foreground">{version?.label} · {new Date().toLocaleDateString()} · {sheet.goal}</p>
            </header>

            <div className="avoid grid gap-4 sm:grid-cols-2 print:grid-cols-2">
              <Box title="Ideal persona">
                <p className="mb-2 font-medium">{sheet.persona.who}</p>
                <List items={sheet.persona.mustHave} />
                <div className="mt-2 text-xs font-semibold uppercase text-muted-foreground">Avoid</div>
                <List items={sheet.persona.avoid} />
              </Box>
              <Box title="Screener"><List items={sheet.screener} ordered /></Box>
            </div>

            <Box title="Opening (2 min)"><List items={sheet.opening} /></Box>

            {sheet.sections.map((sec, i) => (
              <section key={sec.assumption.key} className="avoid rounded border p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">A{i + 1}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${LENS_CLS[sec.assumption.lens]}`}>{sec.assumption.lens}</span>
                  <span className="text-xs text-muted-foreground">{blockTitle(sec.assumption.block)}</span>
                </div>
                <p className="mb-2 font-display text-base font-semibold">We assume: {sec.assumption.text}</p>
                <List items={sec.questions} ordered />
                <div className="mt-3 grid gap-3 sm:grid-cols-2 print:grid-cols-2">
                  <div><div className="text-xs font-semibold uppercase text-valid">Supports it</div><List items={sec.signals.confirm} /></div>
                  <div><div className="text-xs font-semibold uppercase text-invalid">Contradicts it</div><List items={sec.signals.refute} /></div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">Verdict: ☐ Supported ☐ Contradicted ☐ Unclear · Notes: ____________________________</div>
              </section>
            ))}

            <div className="avoid grid gap-4 sm:grid-cols-2 print:grid-cols-2">
              <Box title="Closing"><List items={sheet.closing} /></Box>
              <Box title="Logistics"><List items={sheet.logistics} /></Box>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="avoid rounded border p-4"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>{children}</section>;
}
function List({ items, ordered }: { items: string[]; ordered?: boolean }) {
  const C = ordered ? "ol" : "ul";
  return <C className={`space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}>{items.map((t) => <li key={t}>{t}</li>)}</C>;
}
