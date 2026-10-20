import { Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSuggest } from "./useSuggest";

export function SuggestAllButton() {
  const { suggest, busy } = useSuggest();
  return (
    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => suggest("all")}>
      {busy ? <Loader2 className="animate-spin" /> : <Lightbulb />}
      Generate assumptions for every block
    </Button>
  );
}
