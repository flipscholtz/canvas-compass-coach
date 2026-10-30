import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STEPS } from "./coach";
import { demoCards, demoLog, demoMessages, demoVersions, tutoringScenario, veriTraceScenario } from "./demo";
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
  replaceMessage: (id: string, m: Omit<ChatMessage, "id">) => void;
  resolveHelpOffer: (id: string, accept: boolean) => void;
  checkCoherence: () => boolean;
  setProgress: (step: number, stage: Stage) => void;
  commitVersion: (label: string, note: string, focusBlocks?: BlockId[]) => void;
  setViewing: (id: string | null) => void;
  addCard: (c: TestCard) => void;
  removeCard: (id: string) => void;
  setSettings: (apiKey: string, model: string) => void;
  loadDemo: () => void;
  reset: () => void;
  scenarioId: string | null;
  scenarios: SavedScenario[];
  newScenario: (name?: string) => void;
  saveScenario: (name: string) => void;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  restoreDemos: () => void;
}

/** A named, saved copy of a whole scenario (canvas stack, chat, cards, log). */
export interface SavedScenario {
  id: string;
  name: string;
  savedAt: string;
  demo?: boolean;
  data: Pick<State, "versions" | "messages" | "step" | "stage" | "cards" | "scenarioName" | "log">;
}

const seedScenarios = (): SavedScenario[] =>
  [veriTraceScenario(), tutoringScenario()].map((d) => ({
    id: uid(), name: d.scenarioName, demo: true, savedAt: d.versions[d.versions.length - 1]!.createdAt,
    data: { ...d, step: STEPS.length - 1, stage: 5 as Stage },
  }));

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
          // A verdict (validated/invalidated) must carry evidence: which test and what result.
          if (patch.status && patch.status !== "hypothesis" && !(patch.evidence?.test.trim() && patch.evidence.result.trim())) return {};
          if (patch.status === "hypothesis") patch = { ...patch, evidence: undefined };
          const drafts: Draft[] = [];
          if (patch.text && patch.text !== item.text)
            drafts.push({ kind: "change", category: "edited", block, summary: `Reworded “${item.text}” → “${patch.text}” in ${BLOCKS[block].title}` });
          if (patch.status && patch.status !== item.status)
            drafts.push(
              patch.status === "hypothesis"
                ? { kind: "change", category: "status", block, summary: `Reset “${item.text}” to untested` }
                : { kind: "decision", category: "status", block, summary: `Marked “${item.text}” as ${STATUS_WORD[patch.status]}`, rationale: `Evidence — ${patch.evidence!.test}: ${patch.evidence!.result}` },
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
      replaceMessage: (id, m) => set((s) => ({ messages: s.messages.map((old) => old.id === id ? { ...m, id } : old) })),
      resolveHelpOffer: (id, accept) => set((s) => {
        const message = s.messages.find((m) => m.id === id && m.role === "coach");
        const offer = message?.helpOffer;
        const head = s.versions.at(-1);
        if (!offer || offer.decision || !head || (accept && (s.viewingId || offer.versionId !== head.id))) return {};
        const messages = s.messages.map((m) => m.id === id ? { ...m, helpOffer: { ...offer, decision: accept ? "accepted" as const : "dismissed" as const } } : m);
        if (!accept) return { messages };
        const exists = head.canvas[offer.block].some((item) => item.text.toLowerCase() === offer.claim.toLowerCase());
        const versions = exists ? s.versions : updateHead(s.versions, (v) => ({ ...v, canvas: { ...v.canvas, [offer.block]: [...v.canvas[offer.block], { id: uid(), text: offer.claim, status: "hypothesis", source: "suggested" }] } }));
        const existingCard = s.cards.find((c) => c.assumption === offer.claim && c.block === offer.block);
        const card = existingCard ?? { ...offer.card, id: uid() };
        return { messages, versions, cards: existingCard ? s.cards : [card, ...s.cards], drawerOpen: true, highlightCardId: card.id,
          log: withLog(s, [{ kind: "decision", category: "test", block: offer.block, summary: `Accepted evidence-test proposal: ${offer.claim}`, rationale: "Founder chose Yes to record an untested assumption and draft its Test Card; no evidence or validation implied." }]) };
      }),
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
      setProgress: (step, stage) => set((s) => ({ step, stage })),
      commitVersion: (label, note, focusBlocks) =>
        set((s) => {
          const head = s.versions[s.versions.length - 1]!;
          const copy: CanvasVersion = {
            id: uid(),
            label,
            note,
            createdAt: new Date().toISOString(),
            canvas: JSON.parse(JSON.stringify(head.canvas)),
            ...(focusBlocks?.length ? { focusBlocks } : {}),
          };
          const versions = [...s.versions, copy];
          const isPivot = /\.0 ·/.test(label);
          return {
            versions,
            viewingId: null,
            log: withLog({ ...s, versions }, [
              { kind: "decision", category: "version", summary: `${isPivot ? "Pivoted" : "Committed iteration"}: ${label}`, rationale: focusBlocks?.length ? `${note} — start by rewriting: ${focusBlocks.map((b) => BLOCKS[b].title).join(", ")}` : note },
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
      reset: () => set({ ...freshSession(), scenarioId: null }),
      scenarioId: null,
      scenarios: seedScenarios(),
      newScenario: (name) => set({ ...freshSession(), scenarioId: null, ...(name?.trim() ? { scenarioName: name.trim() } : {}) }),
      saveScenario: (name) =>
        set((s) => {
          const nm = name.trim() || s.scenarioName;
          const data = { versions: s.versions, messages: s.messages, step: s.step, stage: s.stage, cards: s.cards, scenarioName: nm, log: s.log };
          const id = s.scenarioId && s.scenarios.some((x) => x.id === s.scenarioId) ? s.scenarioId : uid();
          const entry = { id, name: nm, savedAt: new Date().toISOString(), data };
          return { scenarioName: nm, scenarioId: id, scenarios: [entry, ...s.scenarios.filter((x) => x.id !== id)] };
        }),
      loadScenario: (id) =>
        set((s) => {
          const sc = s.scenarios.find((x) => x.id === id);
          return sc ? { ...structuredClone(sc.data), viewingId: null, scenarioId: id } : {};
        }),
      deleteScenario: (id) =>
        set((s) => ({ scenarios: s.scenarios.filter((x) => x.id !== id), scenarioId: s.scenarioId === id ? null : s.scenarioId })),
      restoreDemos: () =>
        set((s) => {
          const seeds = seedScenarios();
          const names = new Set(seeds.map((x) => x.name));
          return { scenarios: [...s.scenarios.filter((x) => !x.demo && !names.has(x.name)), ...seeds] };
        }),
    }),
    {
      name: "canvasstack-session",
      skipHydration: true,
      partialize: ({ drawerOpen: _d, highlightCardId: _h, ...rest }) => rest,
    },
  ),
);
