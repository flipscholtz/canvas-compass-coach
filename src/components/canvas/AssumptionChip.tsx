import { cn } from "@/lib/utils";
import type { Assumption, AssumptionLens } from "@/lib/canvas/types";

export const LENS_STYLE: Record<AssumptionLens, string> = {
  desirability: "bg-accent text-accent-foreground",
  feasibility: "bg-secondary text-secondary-foreground",
  viability: "bg-valid-soft text-valid",
};

export function AssumptionChip({ assumption }: { assumption: Assumption }) {
  return (
    <div className="flex items-start gap-2 text-xs leading-snug">
      <span
        className={cn(
          "mt-px shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
          LENS_STYLE[assumption.lens],
        )}
      >
        {assumption.lens}
      </span>
      <span>We believe that {assumption.text.replace(/^\s*we believe that\s+/i, "")}.</span>
    </div>
  );
}
