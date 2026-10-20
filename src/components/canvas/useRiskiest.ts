import { toast } from "sonner";
import { useCanvasStore } from "@/lib/canvas/store";
import { pickRiskiest, testCardFromAssumption } from "@/lib/canvas/assumptions";
import { BLOCKS } from "@/lib/canvas/types";

/** Finds the single most critical unverified assumption and drafts a Test Card for it. */
export function useRiskiest() {
  return function identifyRiskiest() {
    const s = useCanvasStore.getState();
    const head = s.versions[s.versions.length - 1]!.canvas;
    const pick = pickRiskiest(head, s.cards);
    if (!pick) {
      s.pushMessage({
        role: "coach",
        text: "Every untested assumption on your canvas already has a test card. What did your last experiment teach you that you haven't written down yet?",
      });
      return;
    }
    s.addCard(testCardFromAssumption(pick));
    s.pushMessage({
      role: "coach",
      text: `If one thing kills this venture, it's probably this — sitting under “${pick.item.text}” in ${BLOCKS[pick.block].title}. I've drafted a Test Card below. Before you run it: what evidence do you already have that this is true, and is it behaviour or just opinion?`,
      assumptions: [pick.assumption],
    });
    toast.success("Test card drafted from your riskiest assumption");
  };
}
