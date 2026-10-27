import { useEffect, useRef, useState } from "react";
import { ArrowUp, Compass, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/lib/canvas/store";
import { STAGES } from "@/lib/canvas/types";
import { coachTurn, STEPS } from "@/lib/canvas/coach";
import { useRiskiest } from "./useRiskiest";
import { AssumptionChip } from "./AssumptionChip";
import { llmTurn } from "@/lib/canvas/llm";
import { useServerAi } from "./useServerAi";

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const identifyRiskiest = useRiskiest();
  const head = s.versions.at(-1)?.canvas;
  const serverAi = useServerAi();
  const live = !!s.apiKey || serverAi;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [s.messages.length, busy]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy || !head) return;
    setInput("");
    s.pushMessage({ role: "user", text: t });
    setBusy(true);
    try {
      if (live) {
        const history = [...useCanvasStore.getState().messages];
        const r = await llmTurn({ apiKey: s.apiKey, model: s.model, canvas: head, history });
        s.addItems(r.additions.map((a, i) => (i === 0 && r.assumptions.length ? { ...a, assumptions: r.assumptions } : a)));
        s.setProgress(s.step, r.stage);
        // A reply that captured nothing (declined/off-topic) shouldn't show assumption chips.
        s.pushMessage({ role: "coach", text: r.reply, flags: r.flags, assumptions: r.additions.length ? r.assumptions : [] });
      } else {
        await new Promise((res) => setTimeout(res, 550));
        const r = coachTurn(head, s.step, t);
        s.addItems(r.additions);
        s.setProgress(r.nextStep, r.stage);
        s.pushMessage({ role: "coach", text: r.reply, flags: r.flags, assumptions: r.assumptions });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Coach request failed");
    } finally {
      setBusy(false);
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
      <div className="border-b px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Socratic Coach</h2>
          <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {s.apiKey ? `Live · ${s.model}` : serverAi ? "Live · shared demo AI" : "Demo mode · offline"}
          </span>
        </div>
        <ol className="flex gap-1">
          {STAGES.map((st) => (
            <li key={st.id} className="flex-1" title={st.label}>
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  st.id < s.stage ? "bg-primary" : st.id === s.stage ? "bg-signal" : "bg-muted",
                )}
              />
              <p
                className={cn(
                  "mt-1.5 truncate font-mono text-[10px] uppercase tracking-wide",
                  st.id === s.stage ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {st.id}. {st.short}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {s.messages.map((m) =>
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
              <div className="max-w-[90%] space-y-2">
                <p className="whitespace-pre-line break-words text-sm leading-relaxed">{m.text}</p>
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
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [m.id]: !e[m.id] }))}
                    className="text-xs font-medium text-signal underline-offset-2 hover:underline"
                  >
                    {expanded[m.id] ? "Show top tensions only" : `Show all ${m.flags!.length} findings`}
                  </button>
                )}
              </div>
            </div>
          ),
        )}
        {busy && (
          <div className="flex items-center gap-2 pl-10 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Thinking about what you're not saying…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t px-5 py-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <Button
              key={q.key}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => quick(q.key)}
              disabled={busy}
              className={cn(
                "h-auto whitespace-normal rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-50",
                q.key === "risk"
                  ? "border-signal bg-signal text-signal-foreground hover:bg-signal/90"
                  : "bg-background text-muted-foreground hover:border-signal hover:text-foreground",
              )}
            >
              {q.label}
            </Button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="relative"
        >
          <Textarea
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Answer the coach… (Enter to send)"
            className="min-h-[72px] resize-none bg-background pr-12"
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()} className="absolute bottom-2 right-2 size-8">
            <ArrowUp />
          </Button>
        </form>
      </div>
    </section>
  );
}
