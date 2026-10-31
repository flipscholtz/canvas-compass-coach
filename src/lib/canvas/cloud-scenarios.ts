import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { tutoringScenario, veriTraceScenario } from "./demo";
import { useCanvasStore, type SavedScenario } from "./store";
import { accountStorageKey } from "./accounts";
import type { Stage } from "./types";

let activeAccount: string | null = null;
let generation = 0;

export async function listCloudScenarios(): Promise<SavedScenario[]> {
  const [own, demos] = await Promise.all([
    supabase.from("account_scenarios").select("id,name,data,saved_at").order("saved_at", { ascending: false }),
    supabase.from("demo_scenarios").select("id,name,template_key"),
  ]);
  if (own.error) throw own.error;
  if (demos.error) throw demos.error;
  return [
    ...own.data.map((row) => ({ id: row.id, name: row.name, savedAt: row.saved_at, data: row.data as unknown as SavedScenario["data"] })),
    ...demos.data.map((row) => {
      const d = row.template_key === "learnloop" ? tutoringScenario() : veriTraceScenario();
      return { id: row.id, name: row.name, demo: true, savedAt: d.versions.at(-1)?.createdAt ?? "", data: { ...d, step: 14, stage: 5 as Stage } };
    }),
  ];
}

export function clearAccountWorkspace() {
  generation++;
  activeAccount = null;
  // Switch away before resetting so the previous account's draft remains recoverable.
  useCanvasStore.persist.setOptions({ name: "canvasstack-signed-out" });
  useCanvasStore.getState().clearWorkspace();
}

export async function activateAccount(id: string) {
  if (activeAccount === id) return;
  clearAccountWorkspace();
  const ticket = generation;
  useCanvasStore.persist.setOptions({ name: accountStorageKey(id) });
  await useCanvasStore.persist.rehydrate();
  const [scenarios, profile] = await Promise.all([
    listCloudScenarios(), supabase.from("profiles").select("username").eq("id", id).single(),
  ]);
  if (ticket !== generation) throw new Error("Your account changed. Please sign in again.");
  if (profile.error) throw profile.error;
  useCanvasStore.setState({ scenarios, author: profile.data.username });
  activeAccount = id;
}

export async function refreshCloudScenarios() {
  const ticket = generation;
  const scenarios = await listCloudScenarios();
  if (ticket === generation) useCanvasStore.setState({ scenarios });
}

export async function saveCloudScenario(name: string, supplied?: SavedScenario["data"]) {
  const s = useCanvasStore.getState();
  const ticket = generation;
  const nm = name.trim() || s.scenarioName;
  if (nm.length > 120) throw new Error("Scenario names must be 120 characters or fewer.");
  const data = supplied ?? { versions: s.versions, messages: s.messages, step: s.step, stage: s.stage, cards: s.cards, scenarioName: nm, log: s.log };
  const existing = !supplied && s.scenarios.find((sc) => sc.id === s.scenarioId && !sc.demo);
  const id = existing ? existing.id : crypto.randomUUID();
  const { error } = await supabase.from("account_scenarios").upsert({ id, name: nm, data: { ...data, scenarioName: nm } as unknown as Json, saved_at: new Date().toISOString() });
  if (error) throw error;
  if (ticket !== generation) return;
  if (!supplied) useCanvasStore.setState({ scenarioId: id, scenarioName: nm });
  await refreshCloudScenarios();
}

export async function deleteCloudScenario(id: string) {
  if (useCanvasStore.getState().scenarios.find((sc) => sc.id === id)?.demo) throw new Error("Shared demos cannot be deleted.");
  const ticket = generation;
  const { error } = await supabase.from("account_scenarios").delete().eq("id", id);
  if (error) throw error;
  if (ticket !== generation) return;
  if (useCanvasStore.getState().scenarioId === id) useCanvasStore.setState({ scenarioId: null });
  await refreshCloudScenarios();
}

export function legacyScenarios(): SavedScenario[] {
  try {
    const raw = localStorage.getItem("canvasstack-session");
    if (!raw) return [];
    const state = JSON.parse(raw).state;
    const saved: SavedScenario[] = (state.scenarios ?? []).filter((sc: SavedScenario) => !sc.demo);
    if (state.versions?.some((v: SavedScenario["data"]["versions"][number]) => Object.values(v.canvas).some((items) => items.length))) {
      saved.push({ id: "legacy-working", name: `${state.scenarioName || "Recovered venture"} · browser draft`, savedAt: "", data: { versions: state.versions, messages: state.messages ?? [], step: state.step ?? 0, stage: state.stage ?? 1, cards: state.cards ?? [], scenarioName: state.scenarioName, log: state.log ?? [] } });
    }
    return saved;
  } catch { return []; }
}