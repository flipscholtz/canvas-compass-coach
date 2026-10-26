import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STEPS } from "./coach";
import { demoCards, demoLog, demoMessages, demoVersions } from "./demo";
import { extractAssumptions } from "./assumptions";
import { analyzeCoherence, coherenceKey, formatCoherenceFinding } from "./coherence";
import {
  type Assumption,
  type BlockId,
  type CanvasItem,
  type CanvasVersion,
  type ChatMessage,
  type LogEntry,
  BLOCKS,
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
  log: LogEntry[];
  author: string;
  setAuthor: (a: string) => void;
  addDecision: (d: { summary: string; rationale: string; alternatives?: string; block?: BlockId }) => void;
  removeLogEntry: (id: string) => void;
  drawerOpen: boolean;
  highlightCardId: string | null;
  setDrawerOpen: (o: boolean) => void;
  addItems: (adds: { block: BlockId; text: string; assumptions?: Assumption[] }[], source?: "suggested") => void;
  updateItem: (block: BlockId, id: string, patch: Partial<CanvasItem>) => void;
  deleteItem: (block: BlockId, id: string) => void;
  pushMessage: (m: Omit<ChatMessage, "id">) => void;
  checkCoherence: () => boolean;
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
  log: [] as LogEntry[],
});

type Draft = Omit<LogEntry, "id" | "at" | "author" | "version">;
/** Prepends log entries attributed to the current author and working version. */
const withLog = (s: { log: LogEntry[]; author: string; versions: CanvasVersion[] }, drafts: Draft[]) => {
  const version = s.versions[s.versions.length - 1]!.label.split(" · ")[0]!;
  const at = new Date().toISOString();
  const author = s.author.trim() || "Guest";
  return [...drafts.map((d) => ({ ...d, id: uid(), at, author, version })).reverse(), ...s.log].slice(0, 500);
};
const STATUS_WORD = { hypothesis: "untested", validated: "validated", invalidated: "invalidated" } as const;

const updateHead = (versions: CanvasVersion[], fn: (v: CanvasVersion) => CanvasVersion) =>
  versions.map((v, idx) => (idx === versions.length - 1 ? fn(v) : v));

export const useCanvasStore = create<State>()(
  persist(
    (set) => ({
      ...freshSession(),
      apiKey: "",
      model: "gpt-4o-mini",
      author: "",
      drawerOpen: true,
      highlightCardId: null,
      setAuthor: (author) => set({ author }),
      addDecision: (d) =>
        set((s) => ({
          log: withLog(s, [{ kind: "decision", category: "decision", summary: d.summary, rationale: d.rationale, ...(d.alternatives ? { alternatives: d.alternatives } : {}), ...(d.block ? { block: d.block } : {}) }]),
        })),
      removeLogEntry: (id) => set((s) => ({ log: s.log.filter((e) => e.id !== id) })),
      setDrawerOpen: (o) => set({ drawerOpen: o }),
      addItems: (adds, source) =>
        set((s) => {
          const added: Draft[] = [];
          const versions = updateHead(s.versions, (v) => {
            const canvas = { ...v.canvas };
            for (const a of adds) {
              if (canvas[a.block].some((i) => i.text.toLowerCase() === a.text.toLowerCase())) continue;
              added.push({ kind: "change", category: "added", block: a.block, summary: `${source === "suggested" ? "Co-pilot suggested" : "Added"} “${a.text}” to ${BLOCKS[a.block].title}` });
              canvas[a.block] = [...canvas[a.block], { id: uid(), text: a.text, status: "hypothesis", ...(source ? { source } : {}), assumptions: a.assumptions ?? extractAssumptions(a.block, a.text) }];
            }
            return { ...v, canvas };
          });
          return added.length ? { versions, log: withLog(s, added) } : { versions };
        }),
      updateItem: (block, id, patch) =>
        set((s) => {
          const item = s.versions[s.versions.length - 1]!.canvas[block].find((i) => i.id === id);
          if (!item) return {};
          const drafts: Draft[] = [];
          if (patch.text && patch.text !== item.text)
            drafts.push({ kind: "change", category: "edited", block, summary: `Reworded “${item.text}” → “${patch.text}” in ${BLOCKS[block].title}` });
          if (patch.status && patch.status !== item.status)
            drafts.push(
              patch.status === "hypothesis"
                ? { kind: "change", category: "status", block, summary: `Reset “${item.text}” to untested` }
                : { kind: "decision", category: "status", block, summary: `Marked “${item.text}” as ${STATUS_WORD[patch.status]}`, rationale: "Recorded from canvas status change — add evidence in a decision entry if needed." },
            );
          const versions = updateHead(s.versions, (v) => ({
            ...v,
            canvas: { ...v.canvas, [block]: v.canvas[block].map((i) => (i.id === id ? { ...i, ...patch } : i)) },
          }));
          return drafts.length ? { versions, log: withLog(s, drafts) } : { versions };
        }),
      deleteItem: (block, id) =>
        set((s) => {
          const item = s.versions[s.versions.length - 1]!.canvas[block].find((i) => i.id === id);
          return {
            versions: updateHead(s.versions, (v) => ({
              ...v,
              canvas: { ...v.canvas, [block]: v.canvas[block].filter((i) => i.id !== id) },
            })),
            ...(item ? { log: withLog(s, [{ kind: "change", category: "removed", block, summary: `Removed “${item.text}” from ${BLOCKS[block].title}` }]) } : {}),
          };
        }),
      pushMessage: (m) => set((s) => ({ messages: [...s.messages, { ...m, id: uid() }] })),
      checkCoherence: () => {
        let added = false;
        set((s) => {
          const version = s.viewingId ? s.versions.find((v) => v.id === s.viewingId) : s.versions.at(-1);
          if (!version) return {};
          const key = coherenceKey(version.canvas);
          const previous = [...s.messages].reverse().find((m) => m.coherenceKey !== undefined);
          if (previous?.coherenceKey === key) return {};
          const report = analyzeCoherence(version.canvas);
          added = true;
          return { messages: [...s.messages, { id: uid(), role: "coach", coherenceKey: key, text: `${s.viewingId ? "Snapshot" : "Working canvas"}: ${version.label}\n${report.summary}`, flags: report.findings.map(formatCoherenceFinding) }] };
        });
        return added;
      },
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
          const versions = [...s.versions, copy];
          const isPivot = /\.0 ·/.test(label);
          return {
            versions,
            viewingId: null,
            log: withLog({ ...s, versions }, [
              { kind: "decision", category: "version", summary: `${isPivot ? "Pivoted" : "Committed iteration"}: ${label}`, rationale: note },
            ]),
          };
        }),
      setViewing: (id) => set({ viewingId: id }),
      addCard: (c) =>
        set((s) => ({
          cards: [c, ...s.cards],
          drawerOpen: true,
          highlightCardId: c.id,
          log: withLog(s, [{ kind: "change", category: "test", block: c.block, summary: `Drafted test card “${c.title}”` }]),
        })),
      removeCard: (id) =>
        set((s) => {
          const c = s.cards.find((x) => x.id === id);
          return {
            cards: s.cards.filter((x) => x.id !== id),
            ...(c ? { log: withLog(s, [{ kind: "change", category: "test", block: c.block, summary: `Deleted test card “${c.title}”` }]) } : {}),
          };
        }),
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
          log: demoLog(),
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
