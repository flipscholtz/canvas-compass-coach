import { useEffect, useRef, useState } from "react";
import { ArrowUp, Compass, AlertTriangle, Loader2, RotateCcw, Check, Target, Scale, Swords } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/lib/canvas/store";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { pickRiskiest } from "@/lib/canvas/assumptions";
import { filledBlocks } from "@/lib/canvas/patterns";
import { changedNotes } from "./useCanvasFeedback";
import { coachTurn, STEPS, stageThrough, stepQuestion } from "@/lib/canvas/coach";
import { useRiskiest } from "./useRiskiest";
import { AssumptionChip } from "./AssumptionChip";
import { llmTurn } from "@/lib/canvas/llm";
import { useServerAi } from "./useServerAi";
import { COACH_FALLBACK, withCoachDeadline } from "@/lib/canvas/chat-recovery";
import { coachHelp } from "@/lib/canvas/help";
import { BLOCKS } from "@/lib/canvas/types";
import { CoherenceView } from "./CoherenceView";
import type { CoherenceFinding } from "@/lib/canvas/coherence";

const QUICK = [
  { label: "Identify My Riskiest Assumption", short: "Riskiest assumption", key: "risk", icon: Target, hint: "Riskiest assumption: finds the untested belief most likely to sink the venture and drafts a Test Card for it.", suggest: "You've covered enough ground — try “Riskiest assumption” to pick what to test first." },
  { label: "Check coherence", short: "Coherence check", key: "coherence", icon: Scale, hint: "Coherence check: checks whether your canvas blocks fit together, such as your price vs your customer segment.", suggest: "With several blocks filled in, a “Coherence check” will show whether they fit together." },
  { label: "Challenge my value proposition", short: "Challenge VP", key: "vp", icon: Swords, hint: "Challenge VP: the coach pushes back on your value proposition the way a sceptical customer would.", suggest: "You have a customer and a value proposition — tap “Challenge VP” to stress-test it." },
  { label: "Skip this question", short: "Skip", key: "skip", icon: Target, hint: "", suggest: "" },
] as const;
type QuickKey = (typeof QUICK)[number]["key"];
const ACTIONS = QUICK.filter((q) => q.key !== "skip");
const MOVE_ON = 4; // messages after a suggestion before it fades

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
  const live = serverAi;
  const [used, setUsed] = useState<Set<QuickKey>>(new Set());
  const longPress = useRef<{ t?: ReturnType<typeof setTimeout>; fired: boolean }>({ fired: false });

  // Contextual suggestion: first relevant, unused action wins; only one at a time.
  const eligible: QuickKey | null = !head ? null
    : !used.has("risk") && s.stage >= 3 && !!pickRiskiest(head, s.cards) ? "risk"
    : !used.has("coherence") && filledBlocks(head).length >= 4 ? "coherence"
    : !used.has("vp") && head.segments.length > 0 && head.valueProps.length > 0 ? "vp"
    : null;
  const eligibleText = eligible ? QUICK.find((q) => q.key === eligible)!.suggest : "";
  const suggestedAt = eligible ? s.messages.map((m) => m.role === "coach" && m.text === eligibleText).lastIndexOf(true) : -1;
  const suggested = eligible && suggestedAt >= 0 && s.messages.length - 1 - suggestedAt <= MOVE_ON ? eligible : null;
  useEffect(() => {
    if (!eligible || busy || suggestedAt >= 0 || s.viewingId) return;
    s.pushMessage({ role: "coach", text: eligibleText });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, busy, suggestedAt]);
  useEffect(() => {
    if (eligible && suggestedAt >= 0 && !suggested) setUsed((u) => new Set(u).add(eligible));
  }, [eligible, suggestedAt, suggested]);

  useEffect(() => {
    const list = endRef.current?.parentElement;
    if (list) list.scrollTop = list.scrollHeight;
  }, [s.messages.length, busy]);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const onResize = () => { const list = endRef.current?.parentElement; if (list) list.scrollTop = list.scrollHeight; };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

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
        const r = await withCoachDeadline((signal) => llmTurn({ canvas: head, history, stage: s.stage, signal }));
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
      // Keep the conversation moving with a contextual offline follow-up; nothing is added to the canvas.
      let followUp = "";
      try { followUp = coachTurn(head, s.step, t, history).reply.trim(); } catch { /* keep plain fallback */ }
      publish({ role: "coach", text: followUp ? `${COACH_FALLBACK}\n\n${followUp}` : COACH_FALLBACK, retryUserId: userId });
    } finally {
      setBusy(false);
      busyRef.current = false;
      setPendingRetry(null);
      inputRef.current?.focus();
    }
  }

  /** Puts one coherence issue in focus: the coach asks about its main block, which the canvas highlights. */
  function focusIssue(f: CoherenceFinding) {
    const block = BLOCKS[f.blocks.find((b) => b !== "valueProps" || f.blocks.length === 1) ?? f.blocks[0]!].title;
    s.pushMessage({ role: "coach", text: `Let's focus on “${f.title}”.\n${f.action.replace(/\?$/, ".")}\nWhat will you add to ${block} first?` });
    inputRef.current?.focus();
  }

  function quick(key: QuickKey) {
    setUsed((u) => new Set(u).add(key));
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
      const cur = STEPS[s.step];
      if (cur?.block) s.addItems([{ block: cur.block, text: `Not yet known — to test: ${cur.question.split("?")[0]}?` }]);
      const next = Math.min(s.step + 1, STEPS.length - 1);
      const step = STEPS[next];
      if (!step) return;
      s.setProgress(next, stageThrough(next));
      s.pushMessage({ role: "coach", text: `Parking that${cur?.block ? ` — noted as an untested assumption in ${BLOCKS[cur.block].title}` : ""}. ${stepQuestion(next)}` });
    }
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-paper">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4">
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
                {m.coherenceReport && <CoherenceView report={m.coherenceReport} onFocus={focusIssue} />}
                {!m.coherenceReport && (m.coherenceKey !== undefined && !expanded[m.id] ? m.flags?.slice(0, 3) : m.flags)?.map((f) => (
                  <div
                    key={f}
                    className="flex gap-2 rounded-md border border-signal/30 bg-accent px-3 py-2 text-xs text-accent-foreground"
                  >
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <span className="min-w-0 whitespace-pre-line break-words">{f}</span>
                  </div>
                ))}
                {!m.coherenceReport && m.coherenceKey !== undefined && (m.flags?.length ?? 0) > 3 && (
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

      <div className="shrink-0 space-y-2 border-t px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <TooltipProvider delayDuration={300}>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]" data-tour="actions" aria-label="Coach actions">
            {ACTIONS.map((q) => {
              const on = suggested === q.key;
              const Icon = q.icon;
              return (
                <Tooltip key={q.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={q.label}
                      disabled={busy}
                      onTouchStart={() => { longPress.current.fired = false; longPress.current.t = setTimeout(() => { longPress.current.fired = true; toast(q.hint); }, 500); }}
                      onTouchEnd={() => clearTimeout(longPress.current.t)}
                      onClick={(e) => { if (longPress.current.fired) { e.preventDefault(); longPress.current.fired = false; return; } quick(q.key); }}
                      className={cn(
                        "relative inline-flex shrink-0 items-center gap-1 min-h-11 whitespace-nowrap rounded-full border px-3 py-1 text-xs md:min-h-0 md:px-2.5 md:text-[11px] font-medium transition-colors disabled:opacity-50",
                        on ? "animate-pulse border-signal bg-signal text-signal-foreground ring-2 ring-signal/25" : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-3" />{q.short}
                      {on && <span className="sr-only">(Suggested)</span>}
                      {on && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-background bg-signal-foreground" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-60 text-xs">{q.hint}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
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
            className="min-h-[64px] resize-none bg-background pr-14 text-base md:text-sm"
          />

          <Button aria-label="Send message" type="submit" size="icon" disabled={busy || !input.trim()} className="absolute bottom-2 right-2 size-11 md:size-8">
            <ArrowUp />
          </Button>
        </form>
        <button type="button" disabled={busy} onClick={() => quick("skip")} className="min-h-11 text-sm text-muted-foreground underline md:min-h-0 md:text-[11px]-offset-2 hover:text-foreground hover:underline disabled:opacity-50">
          Not sure yet? Skip for now
        </button>
      </div>
    </section>
  );
}
