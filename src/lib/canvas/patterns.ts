import { BLOCKS, BLOCK_ORDER, type BlockId, type Canvas } from "./types";

/** Business model patterns from Osterwalder & Pigneur (2010), Business Model Generation. */
export type PatternId = "unbundling" | "longTail" | "multiSided" | "free" | "open";

export const PATTERN_SOURCE = "Osterwalder & Pigneur (2010), Business Model Generation";
export const MIN_FILLED_BLOCKS = 5;

interface PatternDef {
  name: string;
  short: string;
  cues: Partial<Record<BlockId, RegExp>>;
  /** Blocks that usually change when pivoting INTO this pattern. */
  changes: BlockId[];
  alternative: PatternId;
}

export const PATTERNS: Record<PatternId, PatternDef> = {
  unbundling: {
    name: "Unbundling", short: "Unbundling",
    cues: {
      keyActivities: /\b(infrastructure|product innovation|customer relationship management|focus|specialis|speciali[sz]e|outsourc)/i,
      keyPartners: /\b(outsourc|white.?label|contract manufactur|supplier)/i,
      valueProps: /\b(one.?stop|end.?to.?end|all.?in.?one|full.?service)/i,
    },
    changes: ["keyActivities", "keyPartners", "keyResources"],
    alternative: "open",
  },
  longTail: {
    name: "The Long Tail", short: "Long Tail",
    cues: {
      valueProps: /\b(niche|wide (range|selection)|catalog|catalogue|library|many (small|different))/i,
      channels: /\b(online|marketplace|app|platform|website|self.?serve)/i,
      keyResources: /\b(platform|catalog|catalogue|content library)/i,
      segments: /\b(niche|hobbyist|long tail)/i,
    },
    changes: ["valueProps", "keyResources", "channels"],
    alternative: "multiSided",
  },
  multiSided: {
    name: "Multi-Sided Platform", short: "Multi-sided",
    cues: {
      segments: /\b(both|buyers? and sellers?|two.?sided|and (tutors|drivers|hosts|advertisers|suppliers|sellers))/i,
      valueProps: /\b(connect|match|marketplace|platform)/i,
      revenue: /\b(commission|take rate|listing fee|advertis|transaction fee)/i,
      keyResources: /\b(platform|network)/i,
    },
    changes: ["segments", "valueProps", "revenue"],
    alternative: "free",
  },
  free: {
    name: "FREE as a Business Model", short: "FREE",
    cues: {
      revenue: /\b(free|freemium|premium|upgrade|advertis|ads\b|pro tier)/i,
      valueProps: /\b(free|no cost|at no charge)/i,
      segments: /\b(free users?|non.?paying|subsidi)/i,
      costs: /\b(server|hosting|marginal cost)/i,
    },
    changes: ["revenue", "segments", "costs"],
    alternative: "longTail",
  },
  open: {
    name: "Open Business Model", short: "Open",
    cues: {
      keyPartners: /\b(licens|university|research|open source|external (r&d|partners)|co.?develop)/i,
      keyActivities: /\b(licens|open innovation|r&d|research)/i,
      revenue: /\b(licens|royalt|ip\b)/i,
      keyResources: /\b(patent|ip\b|intellectual property)/i,
    },
    changes: ["keyPartners", "keyResources", "revenue"],
    alternative: "unbundling",
  },
};

export const filledBlocks = (canvas: Canvas) => BLOCK_ORDER.filter((b) => canvas[b].length > 0);

export interface PatternSuggestion {
  match: PatternId | null;
  why: string;
  evidenceBlocks: BlockId[];
  alternative: PatternId;
  question: string;
  /** Blocks expected to change if the user forks toward the alternative. */
  changes: BlockId[];
}

const names = (bs: BlockId[]) => bs.map((b) => BLOCKS[b].title).join(", ");

/** Deterministically matches the canvas to the closest pattern; needs ≥2 cue blocks to claim a match. */
export function suggestPattern(canvas: Canvas): PatternSuggestion {
  let best: { id: PatternId; hits: BlockId[] } | null = null;
  for (const id of Object.keys(PATTERNS) as PatternId[]) {
    const hits = (Object.entries(PATTERNS[id].cues) as [BlockId, RegExp][])
      .filter(([b, re]) => canvas[b].some((i) => re.test(i.text)))
      .map(([b]) => b);
    if (hits.length >= 2 && (!best || hits.length > best.hits.length)) best = { id, hits };
  }
  const alternative: PatternId = best ? PATTERNS[best.id].alternative : "free";
  const alt = PATTERNS[alternative];
  const changes = alt.changes;
  const question = `If you moved toward ${alt.name}, what exactly would you rewrite in ${names(changes)} — and which of today's entries would no longer hold?`;
  if (!best)
    return {
      match: null,
      why: "None of the five patterns clearly fits yet: no two blocks share the signals of a single pattern. That's fine — many early models are a plain one-sided business.",
      evidenceBlocks: [],
      alternative, question, changes,
    };
  return {
    match: best.id,
    why: `Your canvas most resembles ${PATTERNS[best.id].name}. The signals sit in ${names(best.hits)}.`,
    evidenceBlocks: best.hits,
    alternative, question, changes,
  };
}

const PIVOT_CUES: [RegExp, BlockId][] = [
  [/segment|customer|audience|market|user/i, "segments"],
  [/pric|revenue|monetis|monetiz|subscription|fee|freemium/i, "revenue"],
  [/value|offer|product|feature/i, "valueProps"],
  [/channel|distribut|sales|reach/i, "channels"],
  [/relationship|support|community|retention/i, "relationships"],
  [/partner|supplier|licens/i, "keyPartners"],
  [/activit|process|operat/i, "keyActivities"],
  [/resource|tech|platform|team/i, "keyResources"],
  [/cost|margin|cheap/i, "costs"],
];
/** Blocks a one-line pivot name points at (e.g. "new pricing" → Revenue Streams). */
export const blocksForPivot = (name: string): BlockId[] => [...new Set(PIVOT_CUES.filter(([re]) => re.test(name)).map(([, b]) => b))];
