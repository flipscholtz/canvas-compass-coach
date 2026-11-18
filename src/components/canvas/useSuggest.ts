import { useState } from "react";
import { toast } from "sonner";
import { useCanvasStore } from "@/lib/canvas/store";
import { suggestAssumptions } from "@/lib/canvas/coach";
import { llmSuggest } from "@/lib/canvas/llm";
import { useServerAi } from "./useServerAi";
import { BLOCK_ORDER, BLOCKS, type BlockId } from "@/lib/canvas/types";

/** Adds synthetic, testable assumptions (yellow) to one or all blocks. */
export function useSuggest() {
  const serverAi = useServerAi();
  const [busy, setBusy] = useState<BlockId | "all" | null>(null);

  async function suggest(target: BlockId | "all") {
    const s = useCanvasStore.getState();
    const canvas = s.versions.at(-1)?.canvas;
    if (!canvas) return;
    const blocks = target === "all" ? BLOCK_ORDER : [target];
    setBusy(target);
    try {
      const adds = serverAi
        ? await llmSuggest({ canvas, blocks })
        : blocks.flatMap((b) => suggestAssumptions(canvas, b).map((text) => ({ block: b, text })));
      if (!adds.length) {
        toast("No new assumptions to suggest here — test the ones you have.");
        return;
      }
      s.addItems(adds, "suggested");
      toast.success(
        `Added ${adds.length} untested assumption${adds.length > 1 ? "s" : ""}${target === "all" ? "" : ` to ${BLOCKS[target].title}`}. Generate test cards to go validate them.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't generate assumptions");
    } finally {
      setBusy(null);
    }
  }

  return { suggest, busy };
}
