import { useEffect, useState } from "react";
import { Lightbulb, Loader2, Plus, Trash2, ChevronDown } from "lucide-react";
import { useSuggest } from "./useSuggest";
import { AssumptionChip } from "./AssumptionChip";
import { extractAssumptions } from "@/lib/canvas/assumptions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/lib/canvas/store";
import { BLOCKS, type BlockId, type Canvas, type CanvasItem, type ItemStatus } from "@/lib/canvas/types";

const LAYOUT: Record<BlockId, string> = {
  keyPartners: "md:col-span-2 md:row-span-2",
  keyActivities: "md:col-span-2",
  keyResources: "md:col-span-2 md:col-start-3 md:row-start-2",
  valueProps: "md:col-span-2 md:row-span-2 md:col-start-5 md:row-start-1",
  relationships: "md:col-span-2 md:col-start-7 md:row-start-1",
  channels: "md:col-span-2 md:col-start-7 md:row-start-2",
  segments: "md:col-span-2 md:row-span-2 md:col-start-9 md:row-start-1",
  costs: "md:col-span-5 md:row-start-3",
  revenue: "md:col-span-5 md:col-start-6 md:row-start-3",
};

const STATUS_STYLE: Record<ItemStatus, string> = {
  hypothesis: "bg-hypo-soft border-hypo/40",
  validated: "bg-valid-soft border-valid/40",
  invalidated: "bg-invalid-soft border-invalid/40 line-through text-muted-foreground",
};
const BADGE: Record<ItemStatus, string> = {
  hypothesis: "bg-hypo/15 text-hypo",
  validated: "bg-valid/15 text-valid",
  invalidated: "bg-invalid/15 text-invalid",
};
const STATUS_LABEL: Record<ItemStatus, string> = {
  hypothesis: "Untested hypothesis",
  validated: "Validated",
  invalidated: "Invalidated",
};
const DOT: Record<ItemStatus, string> = { hypothesis: "bg-hypo", validated: "bg-valid", invalidated: "bg-invalid" };

export function CanvasGrid({ canvas, prev, readOnly, activeBlock, flashing = [] }: { canvas: Canvas; prev?: Canvas | undefined; readOnly: boolean; activeBlock?: BlockId; flashing?: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:auto-rows-[minmax(150px,auto)] md:grid-cols-10">
      {(Object.keys(LAYOUT) as BlockId[]).map((b) => (
        <Block key={b} id={b} items={canvas[b]} prev={prev?.[b]} readOnly={readOnly} active={activeBlock === b} flashing={flashing} />
      ))}
    </div>
  );
}

