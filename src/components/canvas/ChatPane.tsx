import { useEffect, useRef, useState } from "react";
import { ArrowUp, Compass, AlertTriangle, Loader2, RotateCcw, MoreHorizontal, Check } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/lib/canvas/store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { changedNotes } from "./useCanvasFeedback";
import { coachTurn, STEPS } from "@/lib/canvas/coach";
import { useRiskiest } from "./useRiskiest";
import { AssumptionChip } from "./AssumptionChip";
import { llmTurn } from "@/lib/canvas/llm";
import { useServerAi } from "./useServerAi";
import { COACH_FALLBACK, withCoachDeadline } from "@/lib/canvas/chat-recovery";
import { coachHelp } from "@/lib/canvas/help";
import { BLOCKS } from "@/lib/canvas/types";

const QUICK = [
  { label: "Identify My Riskiest Assumption", key: "risk" },
  { label: "Check coherence", key: "coherence" },
  { label: "Challenge my value proposition", key: "vp" },
  { label: "Skip this question", key: "skip" },
] as const;

export function ChatPane() {
  const s = useCanvasStore();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipts, setReceipts] = useState<Record<string, string[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busyRef = useRef(false);
  const [pendingRetry, setPendingRetry] = useState<string | null>(null);
  const identifyRiskiest = useRiskiest();
  const head = s.versions.at(-1)?.canvas;
  const serverAi = useServerAi();
  const live = !!s.apiKey || serverAi;

  useEffect(() => {
    const list = endRef.current?.parentElement;
    if (list) list.scrollTop = list.scrollHeight;
  }, [s.messages.length, busy]);

  async function send(text: string, retry?: { failureId: string; userId: string }) {
    const t = text.trim();
    if (!t || busyRef.current || !head) return;
    busyRef.current = true;
    if (!retry) {
      setInput("");
      s.pushMessage({ role: "user", text: t });
    }
    const state = useCanvasStore.getState();
    const userId = retry?.userId ?? state.messages.at(-1)?.id;
    if (!userId) { busyRef.current = false; return; }
    const userIndex = state.messages.findIndex((m) => m.id === userId);
    const history = state.messages.slice(0, userIndex + 1).filter((m) => !m.retryUserId);
    const sessionId = state.versions[0]?.id;
    const currentSession = () => useCanvasStore.getState().versions[0]?.id === sessionId;
    const publish = (message: Parameters<typeof s.pushMessage>[0]) => {
      if (!currentSession()) return;
      if (retry) s.replaceMessage(retry.failureId, message);
      else s.pushMessage(message);
      const after = useCanvasStore.getState();
      const canvas = after.versions.at(-1)?.canvas;
      const messageId = retry?.failureId ?? after.messages.at(-1)?.id;
      if (canvas && messageId) {
        const changes = changedNotes(head, canvas);
        const notes = [...new Set(changes.map((c) => `${c.added ? "Added to" : "Updated in"} ${BLOCKS[c.block].title}`))];
        if (notes.length) setReceipts((old) => ({ ...old, [messageId]: notes }));
      }
    };
    setPendingRetry(retry?.failureId ?? null);
    setBusy(true);
    try {
      const help = coachHelp({ text: t, canvas: head, history, block: STEPS[s.step]?.block ?? null, question: STEPS[s.step]?.question ?? "" });
      if (help) {
        publish({ role: "coach", text: help.reply, helpOffer: { ...help.offer, versionId: state.versions.at(-1)?.id ?? "" } });
      } else if (live) {
        const r = await withCoachDeadline((signal) => llmTurn({ apiKey: s.apiKey, model: s.model, canvas: head, history, stage: s.stage, signal }));
        if (!currentSession()) return;
        s.addItems(r.additions.map((a, i) => (i === 0 && r.assumptions.length ? { ...a, assumptions: r.assumptions } : a)));
        s.setProgress(s.step, r.stage);
        // A reply that captured nothing (declined/off-topic) shouldn't show assumption chips.
        publish({ role: "coach", text: r.reply, flags: r.flags, assumptions: r.additions.length ? r.assumptions : [] });
      } else {
        await new Promise((res) => setTimeout(res, 550));
        const r = coachTurn(head, s.step, t, history);
        if (!r.reply.trim()) throw new Error("Offline coach returned no text");
        if (!currentSession()) return;
        s.addItems(r.additions);
        s.setProgress(r.nextStep, r.stage);
        publish({ role: "coach", text: r.reply, flags: r.flags, assumptions: r.assumptions });
      }
    } catch (e) {
      console.error("[CanvasStack coach] Turn failed", e);
      publish({ role: "coach", text: COACH_FALLBACK, retryUserId: userId });
    } finally {
      setBusy(false);
      busyRef.current = false;
      setPendingRetry(null);
      inputRef.current?.focus();
    }
  }

  function quick(key: (typeof QUICK)[number]["key"]) {
    if (key === "risk") {
      identifyRiskiest();
      return;
    }
    if (key === "coherence") {
      if (!s.checkCoherence()) toast.info("The canvas is unchanged; your latest coherence review is still current.");
      return;
    }
    if (!head) return;
    if (live && key !== "skip") {
      const prompt = QUICK.find((q) => q.key === key)?.label;
      if (prompt) void send(prompt);
      return;
    }
    if (key === "vp") {
      const vp = head.valueProps[0];
      s.pushMessage({
        role: "coach",
        text: vp
          ? `“${vp.text}” — if your customer had never heard of you, what would they be using instead today, and why would they switch?`
          : "You haven't stated a value proposition yet. What job is your customer trying to get done?",
      });
    } else {
      const next = Math.min(s.step + 1, STEPS.length - 1);
      const step = STEPS[next];
      if (!step) return;
      s.setProgress(next, step.stage);
      s.pushMessage({ role: "coach", text: `Parking that. ${step.question}` });
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-paper">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {s.messages.filter((m) => m.id !== pendingRetry).map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-lg rounded-br-sm bg-ink px-3.5 py-2.5 text-sm text-ink-foreground">
                {m.text}
              </p>
            </div>
          ) : (
            <div key={m.id} className="flex gap-3">
              <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-signal text-signal-foreground">
                <Compass className="size-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="whitespace-pre-line break-words text-sm leading-relaxed">{m.text.trim() || COACH_FALLBACK}</p>
                {receipts[m.id]?.map((note) => <p key={note} className="flex items-center gap-1 text-[11px] text-valid"><Check className="size-3" />{note}</p>)}
                {m.helpOffer && (
                  <div className="space-y-2 border-l-2 border-signal pl-3 text-xs">
                    {m.helpOffer.decision ? (
                      <p className="text-muted-foreground">{m.helpOffer.decision === "accepted" ? `Saved as untested in ${BLOCKS[m.helpOffer.block].title}; Test Card created.` : "Not recorded. You can keep exploring."}</p>
                    ) : (
                      <>
                        <p>Proposed untested assumption · {BLOCKS[m.helpOffer.block].title}: “{m.helpOffer.claim}”</p>
                        <p>Record assumption and create a Test Card</p>
                        <div className="flex gap-2">
                          <Button size="sm" disabled={busy || !!s.viewingId || m.helpOffer.versionId !== s.versions.at(-1)?.id} onClick={() => { s.resolveHelpOffer(m.id, true); const offer = useCanvasStore.getState().messages.find((item) => item.id === m.id)?.helpOffer; if (offer?.decision === "accepted") setReceipts((old) => ({ ...old, [m.id]: [`Added to ${BLOCKS[offer.block].title}`] })); }}>Yes</Button>
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => s.resolveHelpOffer(m.id, false)}>Not now</Button>
                        </div>
                        {m.helpOffer.versionId !== s.versions.at(-1)?.id && <p className="text-muted-foreground">This offer belongs to an earlier canvas. Ask again on your working canvas.</p>}
                      </>
                    )}
                  </div>
                )}
                {m.retryUserId && (
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => {
                    const user = s.messages.find((u) => u.id === m.retryUserId && u.role === "user");
                    if (user) void send(user.text, { failureId: m.id, userId: user.id });
                  }}><RotateCcw className="size-3.5" /> Retry</Button>
                )}
                {!!m.assumptions?.length && (
                  <div className="space-y-1.5 rounded-md border bg-background p-2.5">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Underlying assumptions you're making
                    </p>
                    {m.assumptions.map((a) => (
                      <AssumptionChip key={a.text} assumption={a} />
                    ))}
                  </div>
                )}
                {(m.coherenceKey !== undefined && !expanded[m.id] ? m.flags?.slice(0, 3) : m.flags)?.map((f) => (
                  <div
                    key={f}
                    className="flex gap-2 rounded-md border border-signal/30 bg-accent px-3 py-2 text-xs text-accent-foreground"
                  >
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <span className="min-w-0 whitespace-pre-line break-words">{f}</span>
                  </div>
                ))}
                {m.coherenceKey !== undefined && (m.flags?.length ?? 0) > 3 && (
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setExpanded((e) => ({ ...e, [m.id]: !e[m.id] }))}
                    className="text-xs font-medium text-signal underline-offset-2 hover:underline"
                  >
                    {expanded[m.id] ? "Show top tensions only" : `Show all ${m.flags?.length ?? 0} findings`}
                  </Button>
                )}
              </div>
            </div>
          ),
        )}
        {busy && (
          <div role="status" className="flex items-center gap-2 pl-10 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Coach is thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t px-3 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="relative"
        >
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            aria-label="Message the coach"
            placeholder="Answer the coach…"
            className="min-h-[72px] resize-none bg-background pr-12 pb-9"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="absolute bottom-2 left-2 size-7" aria-label="Coach actions" title="Coach actions" disabled={busy}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start">{QUICK.map((q) => <DropdownMenuItem key={q.key} disabled={busy} onClick={() => quick(q.key)}>{q.label}</DropdownMenuItem>)}</DropdownMenuContent>
          </DropdownMenu>
          <Button aria-label="Send message" type="submit" size="icon" disabled={busy || !input.trim()} className="absolute bottom-2 right-2 size-8">
            <ArrowUp />
          </Button>
        </form>
      </div>
    </section>
  );
}
