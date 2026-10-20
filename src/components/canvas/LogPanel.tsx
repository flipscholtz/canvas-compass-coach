import { useMemo, useState } from "react";
import { Download, Gavel, History, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/lib/canvas/store";
import { BLOCKS, BLOCK_ORDER, type BlockId, type LogEntry } from "@/lib/canvas/types";

type Filter = "all" | "change" | "decision";

const CATEGORY_LABEL: Record<LogEntry["category"], string> = {
  added: "Added",
  edited: "Edited",
  removed: "Removed",
  status: "Status",
  version: "Version",
  test: "Test card",
  decision: "Decision",
  session: "Session",
};

function toMarkdown(log: LogEntry[], venture: string) {
  const line = (e: LogEntry) => {
    const head = `- **${new Date(e.at).toLocaleString()}** · ${e.version} · ${e.author} — ${e.summary}`;
    const extra = [e.rationale && `  - Why: ${e.rationale}`, e.alternatives && `  - Alternatives considered: ${e.alternatives}`];
    return [head, ...extra.filter(Boolean)].join("\n");
  };
  return [
    `# ${venture} — Decision log`,
    "",
    ...log.filter((e) => e.kind === "decision").map(line),
    "",
    `# Changelog`,
    "",
    ...log.filter((e) => e.kind === "change").map(line),
    "",
  ].join("\n");
}

export function LogPanel() {
  const s = useCanvasStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [rationale, setRationale] = useState("");
  const [alternatives, setAlternatives] = useState("");
  const [block, setBlock] = useState<BlockId | "none">("none");

  const entries = useMemo(() => (filter === "all" ? s.log : s.log.filter((e) => e.kind === filter)), [s.log, filter]);
  const groups = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const e of entries) {
      const day = new Date(e.at).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
      map.set(day, [...(map.get(day) ?? []), e]);
    }
    return [...map.entries()];
  }, [entries]);
  const decisions = s.log.filter((e) => e.kind === "decision").length;

  function exportMd() {
    const url = URL.createObjectURL(new Blob([toMarkdown(s.log, s.scenarioName)], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "canvasstack-log.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Changelog & Decision Log</h2>
          <p className="text-xs text-muted-foreground">
            {s.log.length - decisions} changes · {decisions} decisions — recorded automatically as the canvas evolves.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="author" className="text-[11px] text-muted-foreground">Logging as</Label>
            <Input id="author" value={s.author} onChange={(e) => s.setAuthor(e.target.value)} placeholder="Your name / role" className="h-8 w-44 text-xs" />
          </div>
          <Button size="sm" variant="outline" onClick={exportMd} disabled={!s.log.length}>
            <Download /> Export
          </Button>
          <Button size="sm" onClick={() => setFormOpen((o) => !o)}>
            <Plus /> Record decision
          </Button>
        </div>
      </div>

      {formOpen && (
        <form
          className="space-y-3 rounded-lg border bg-card p-4 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            s.addDecision({ summary: summary.trim(), rationale: rationale.trim(), alternatives: alternatives.trim(), ...(block !== "none" ? { block } : {}) });
            setSummary("");
            setRationale("");
            setAlternatives("");
            setBlock("none");
            setFormOpen(false);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
            <div className="space-y-1.5">
              <Label htmlFor="d-sum">What did you decide?</Label>
              <Input id="d-sum" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Target dental clinics before vets" />
            </div>
            <div className="space-y-1.5">
              <Label>Canvas block (optional)</Label>
              <Select value={block} onValueChange={(v) => setBlock(v as BlockId | "none")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Whole venture</SelectItem>
                  {BLOCK_ORDER.map((b) => (
                    <SelectItem key={b} value={b}>{BLOCKS[b].title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-why">Why? What evidence or signal drove it?</Label>
            <Textarea id="d-why" value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="e.g. 6 of 8 clinic managers own the admin budget; vets deferred to group HQ" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-alt">Alternatives considered (optional)</Label>
            <Input id="d-alt" value={alternatives} onChange={(e) => setAlternatives(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!summary.trim() || !rationale.trim()}>Save decision</Button>
          </div>
        </form>
      )}

      <div className="flex gap-1">
        {(["all", "decision", "change"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              filter === f ? "border-ink bg-ink text-ink-foreground" : "bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "all" ? "Everything" : f === "decision" ? "Decisions" : "Changes"}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          Nothing logged yet. Edits to the canvas, version commits, test cards and recorded decisions will appear here.
        </div>
      ) : (
        groups.map(([day, list]) => (
          <section key={day}>
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{day}</h3>
            <ol className="space-y-2">
              {list.map((e) => (
                <li
                  key={e.id}
                  className={cn(
                    "group flex gap-3 rounded-lg border bg-card p-3 shadow-card",
                    e.kind === "decision" && "border-l-4 border-l-signal",
                  )}
                >
                  <div className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", e.kind === "decision" ? "bg-signal text-signal-foreground" : "bg-muted text-muted-foreground")}>
                    {e.kind === "decision" ? <Gavel className="size-3.5" /> : <History className="size-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm leading-snug">{e.summary}</p>
                    {e.rationale && (
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Why: </span>{e.rationale}</p>
                    )}
                    {e.alternatives && (
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Alternatives: </span>{e.alternatives}</p>
                    )}
                    <p className="flex flex-wrap gap-x-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      <span>{new Date(e.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                      <span>· {e.author}</span>
                      <span>· {e.version}</span>
                      <span>· {CATEGORY_LABEL[e.category]}</span>
                      {e.block && <span>· {BLOCKS[e.block].title}</span>}
                    </p>
                  </div>
                  {e.category === "decision" && (
                    <button aria-label="Delete decision" onClick={() => s.removeLogEntry(e.id)} className="self-start text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
