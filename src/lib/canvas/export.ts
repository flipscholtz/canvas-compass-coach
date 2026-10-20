import { BLOCKS, BLOCK_ORDER, type CanvasVersion, type TestCard } from "./types";

interface Exportable {
  scenarioName: string;
  versions: CanvasVersion[];
  cards: TestCard[];
}

export const exportJson = (s: Exportable) =>
  JSON.stringify({ venture: s.scenarioName, versions: s.versions, testCards: s.cards }, null, 2);

const mark = { hypothesis: "🟡", validated: "🟢", invalidated: "🔴" } as const;

export function exportMarkdown(s: Exportable) {
  const head = s.versions[s.versions.length - 1];
  const lines = [`# ${s.scenarioName}`, "", `**Current version:** ${head.label}`, "", `_${head.note}_`, ""];
  for (const b of BLOCK_ORDER) {
    lines.push(`## ${BLOCKS[b].title}`);
    const items = head.canvas[b];
    lines.push(...(items.length ? items.map((i) => `- ${mark[i.status]} ${i.text}`) : ["- _empty_"]), "");
  }
  lines.push("## Version stack", ...s.versions.map((v) => `- **${v.label}** — ${v.note}`), "");
  if (s.cards.length) {
    lines.push("## Test cards");
    for (const c of s.cards) {
      lines.push(`### ${c.title}`, c.hypothesis, c.experiment, c.metric, c.criteria, "");
    }
  }
  return lines.join("\n");
}
