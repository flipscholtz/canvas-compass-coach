import { BLOCKS, BLOCK_ORDER, type BlockId, type CanvasVersion, type TestCard } from "./types";

/** Pure, deterministic analysis of how a business model evolved across versions. */

export interface Transition {
  from: string;
  to: string;
  note: string;
  added: { block: BlockId; text: string }[];
  removed: { block: BlockId; text: string; status: string }[];
  pivotBlocks: BlockId[];
}

export interface Insight {
  kind: "pivot" | "learning" | "foundation" | "unstable" | "blindspot" | "untouched";
  title: string;
  detail: string;
  block?: BlockId | undefined;
}

export interface Journey {
  transitions: Transition[];
  insights: Insight[];
  directions: string[];
  churn: Record<BlockId, number>;
}

const norm = (t: string) => t.trim().toLowerCase();
const CORE: BlockId[] = ["segments", "valueProps", "revenue"];

export function analyzeJourney(versions: CanvasVersion[], cards: TestCard[] = []): Journey {
  const churn = Object.fromEntries(BLOCK_ORDER.map((b) => [b, 0])) as Record<BlockId, number>;
  const transitions: Transition[] = [];
  const insights: Insight[] = [];

  for (let i = 1; i < versions.length; i++) {
    const a = versions[i - 1]!, b = versions[i]!;
    const t: Transition = { from: a.label, to: b.label, note: b.note, added: [], removed: [], pivotBlocks: [] };
    for (const blk of BLOCK_ORDER) {
      const before = a.canvas[blk] ?? [], after = b.canvas[blk] ?? [];
      const bs = new Set(before.map((x) => norm(x.text))), as = new Set(after.map((x) => norm(x.text)));
      const add = after.filter((x) => !bs.has(norm(x.text)));
      const rem = before.filter((x) => !as.has(norm(x.text)));
      add.forEach((x) => t.added.push({ block: blk, text: x.text }));
      rem.forEach((x) => t.removed.push({ block: blk, text: x.text, status: x.status }));
      churn[blk] += add.length + rem.length;
      if (CORE.includes(blk) && before.length > 0 && rem.length >= Math.ceil(before.length / 2) && add.length > 0)
        t.pivotBlocks.push(blk);
    }
    transitions.push(t);
    if (t.pivotBlocks.length)
      insights.push({
        kind: "pivot",
        title: `${b.label}: pivot in ${t.pivotBlocks.map((x) => BLOCKS[x].title).join(", ")}`,
        detail: `Trigger: "${b.note}". Replaced ${t.removed.filter((r) => t.pivotBlocks.includes(r.block)).map((r) => `"${r.text}"`).join(", ")}.`,
        block: t.pivotBlocks[0],
      });
    const learned = t.removed.filter((r) => r.status === "invalidated");
    if (learned.length)
      insights.push({
        kind: "learning",
        title: `${b.label}: dropped ${learned.length} invalidated hypothesis${learned.length > 1 ? "es" : ""}`,
        detail: learned.map((r) => `"${r.text}" (${BLOCKS[r.block].title})`).join("; ") + ". Evidence drove this change — keep it in mind so it isn't reintroduced.",
      });
  }

  const latest = versions[versions.length - 1];
  if (latest && versions.length > 1) {
    const first = versions[0]!;
    for (const blk of BLOCK_ORDER) {
      const items = latest.canvas[blk] ?? [];
      const survived = items.filter((x) => versions.every((v) => (v.canvas[blk] ?? []).some((y) => norm(y.text) === norm(x.text))));
      survived.filter((x) => x.status === "validated").forEach((x) =>
        insights.push({ kind: "foundation", title: `Stable foundation: ${BLOCKS[blk].title}`, detail: `"${x.text}" survived every version and is validated. Build on it.`, block: blk }));
      survived.filter((x) => x.status === "hypothesis" && x.source !== "suggested").forEach((x) => {
        const tested = cards.some((c) => c.block === blk);
        if (!tested) insights.push({ kind: "blindspot", title: `Untested since ${first.label}: ${BLOCKS[blk].title}`, detail: `"${x.text}" has carried through every version without evidence. Is it still true after your changes?`, block: blk });
      });
      if (items.length === 0 && versions.every((v) => (v.canvas[blk] ?? []).length === 0))
        insights.push({ kind: "untouched", title: `${BLOCKS[blk].title} never explored`, detail: "No version has addressed this block yet.", block: blk });
    }
    const max = Math.max(...Object.values(churn));
    if (max >= 3) {
      const blk = BLOCK_ORDER.find((b) => churn[b] === max)!;
      insights.push({ kind: "unstable", title: `Most volatile block: ${BLOCKS[blk].title}`, detail: `${max} additions/removals across versions — you are still searching here.`, block: blk });
    }
  }

  const directions: string[] = [];
  const pivots = transitions.filter((t) => t.pivotBlocks.length);
  const lastPivot = pivots[pivots.length - 1];
  if (lastPivot) {
    const downstream = BLOCK_ORDER.filter((b) => !CORE.includes(b) && !lastPivot.added.some((x) => x.block === b) && !lastPivot.removed.some((x) => x.block === b));
    if (downstream.length)
      directions.push(`After pivoting in ${lastPivot.to}, ${downstream.slice(0, 3).map((b) => BLOCKS[b].title).join(", ")} didn't change. Do they still fit the new model?`);
  }
  const unstable = insights.find((i) => i.kind === "unstable");
  if (unstable?.block) directions.push(`${BLOCKS[unstable.block].title} keeps shifting. What single experiment would settle it before the next version?`);
  const blind = insights.filter((i) => i.kind === "blindspot");
  if (blind.length) directions.push(`${blind.length} founding assumption${blind.length > 1 ? "s have" : " has"} never been tested. Which one would hurt most if wrong?`);
  const foundation = insights.find((i) => i.kind === "foundation");
  if (foundation?.block) directions.push(`${BLOCKS[foundation.block].title} is your proven ground. Which adjacent segment or channel could reuse it?`);
  const untouched = insights.filter((i) => i.kind === "untouched");
  if (untouched.length) directions.push(`Still unexplored: ${untouched.map((i) => BLOCKS[i.block!].title).join(", ")}. What are you assuming there?`);
  if (versions.length < 2) directions.push("Commit a new version after your next experiment to start building a journey.");

  return { transitions, insights, directions, churn };
}
