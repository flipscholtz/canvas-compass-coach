import { useState } from "react";
import { GitBranch, GitCommitHorizontal, History, Download, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/lib/canvas/store";
import { exportJson, exportMarkdown } from "@/lib/canvas/export";
import { BLOCK_ORDER, BLOCKS, type BlockId } from "@/lib/canvas/types";
import { MIN_FILLED_BLOCKS, PATTERN_SOURCE, PATTERNS, blocksForPivot, filledBlocks, suggestPattern } from "@/lib/canvas/patterns";

function nextLabel(count: number, pivot: boolean, lastLabel: string) {
  const m = lastLabel.match(/v(\d+)\.(\d+)/);
  const [maj, min] = m ? [Number(m[1]), Number(m[2])] : [1, count - 1];
  return pivot ? `v${maj + 1}.0` : `v${maj}.${min + 1}`;
}

export function StackBar() {
  const s = useCanvasStore();
  const [mode, setMode] = useState<null | "commit" | "pivot">(null);
  const [timeline, setTimeline] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [pivotPath, setPivotPath] = useState<null | "known" | "pattern">(null);
  const head = s.versions[s.versions.length - 1]!;
  const filled = filledBlocks(head.canvas).length;
  const sugg = pivotPath === "pattern" ? suggestPattern(head.canvas) : null;
  const focus: BlockId[] = mode !== "pivot" ? [] : sugg ? sugg.changes : blocksForPivot(title);
  const close = () => { setTitle(""); setNote(""); setMode(null); setPivotPath(null); };
  const headId = s.versions[s.versions.length - 1]!.id;
  const activeId = s.viewingId ?? headId;

  const download = (name: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-signal" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Stack depth: <span className="text-foreground">{s.versions.length} canvas{s.versions.length > 1 ? "es" : ""}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setTimeline(true)}>
            <History /> Timeline
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMode("commit")}>
            <GitCommitHorizontal /> Commit snapshot
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMode("pivot")}>
            <GitBranch /> Fork pivot
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Download /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => download("canvasstack.json", exportJson(s), "application/json")}>
                Full stack as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => download("canvasstack.md", exportMarkdown(s), "text/markdown")}>
                Markdown summary
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-end gap-1 overflow-x-auto pb-1">
        {s.versions.map((v, idx) => {
          const active = v.id === activeId;
          const isHead = v.id === headId;
          return (
            <button
              key={v.id}
              onClick={() => s.setViewing(isHead ? null : v.id)}
              className={cn(
                "relative shrink-0 rounded-t-lg border border-b-0 px-3 py-2 text-left transition-all",
                active ? "bg-card pb-3 shadow-card" : "bg-muted text-muted-foreground hover:bg-secondary",
              )}
              style={{ zIndex: idx }}
            >
              <span className="block font-mono text-[10px] uppercase tracking-wider">
                {isHead ? "Working" : "Snapshot"}
              </span>
              <span className="block max-w-48 truncate text-xs font-medium">{v.label}</span>
              {active && <span className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-signal" />}
            </button>
          );
        })}
      </div>

      <Dialog open={!!mode} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{mode === "pivot" ? "Fork a new pivot" : "Commit version & snapshot"}</DialogTitle>
            <DialogDescription>
              The current canvas stays unchanged as a snapshot and a new working copy is stacked on top.
            </DialogDescription>
          </DialogHeader>
          {mode === "pivot" && !pivotPath ? (
            <div className="grid gap-2">
              <Button variant="outline" className="h-auto justify-start py-3 text-left" onClick={() => setPivotPath("known")}>
                <span><b className="block">I know my pivot</b><span className="text-xs text-muted-foreground">Name it in one line and fork straight away.</span></span>
              </Button>
              <Button variant="outline" disabled={filled < MIN_FILLED_BLOCKS} className="h-auto justify-start py-3 text-left" onClick={() => setPivotPath("pattern")}>
                <span><b className="block">Suggest a pattern</b><span className="text-xs text-muted-foreground">The coach compares your canvas to known business model patterns.</span></span>
              </Button>
              {filled < MIN_FILLED_BLOCKS && (
                <p className="text-xs text-muted-foreground">Fill at least {MIN_FILLED_BLOCKS} blocks first ({filled} so far) — a pattern can't be read from a thin canvas.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sugg && (
                <div className="space-y-2 rounded-md border bg-muted/50 p-3 text-sm">
                  <p>{sugg.why}</p>
                  <p>Alternative to explore: <b>{PATTERNS[sugg.alternative].name}</b>.</p>
                  <p className="font-medium">{sugg.question}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">Source: {PATTERN_SOURCE}</p>
                </div>
              )}
              {!sugg && (
                <div className="space-y-1.5">
                  <Label htmlFor="vtitle">{mode === "pivot" ? "Name your pivot in one line" : "Version name"}</Label>
                  <Input id="vtitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={mode === "pivot" ? "e.g. new customer segment" : "e.g. Post-Interview Pivot"} />
                </div>
              )}
              {focus.length > 0 && (
                <p className="text-xs text-muted-foreground">Blocks to rewrite yourself: <span className="text-foreground">{focus.map((b) => BLOCKS[b].title).join(", ")}</span></p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="vnote">{mode === "pivot" ? "One-line reason for this pivot" : "What hypothesis or market signal triggered this?"}</Label>
                <Input id="vnote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 6 of 8 interviewees had no budget" />
              </div>
            </div>
          )}
          {(mode === "commit" || pivotPath) && (
            <DialogFooter>
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button
                disabled={!note.trim() || (pivotPath === "known" && !title.trim())}
                onClick={() => {
                  const ver = nextLabel(s.versions.length, mode === "pivot", head.label);
                  const name = sugg ? `${PATTERNS[sugg.alternative].short} pattern` : title.trim() || (mode === "pivot" ? "Pivot" : "Iteration");
                  s.commitVersion(`${ver} · ${name}`, note.trim(), focus);
                  close();
                }}
              >
                {mode === "pivot" ? "Create fork" : "Commit"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={timeline} onOpenChange={setTimeline}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Venture timeline</DialogTitle>
            <DialogDescription>How the business model evolved from Day 1.</DialogDescription>
          </DialogHeader>
          <ol className="relative ml-2 border-l pl-5">
            {s.versions.map((v) => {
              const items = BLOCK_ORDER.flatMap((b) => v.canvas[b]);
              const count = (st: string) => items.filter((i) => i.status === st).length;
              return (
                <li key={v.id} className="mb-6 last:mb-0">
                  <span className="absolute -left-1.5 mt-1 size-3 rounded-full border-2 border-paper bg-signal" />
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">
                    {new Date(v.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                  <p className="font-display font-semibold">{v.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{v.note}</p>
                  <p className="mt-2 flex gap-3 text-xs">
                    <span className="text-hypo">● {count("hypothesis")} untested</span>
                    <span className="text-valid">● {count("validated")} validated</span>
                    <span className="text-invalid">● {count("invalidated")} invalidated</span>
                  </p>
                </li>
              );
            })}
          </ol>
        </DialogContent>
      </Dialog>
    </div>
  );
}
