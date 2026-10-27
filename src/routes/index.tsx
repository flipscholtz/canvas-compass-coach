import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, Layers, PanelLeftClose, PanelLeftOpen, RotateCcw, Settings, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/lib/canvas/store";
import { ChatPane } from "@/components/canvas/ChatPane";
import { CanvasGrid } from "@/components/canvas/CanvasGrid";
import { StackBar } from "@/components/canvas/StackBar";
import { TestCards } from "@/components/canvas/TestCards";
import { LogPanel } from "@/components/canvas/LogPanel";
import { JourneyPanel } from "@/components/canvas/JourneyPanel";
import { SuggestAllButton } from "@/components/canvas/SuggestAllButton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CanvasStack — The Socratic BMC Co-Pilot" },
      { name: "description", content: "A Socratic AI venture coach that stress-tests your Business Model Canvas as a versioned stack of hypotheses." },
      { property: "og:title", content: "CanvasStack — The Socratic BMC Co-Pilot" },
      { property: "og:description", content: "Challenge assumptions, version your canvas, and design Strategyzer test cards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.resolve(useCanvasStore.persist.rehydrate()).then(() => setReady(true));
  }, []);
  if (!ready) return <div className="min-h-screen bg-background" />;
  return <App />;
}

function App() {
  const s = useCanvasStore();
  const [tab, setTab] = useState<"chat" | "right">("chat");
  const [rightView, setRightView] = useState<"canvas" | "journey" | "log">("canvas");
  const [coachOpen, setCoachOpen] = useState(true);
  const [settings, setSettings] = useState(false);
  const [key, setKey] = useState(s.apiKey);
  const [model, setModel] = useState(s.model);

  const viewIdx = s.viewingId ? s.versions.findIndex((v) => v.id === s.viewingId) : s.versions.length - 1;
  const viewing = s.versions[Math.max(0, viewIdx)]!;
  const readOnly = !!s.viewingId;
  const prev = readOnly && viewIdx > 0 ? s.versions[viewIdx - 1]!.canvas : undefined;

  return (
    <div className="flex h-dvh flex-col">
      <Toaster position="top-center" />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-paper px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-ink text-ink-foreground">
            <Layers className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold leading-none">
              CanvasStack <span className="text-muted-foreground">· Socratic BMC Co-Pilot</span>
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {s.scenarioName} · <span className="font-mono">Guest mode</span>
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="default" onClick={s.loadDemo} className="bg-signal text-signal-foreground hover:bg-signal/90">
            <Sparkle /> Load Demo Scenario
          </Button>
          <Button size="sm" variant="outline" onClick={() => confirm("Clear the canvas stack and restart intake?") && s.reset()}>
            <RotateCcw /> Reset
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="hidden size-8 lg:inline-flex"
            aria-label={coachOpen ? "Collapse coach panel" : "Expand coach panel"}
            title={coachOpen ? "Collapse coach panel" : "Expand coach panel"}
            onClick={() => setCoachOpen((o) => !o)}
          >
            {coachOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          </Button>
          <Button size="icon" variant="outline" className="size-8" aria-label="Settings" onClick={() => { setKey(s.apiKey); setModel(s.model); setSettings(true); }}>
            <Settings />
          </Button>
        </div>
      </header>

      <div className="border-b bg-paper px-4 py-2 lg:hidden">
        <Tabs
          value={tab === "chat" ? "chat" : rightView}
          onValueChange={(v) => {
            if (v === "chat") setTab("chat");
            else {
              setTab("right");
              setRightView(v as "canvas" | "journey" | "log");
            }
          }}
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat">Coach</TabsTrigger>
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="journey">Journey</TabsTrigger>
            <TabsTrigger value="log">Log</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <main className={cn("grid min-h-0 flex-1", coachOpen && "lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)]")}>
        <div className={cn("min-h-0 border-r", tab !== "chat" && "hidden lg:block", !coachOpen && "lg:hidden")}>
          <ChatPane />
        </div>
        <div className={cn("min-h-0 overflow-y-auto grid-paper", tab !== "right" && "hidden lg:block")}>
          <div className="space-y-3 p-4 lg:p-6">
            <div className="hidden gap-1 border-b lg:flex">
              {(["canvas", "journey", "log"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setRightView(v)}
                  className={cn(
                    "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                    rightView === v ? "border-signal text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v === "canvas" ? "Canvas" : v === "journey" ? "Journey" : "Changelog & Decisions"}
                  {v === "log" && s.log.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 font-mono text-[10px]">{s.log.length}</span>
                  )}
                </button>
              ))}
            </div>
            {rightView === "journey" ? (
              <JourneyPanel />
            ) : rightView === "log" ? (
              <LogPanel />
            ) : (
            <>
            <StackBar />
            {readOnly && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-accent px-3 py-2 text-xs text-accent-foreground">
                <span className="flex items-center gap-2">
                  <Eye className="size-3.5" /> Read-only snapshot · <em>{viewing.note}</em>
                  {prev && <span className="text-valid">· ring = added since previous · dashed = removed</span>}
                </span>
                <button className="font-medium underline" onClick={() => s.setViewing(null)}>
                  Back to working canvas
                </button>
              </div>
            )}
            <CanvasGrid canvas={viewing.canvas} prev={prev} readOnly={readOnly} />
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
              <span><span className="mr-1 inline-block size-2 rounded-full bg-hypo" />Untested hypothesis</span>
              <span><span className="mr-1 inline-block size-2 rounded-full bg-valid" />Validated with evidence</span>
              <span><span className="mr-1 inline-block size-2 rounded-full bg-invalid" />Invalidated</span>
            </div>
            {!readOnly && <SuggestAllButton />}
            </div>
            <TestCards />
            </>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t bg-paper px-4 py-2 text-center text-[11px] text-muted-foreground">
        Coaching heuristic only. Does not replace professional legal, financial, or regulatory counsel.
      </footer>

      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Coach runtime</DialogTitle>
            <DialogDescription>
              Leave the key empty to use the offline, rule-based demo coach. Your key is stored only in this browser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="key">OpenAI API key (optional)</Label>
              <Input id="key" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-…" />
            </div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                  <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { s.setSettings(key.trim(), model); setSettings(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
