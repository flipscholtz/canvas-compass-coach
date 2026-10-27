import { useState } from "react";
import { FilePlus2, FolderOpen, Lock, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCanvasStore } from "@/lib/canvas/store";
import { cn } from "@/lib/utils";

export function ScenarioMenu() {
  const s = useCanvasStore();
  const [open, setOpen] = useState<null | "load" | "save" | "new">(null);
  const [name, setName] = useState("");
  const show = (m: "load" | "save" | "new") => { setName(m === "save" ? s.scenarioName : ""); setOpen(m); };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => show("load")}><FolderOpen /> Scenarios</Button>
      <Button size="sm" variant="outline" onClick={() => show("save")}><Save /> Save</Button>
      <Button size="sm" onClick={() => show("new")} className="bg-signal text-signal-foreground hover:bg-signal/90"><FilePlus2 /> New Scenario</Button>

      <Dialog open={open === "load"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Saved scenarios</DialogTitle>
            <DialogDescription>Loading replaces what's on screen. Save first if you want to keep your current work. Demo ventures are locked; "Restore demos" resets them to their original state.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {s.scenarios.length === 0 && <li className="text-sm text-muted-foreground">No saved scenarios yet.</li>}
            {s.scenarios.map((sc) => (
              <li key={sc.id} className={cn("flex items-center gap-2 rounded-md border p-2.5", sc.id === s.scenarioId && "border-signal")}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{sc.name}</div>
                  <div className="text-xs text-muted-foreground">{sc.data.versions.length} versions · saved {new Date(sc.savedAt).toLocaleDateString()}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => { s.loadScenario(sc.id); setOpen(null); toast.success(`Loaded “${sc.name}”`); }}>Load</Button>
                {sc.demo ? (
                  <span className="grid size-8 place-items-center text-muted-foreground" title="Demo venture — protected"><Lock className="size-4" /></span>
                ) : (
                  <Button size="icon" variant="ghost" className="size-8" aria-label={`Delete ${sc.name}`} onClick={() => confirm(`Delete “${sc.name}”?`) && s.deleteScenario(sc.id)}><Trash2 /></Button>
                )}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { s.restoreDemos(); toast.success("Demo ventures restored"); }}><RotateCcw /> Restore demos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "save" || open === "new"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{open === "save" ? "Save scenario" : "New scenario"}</DialogTitle>
            <DialogDescription>
              {open === "save" ? "Saves the canvas versions, chat, test cards and log in this browser." : "Starts a blank canvas. Unsaved changes to the current scenario will be lost."}
            </DialogDescription>
          </DialogHeader>
          <Input autoFocus placeholder="Venture name" value={name} onChange={(e) => setName(e.target.value)} />
          <DialogFooter>
            <Button onClick={() => {
              if (open === "save") { s.saveScenario(name); toast.success("Scenario saved"); } else s.newScenario(name);
              setOpen(null);
            }}>{open === "save" ? "Save" : "Start"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