function Block({ id, items, prev, readOnly, active, flashing }: { id: BlockId; items: CanvasItem[]; prev?: CanvasItem[] | undefined; readOnly: boolean; active: boolean; flashing: string[] }) {
  const [expanded, setExpanded] = useState(active);
  useEffect(() => { setExpanded(active); }, [active]);
  const addItems = useCanvasStore((s) => s.addItems);
  const focus = useCanvasStore((s) => !readOnly && !s.viewingId && !!s.versions.at(-1)?.focusBlocks?.includes(id));
  const { suggest, busy } = useSuggest();
  const [adding, setAdding] = useState("");
  const [open, setOpen] = useState(false);
  const isVP = id === "valueProps";
  const prevTexts = new Set(prev?.map((p) => p.text.toLowerCase()));
  const curTexts = new Set(items.map((p) => p.text.toLowerCase()));
  const removed = prev?.filter((p) => !curTexts.has(p.text.toLowerCase())) ?? [];

  return (
    <div
      data-block={id}
      data-active={active}
      className={cn(
        "group min-w-0 flex flex-col rounded-lg border bg-card p-2.5 shadow-card transition-shadow",
        active && "ring-2 ring-signal ring-offset-1 ring-offset-background",
        isVP && "border-2 border-signal",
        focus && "ring-2 ring-signal ring-offset-2 ring-offset-background",
        LAYOUT[id],
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className={cn("font-display text-sm font-semibold leading-tight break-words", isVP && "text-signal")}><span className="hidden md:inline">{BLOCKS[id].title}</span><Button variant="ghost" className="h-auto w-full justify-start gap-2 whitespace-normal px-0 py-0 text-left md:hidden" aria-expanded={expanded} onClick={() => setExpanded((o) => !o)}>{BLOCKS[id].title}<ChevronDown className={cn("size-3 shrink-0 transition-transform", expanded && "rotate-180")} /><span className="text-[10px] text-muted-foreground">{items.length}</span></Button></h3>
          <p className="text-[11px] text-muted-foreground">{BLOCKS[id].hint}</p>
          {focus && <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-signal">Pivot: rewrite this block</p>}
        </div>
        {!readOnly && (
          <div className="flex shrink-0">
            <Button variant="ghost" size="icon"
              aria-label={`Suggest assumptions for ${BLOCKS[id].title}`}
              title="Suggest assumptions to test"
              disabled={!!busy}
              onClick={() => suggest(id)}
              className="rounded p-1 text-muted-foreground opacity-60 hover:bg-muted hover:text-signal hover:opacity-100 disabled:opacity-30"
            >
              {busy === id ? <Loader2 className="size-3.5 animate-spin" /> : <Lightbulb className="size-3.5" />}
            </Button>
            <Button variant="ghost" size="icon"
              aria-label={`Add to ${BLOCKS[id].title}`}
              onClick={() => { setExpanded(true); setOpen((o) => !o); }}
              className="rounded p-1 text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
      <ul className={cn("flex-1 flex-col gap-1.5 md:flex", expanded ? "flex" : "hidden")}>
        {items.map((item) => (
          <li key={item.id} data-note={item.id} className={cn("rounded-md", flashing.includes(item.id) && "canvas-note-flash")}>
            <Note block={id} item={item} readOnly={readOnly} isNew={!!prev && !prevTexts.has(item.text.toLowerCase())} />
          </li>
        ))}
        {removed.map((r) => (
          <li key={`rm-${r.id}`} className="rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground line-through">
            {r.text}
          </li>
        ))}
      </ul>
      {open && !readOnly && (
        <form
          className="mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (adding.trim()) addItems([{ block: id, text: adding.trim() }]);
            setAdding("");
            setOpen(false);
          }}
        >
          <input
            autoFocus
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onBlur={() => !adding && setOpen(false)}
            placeholder="New hypothesis…"
            className="w-full rounded-md border bg-background px-2 py-1 text-xs outline-none focus:border-signal"
          />
        </form>
      )}
    </div>
  );
}

function Note({ block, item, readOnly, isNew }: { block: BlockId; item: CanvasItem; readOnly: boolean; isNew: boolean }) {
  const { updateItem, deleteItem, cards } = useCanvasStore();
  const [text, setText] = useState(item.text);
  const [verdict, setVerdict] = useState<null | "validated" | "invalidated">(null);
  const [test, setTest] = useState("");
  const [result, setResult] = useState("");
  const assumptions = item.assumptions?.length ? item.assumptions : extractAssumptions(block, item.text);
  const body = (
    <span
      className={cn(
        "flex w-full flex-col gap-1 rounded-md border px-2 py-1.5 text-left text-xs leading-snug transition-shadow",
        STATUS_STYLE[item.status],
        isNew && "ring-2 ring-valid/60",
        !readOnly && "hover:shadow-card cursor-pointer",
      )}
    >
      <span>{item.text}</span>
      <span className="flex flex-wrap items-center gap-1 no-underline">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-px font-mono text-[9px] uppercase", BADGE[item.status])}>
          <span className={cn("size-1.5 rounded-full", DOT[item.status])} />
          {STATUS_LABEL[item.status]}
        </span>
        {isNew && <span className="font-mono text-[9px] uppercase text-valid">new</span>}
        {item.source === "suggested" && (
          <span title="Suggested by the co-pilot" className="font-mono text-[9px] uppercase text-muted-foreground">sugg.</span>
        )}
      </span>
    </span>
  );
  if (readOnly) return body;
  return (
    <Popover onOpenChange={(o) => { if (o) { setText(item.text); setVerdict(null); } }}>
      <PopoverTrigger asChild>
        <button className="w-full">{body}</button>
      </PopoverTrigger>
      <PopoverContent collisionPadding={12} className="max-h-[var(--radix-popover-content-available-height)] w-80 space-y-3 overflow-y-auto">
        <div className="space-y-1.5 rounded-md border bg-muted/50 p-2.5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Underlying assumption{assumptions.length > 1 ? "s" : ""}
          </p>
          {assumptions.map((a) => (
            <AssumptionChip key={a.text} assumption={a} />
          ))}
        </div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-16 text-sm" />
        <div className="grid grid-cols-3 gap-1">
          {(["hypothesis", "validated", "invalidated"] as ItemStatus[]).map((st) => (
            <Button variant="outline" size="sm"
              key={st}
              onClick={() => {
                if (st === "hypothesis") { updateItem(block, item.id, { status: st }); setVerdict(null); }
                else { setVerdict(st); setTest(item.evidence?.test ?? cards.find((c) => c.block === block)?.title ?? ""); setResult(""); }
              }}
              className={cn(
                "flex items-center justify-center gap-1 rounded-md border px-1 py-1 text-[11px] capitalize",
                item.status === st ? STATUS_STYLE[st].replace("line-through", "") + " font-medium" : "hover:bg-muted",
              )}
            >
              <span className={cn("size-1.5 rounded-full", DOT[st])} />
              {st === "hypothesis" ? "Untested" : st}
            </Button>
          ))}
        </div>
        {item.evidence && !verdict && (
          <p className="rounded-md border bg-muted/50 p-2 text-[11px]">
            <span className="font-medium">Evidence:</span> {item.evidence.test} — {item.evidence.result}
          </p>
        )}
        {verdict && (
          <div className="space-y-2 rounded-md border border-signal/40 p-2.5">
            <p className="text-xs font-medium">What backs up “{verdict}”?</p>
            <label className="block text-[11px] text-muted-foreground">
              Which test?
              <input
                list={`tests-${item.id}`}
                value={test}
                onChange={(e) => setTest(e.target.value)}
                placeholder="e.g. 10 parent interviews"
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-signal"
              />
              <datalist id={`tests-${item.id}`}>
                {cards.map((c) => <option key={c.id} value={c.title} />)}
              </datalist>
            </label>
            <label className="block text-[11px] text-muted-foreground">
              What was the result?
              <Textarea value={result} onChange={(e) => setResult(e.target.value)} placeholder="e.g. 7 of 10 said they'd pay R250; 3 pre-paid" className="mt-1 min-h-12 text-xs text-foreground" />
            </label>
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => setVerdict(null)}>Cancel</Button>
              <Button
                size="sm"
                disabled={!test.trim() || !result.trim()}
                onClick={() => {
                  const card = cards.find((c) => c.title === test.trim());
                  updateItem(block, item.id, { status: verdict, evidence: { test: test.trim(), result: result.trim(), at: new Date().toISOString(), ...(card ? { testCardId: card.id } : {}) } });
                  setVerdict(null);
                }}
              >
                Mark {verdict}
              </Button>
            </div>
          </div>
        )}
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={() => deleteItem(block, item.id)} className="text-destructive">
            <Trash2 /> Delete
          </Button>
          <Button size="sm" onClick={() => text.trim() && updateItem(block, item.id, { text: text.trim() })}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
