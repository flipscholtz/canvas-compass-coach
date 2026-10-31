import { useState } from "react";
import { FilePlus2, FolderOpen, Lock, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCanvasStore } from "@/lib/canvas/store";
import { cn } from "@/lib/utils";
import { deleteCloudScenario, refreshCloudScenarios, saveCloudScenario } from "@/lib/canvas/cloud-scenarios";

export function ScenarioMenu() {
  const s = useCanvasStore();
  const [open, setOpen] = useState<null | "load" | "save" | "new">(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function perform(action: () => Promise<void>, success: string) {
    setBusy(true);
    try { await action(); toast.success(success); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't reach Cloud. Your work is still on screen; try again."); }
    finally { setBusy(false); }
  }
  const show = (m: "load" | "save" | "new") => { setName(m === "save" ? s.scenarioName : ""); setOpen(m); if (m === "load") void perform(refreshCloudScenarios, "Scenario list refreshed"); };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => show("load")}><FolderOpen /> Scenarios</Button>
      <Button size="sm" variant="outline" onClick={() => show("save")}><Save /> Save</Button>
      <Button size="sm" onClick={() => show("new")} className="bg-signal text-signal-foreground hover:bg-signal/90"><FilePlus2 /> New Scenario</Button>

      <Dialog open={open === "load"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Saved scenarios</DialogTitle>
            <DialogDescription>Saved in Cloud. Save current work before loading another scenario.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60dvh,28rem)] space-y-5 overflow-y-auto">
            {[{ title: "Your scenarios", demo: false, description: "Private to your account" }, { title: "Built-in demos", demo: true, description: "Shared examples · changes save as your own copy" }].map((group) => (
              <section key={group.title} aria-label={group.title} className={cn(group.demo && "border-t pt-4")}>
                <h3 className="text-sm font-semibold">{group.title}</h3>
                <p className="mb-2 text-xs text-muted-foreground">{group.description}</p>
                <ul className="space-y-2">
                  {!s.scenarios.some((sc) => !!sc.demo === group.demo) && <li className="py-2 text-sm text-muted-foreground">{group.demo ? "No demos available." : "No saved scenarios yet."}</li>}
                  {s.scenarios.filter((sc) => !!sc.demo === group.demo).map((sc) => (
              <li key={sc.id} className={cn("flex items-center gap-2 rounded-md border p-2.5", sc.id === s.scenarioId && "border-signal")}>
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-medium">{sc.name}</div>
                  <div className="text-xs text-muted-foreground">{sc.demo ? "Built-in demo" : `Saved ${new Date(sc.savedAt).toLocaleDateString()}`} · {sc.data.versions.length} versions</div>
                </div>
                <Button disabled={busy} size="sm" variant="outline" className="min-h-11 shrink-0 md:min-h-8" onClick={() => { s.loadScenario(sc.id); setOpen(null); toast.success(`Loaded “${sc.name}”`); }}>Load</Button>
                {sc.demo ? (
                  <span className="grid size-8 place-items-center text-muted-foreground" title="Demo venture — protected"><Lock className="size-4" /></span>
                ) : (
                  <Button disabled={busy} size="icon" variant="ghost" className="size-11 shrink-0 md:size-8" aria-label={`Delete ${sc.name}`} onClick={() => confirm(`Delete “${sc.name}”?`) && void perform(() => deleteCloudScenario(sc.id), "Scenario deleted")}><Trash2 /></Button>
                )}
              </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <DialogFooter>
            <Button disabled={busy} variant="outline" size="sm" onClick={() => void perform(refreshCloudScenarios, "Shared demos restored")}><RotateCcw /> Restore demos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "save" || open === "new"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{open === "save" ? "Save scenario" : "New scenario"}</DialogTitle>
            <DialogDescription>
              {open === "save" ? "Saves canvas versions, chat, test cards and log to your account in Cloud. Changes to a shared demo are saved as your own copy." : "Starts a blank canvas. Unsaved changes to the current scenario will be lost."}
            </DialogDescription>
          </DialogHeader>
          <Input autoFocus aria-label="Venture name" maxLength={120} placeholder="Venture name" value={name} onChange={(e) => setName(e.target.value)} />
          <DialogFooter>
            <Button disabled={busy} onClick={() => {
              if (open === "save") void perform(async () => { await saveCloudScenario(name); setOpen(null); }, "Scenario saved to your account");
              else { s.newScenario(name); setOpen(null); }
            }}>{busy ? "Saving…" : open === "save" ? "Save" : "Start"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
