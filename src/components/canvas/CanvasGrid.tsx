import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
const DOT: Record<ItemStatus, string> = { hypothesis: "bg-hypo", validated: "bg-valid", invalidated: "bg-invalid" };

export function CanvasGrid({ canvas, prev, readOnly }: { canvas: Canvas; prev?: Canvas; readOnly: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:auto-rows-[minmax(150px,auto)] md:grid-cols-10">
      {(Object.keys(LAYOUT) as BlockId[]).map((b) => (
        <Block key={b} id={b} items={canvas[b]} prev={prev?.[b]} readOnly={readOnly} />
      ))}
    </div>
  );
}

function Block({ id, items, prev, readOnly }: { id: BlockId; items: CanvasItem[]; prev?: CanvasItem[]; readOnly: boolean }) {
  const addItems = useCanvasStore((s) => s.addItems);
  const [adding, setAdding] = useState("");
  const [open, setOpen] = useState(false);
  const isVP = id === "valueProps";
  const prevTexts = new Set(prev?.map((p) => p.text.toLowerCase()));
  const curTexts = new Set(items.map((p) => p.text.toLowerCase()));
  const removed = prev?.filter((p) => !curTexts.has(p.text.toLowerCase())) ?? [];

  return (
    <div
      className={cn(
        "group flex flex-col rounded-lg border bg-card p-3 shadow-card",
        isVP && "border-2 border-signal",
        LAYOUT[id],
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className={cn("font-display text-sm font-semibold leading-tight", isVP && "text-signal")}>
            {BLOCKS[id].title}
          </h3>
          <p className="text-[11px] text-muted-foreground">{BLOCKS[id].hint}</p>
        </div>
        {!readOnly && (
          <button
            aria-label={`Add to ${BLOCKS[id].title}`}
            onClick={() => setOpen((o) => !o)}
            className="rounded p-1 text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100"
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>
      <ul className="flex flex-1 flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.id}>
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
  const { updateItem, deleteItem } = useCanvasStore();
  const [text, setText] = useState(item.text);
  const body = (
    <span
      className={cn(
        "flex w-full items-start gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs leading-snug transition-shadow",
        STATUS_STYLE[item.status],
        isNew && "ring-2 ring-valid/60",
        !readOnly && "hover:shadow-card cursor-pointer",
      )}
    >
      <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", DOT[item.status])} />
      <span className="flex-1">{item.text}</span>
      {isNew && <span className="font-mono text-[9px] uppercase text-valid">new</span>}
    </span>
  );
  if (readOnly) return body;
  return (
    <Popover onOpenChange={(o) => o && setText(item.text)}>
      <PopoverTrigger asChild>
        <button className="w-full">{body}</button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-16 text-sm" />
        <div className="grid grid-cols-3 gap-1">
          {(["hypothesis", "validated", "invalidated"] as ItemStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => updateItem(block, item.id, { status: st })}
              className={cn(
                "flex items-center justify-center gap-1 rounded-md border px-1 py-1 text-[11px] capitalize",
                item.status === st ? STATUS_STYLE[st].replace("line-through", "") + " font-medium" : "hover:bg-muted",
              )}
            >
              <span className={cn("size-1.5 rounded-full", DOT[st])} />
              {st === "hypothesis" ? "Untested" : st}
            </button>
          ))}
        </div>
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
