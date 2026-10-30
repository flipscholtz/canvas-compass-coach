import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Info, Eye, Layers, Settings, Compass, X, ChevronDown, Route as JourneyIcon, FlaskConical, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCanvasFeedback } from "@/components/canvas/useCanvasFeedback";
import { STAGES } from "@/lib/canvas/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/lib/canvas/store";
import { ChatPane } from "@/components/canvas/ChatPane";
import { CanvasGrid } from "@/components/canvas/CanvasGrid";
import { StackBar } from "@/components/canvas/StackBar";
import { TestCards } from "@/components/canvas/TestCards";
import { LogPanel } from "@/components/canvas/LogPanel";
import { JourneyPanel } from "@/components/canvas/JourneyPanel";
import { ScenarioMenu } from "@/components/canvas/ScenarioMenu";
import { WelcomeWizard, welcomeSeen, TourIcon } from "@/components/canvas/WelcomeWizard";
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
  const mobile = useIsMobile();
  const [vv, setVv] = useState({ height: 844, bottom: 0, keyboard: false });
  useEffect(() => {
    const v = window.visualViewport;
    const update = () => {
      const h = v ? v.height : window.innerHeight;
      const bottom = v ? Math.max(0, window.innerHeight - v.height - v.offsetTop) : 0;
      setVv({ height: Math.round(h), bottom: Math.round(bottom), keyboard: bottom > 80 });
    };
    update();
    v?.addEventListener("resize", update); v?.addEventListener("scroll", update); window.addEventListener("resize", update);
    return () => { v?.removeEventListener("resize", update); v?.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  const { activeBlock, flashing } = useCanvasFeedback();
  const [rightView, setRightView] = useState<"canvas" | "journey" | "log" | "tests">("canvas");
  const [coachOpen, setCoachOpen] = useState(true);
  const [mobileCoach, setMobileCoach] = useState(false);
  const [settings, setSettings] = useState(false);
  const [tour, setTour] = useState(false);
  useEffect(() => { if (!welcomeSeen()) setTour(true); }, []);
  useEffect(() => { if (tour) { setRightView("canvas"); setCoachOpen(true); } }, [tour]);
  const [key, setKey] = useState(s.apiKey);
  const [model, setModel] = useState(s.model);

  const viewIdx = s.viewingId ? s.versions.findIndex((v) => v.id === s.viewingId) : s.versions.length - 1;
  const viewing = s.versions[Math.max(0, viewIdx)];
  const readOnly = !!s.viewingId;
  const prev = readOnly && viewIdx > 0 ? s.versions[viewIdx - 1]?.canvas : undefined;

  if (!viewing) return null;
  const stage = STAGES.find((st) => st.id === s.stage);
  const coachVisible = mobile ? mobileCoach : coachOpen;
  const stageMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><button type="button" className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground md:min-h-0 md:text-[10px]" aria-label="Show all stages">Stage {s.stage} of 5 · {stage?.short} <ChevronDown className="size-3" /></button></DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {STAGES.map((st) => <DropdownMenuItem key={st.id} className={cn("min-h-11 md:min-h-0", st.id === s.stage && "font-semibold text-signal")}>{st.id}. {st.label}{st.id === s.stage ? " · current" : ""}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden overscroll-none">
      <Toaster position="top-center" offset="max(16px, env(safe-area-inset-top))" />
      <WelcomeWizard open={tour} onOpenChange={setTour} />
      <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b bg-paper px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:flex sm:justify-between sm:gap-3 sm:px-4 sm:py-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink text-ink-foreground">
            <Layers className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold leading-none">
              CanvasStack <span className="hidden text-muted-foreground sm:inline">· Socratic BMC Co-Pilot</span>
            </h1>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {s.scenarioName} · <span className="font-mono">Guest mode</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild><Button size="icon" variant="ghost" className="size-11 md:size-8" aria-label="About this advice"><Info className="size-4" /></Button></PopoverTrigger>
            <PopoverContent align="end" className="w-64 text-xs text-muted-foreground">Coaching heuristic aid, not professional legal, financial, or regulatory advice.</PopoverContent>
          </Popover>
          <Button data-tour="tour" variant="ghost" size="sm" className="max-md:size-11 max-md:px-0" aria-label="Start tour" onClick={() => { setRightView("canvas"); setCoachOpen(true); setTour(true); }}><TourIcon className="size-4" /> <span className="max-md:sr-only">Tour</span></Button>
          <div data-tour="scenarios" className="flex flex-wrap items-center gap-2"><ScenarioMenu /></div>
          <Button size="icon" variant="outline" className="size-11 md:size-8" aria-label="Settings" onClick={() => { setKey(s.apiKey); setModel(s.model); setSettings(true); }}>
            <Settings />
          </Button>
        </div>
      </header>

      <main className={cn("grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1fr)_40px]", coachOpen && "md:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]")}>
        <section aria-label="Business Model Canvas workspace" className="flex min-h-0 min-w-0 flex-col grid-paper">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-paper px-4 py-3">
            <h2 className="font-display text-base font-semibold">Business Model Canvas</h2>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button data-tour="tabs" variant="ghost" size="sm">Explore <ChevronDown className="size-3" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setRightView("journey")}><JourneyIcon /> Journey</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRightView("log")}><ScrollText /> Changelog & Decisions</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { s.setDrawerOpen(true); setRightView("tests"); }}><FlaskConical /> Experiments (Test Cards)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div data-tour="stack"><StackBar /></div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
            {readOnly && <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-xs text-muted-foreground"><span className="flex items-center gap-2"><Eye className="size-3.5" /> Saved version · read-only · {viewing.note}</span><Button variant="outline" size="sm" onClick={() => s.setViewing(null)}>Return to working canvas</Button></div>}
            <div data-tour="canvas"><CanvasGrid canvas={viewing.canvas} prev={prev} readOnly={readOnly} activeBlock={activeBlock} flashing={flashing} /></div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground">
              <span className="max-w-64 truncate">{viewing.label}</span>
              {!readOnly && <SuggestAllButton />}
            </div>
          </div>
        </section>
        <aside data-tour="coach" aria-label="Socratic Coach" style={mobile && mobileCoach ? { bottom: vv.bottom, height: vv.keyboard ? vv.height : Math.round(vv.height * 0.6) } : undefined} className={cn("min-h-0 min-w-0 border-l bg-paper", mobile ? (mobileCoach ? "fixed inset-x-0 z-40 flex flex-col overflow-hidden rounded-t-lg border-t shadow-card" : "hidden") : (coachOpen ? "flex flex-col" : "block"))}>
          <div className={cn("flex min-h-0 flex-1 flex-col", !coachVisible && "hidden")}>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
              <div className="min-w-0"><h2 className="flex items-center gap-1.5 text-sm font-semibold"><Compass className="size-4 text-signal" /> Socratic Coach</h2>{stageMenu}</div>
              <Button variant="ghost" size="icon" className="size-11 md:size-7" aria-label="Collapse coach panel" title="Collapse coach panel" onClick={() => mobile ? setMobileCoach(false) : setCoachOpen(false)}><X className="size-4" /></Button>
            </div>
            <div className="min-h-0 flex-1"><ChatPane /></div>
          </div>
          {!coachVisible && !mobile && <Button variant="ghost" className="h-full w-full flex-col justify-start gap-3 rounded-none px-1 py-4" aria-label="Expand coach panel" onClick={() => setCoachOpen(true)}><Compass className="size-4 text-signal" /><span className="text-xs [writing-mode:vertical-rl]">Coach</span></Button>}
        </aside>
      </main>
      <div className="flex shrink-0 items-center justify-between border-t bg-paper px-3 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden">{stageMenu}<Button variant="outline" className="min-h-11" onClick={() => setMobileCoach(true)}><Compass className="size-4" /> Coach</Button></div>
      <Dialog open={rightView !== "canvas"} onOpenChange={(open) => { if (!open) setRightView("canvas"); }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>{rightView === "journey" ? "Business model journey" : rightView === "log" ? "Changelog & Decisions" : "Experiments"}</DialogTitle><DialogDescription>{s.scenarioName}</DialogDescription></DialogHeader>
          {rightView === "journey" ? <JourneyPanel /> : rightView === "log" ? <LogPanel /> : <div data-tour="tests"><TestCards /></div>}
        </DialogContent>
      </Dialog>


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
