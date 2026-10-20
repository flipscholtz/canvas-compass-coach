import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STEPS } from "./coach";
import { demoCards, demoMessages, demoVersions } from "./demo";
import { extractAssumptions } from "./assumptions";
import {
  type Assumption,
  type BlockId,
  type CanvasItem,
  type CanvasVersion,
  type ChatMessage,
  type Stage,
  type TestCard,
  emptyCanvas,
  uid,
} from "./types";

interface State {
  versions: CanvasVersion[];
  viewingId: string | null; // null = working (latest) version
  messages: ChatMessage[];
  step: number;
  stage: Stage;
  cards: TestCard[];
  apiKey: string;
  model: string;
  scenarioName: string;
  drawerOpen: boolean;
  highlightCardId: string | null;
  setDrawerOpen: (o: boolean) => void;
  addItems: (adds: { block: BlockId; text: string; assumptions?: Assumption[] }[], source?: "suggested") => void;
  updateItem: (block: BlockId, id: string, patch: Partial<CanvasItem>) => void;
  deleteItem: (block: BlockId, id: string) => void;
  pushMessage: (m: Omit<ChatMessage, "id">) => void;
  setProgress: (step: number, stage: Stage) => void;
  commitVersion: (label: string, note: string) => void;
  setViewing: (id: string | null) => void;
  addCard: (c: TestCard) => void;
  removeCard: (id: string) => void;
  setSettings: (apiKey: string, model: string) => void;
  loadDemo: () => void;
  reset: () => void;
}

const freshSession = () => ({
  versions: [
    { id: uid(), label: "v1.0 · Initial Hypothesis", note: "Day 1 starting canvas.", createdAt: new Date().toISOString(), canvas: emptyCanvas() },
  ],
  viewingId: null,
  messages: [
    { id: uid(), role: "coach" as const, text: "I'm your sparring partner, not your form-filler. I'll ask one question at a time and push back when things don't add up." },
    { id: uid(), role: "coach" as const, text: STEPS[0]!.question },
  ],
  step: 0,
  stage: 1 as Stage,
  cards: [],
  scenarioName: "Untitled Venture",
});

const updateHead = (versions: CanvasVersion[], fn: (v: CanvasVersion) => CanvasVersion) =>
  versions.map((v, idx) => (idx === versions.length - 1 ? fn(v) : v));

export const useCanvasStore = create<State>()(
  persist(
    (set) => ({
      ...freshSession(),
      apiKey: "",
      model: "gpt-4o-mini",
      drawerOpen: true,
      highlightCardId: null,
      setDrawerOpen: (o) => set({ drawerOpen: o }),
      addItems: (adds, source) =>
        set((s) => ({
          versions: updateHead(s.versions, (v) => {
            const canvas = { ...v.canvas };
            for (const a of adds) {
              if (canvas[a.block].some((i) => i.text.toLowerCase() === a.text.toLowerCase())) continue;
              canvas[a.block] = [...canvas[a.block], { id: uid(), text: a.text, status: "hypothesis", ...(source ? { source } : {}), assumptions: a.assumptions ?? extractAssumptions(a.block, a.text) }];
            }
            return { ...v, canvas };
          }),
        })),
      updateItem: (block, id, patch) =>
        set((s) => ({
          versions: updateHead(s.versions, (v) => ({
            ...v,
            canvas: { ...v.canvas, [block]: v.canvas[block].map((i) => (i.id === id ? { ...i, ...patch } : i)) },
          })),
        })),
      deleteItem: (block, id) =>
        set((s) => ({
          versions: updateHead(s.versions, (v) => ({
            ...v,
            canvas: { ...v.canvas, [block]: v.canvas[block].filter((i) => i.id !== id) },
          })),
        })),
      pushMessage: (m) => set((s) => ({ messages: [...s.messages, { ...m, id: uid() }] })),
      setProgress: (step, stage) => set({ step, stage }),
      commitVersion: (label, note) =>
        set((s) => {
          const head = s.versions[s.versions.length - 1]!;
          const copy: CanvasVersion = {
            id: uid(),
            label,
            note,
            createdAt: new Date().toISOString(),
            canvas: JSON.parse(JSON.stringify(head.canvas)),
          };
          return { versions: [...s.versions, copy], viewingId: null };
        }),
      setViewing: (id) => set({ viewingId: id }),
      addCard: (c) => set((s) => ({ cards: [c, ...s.cards], drawerOpen: true, highlightCardId: c.id })),
      removeCard: (id) => set((s) => ({ cards: s.cards.filter((c) => c.id !== id) })),
      setSettings: (apiKey, model) => set({ apiKey, model }),
      loadDemo: () =>
        set({
          versions: demoVersions(),
          viewingId: null,
          messages: demoMessages(),
          cards: demoCards(),
          step: STEPS.length - 1,
          stage: 5,
          scenarioName: "VeriTrace · Industrial Carbon ESG SaaS",
        }),
      reset: () => set(freshSession()),
    }),
    {
      name: "canvasstack-session",
      skipHydration: true,
      partialize: ({ drawerOpen: _d, highlightCardId: _h, ...rest }) => rest,
    },
  ),
);
