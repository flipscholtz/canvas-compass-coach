import { BLOCK_ORDER, BLOCKS, type BlockId, type Canvas, type CanvasItem } from "./types";

export interface CoherenceFinding {
  id: string;
  kind: "missing" | "potential" | "recorded";
  priority: number;
  title: string;
  blocks: BlockId[];
  entries: { block: BlockId; item: CanvasItem }[];
  why: string;
  action: string;
}

const MONEY = /(?:\b(?:R|ZAR|USD|EUR|GBP)\s*\d|[$€£]\s*\d|\d\s*(?:rand|dollars|euros))/i;
const DEPTH: Record<BlockId, { detail: RegExp; why: string; action: string }> = {
  segments: { detail: /parent|grade|school|manager|owner|household|clinic|industry|\d/i, why: "The payer and service user may differ; reaching a broad audience does not establish a buyer.", action: "Specify the first customer profile, the service user and who controls the budget." },
  valueProps: { detail: /improv|reduc|save|help|pass|achiev|pain|gain|result|outcome/i, why: "A service description alone does not establish the outcome customers will pay for.", action: "What measurable outcome will customers receive, compared with their current alternative?" },
  channels: { detail: /school|referr|outreach|search|social|facebook|whatsapp|instagram|email|partner|direct|website|tiktok/i, why: "Customers need a credible discovery and purchase path.", action: "Name the first acquisition channel and how you will test whether it reaches the stated payer." },
  relationships: { detail: /self.service|support|account|personal|community|onboard|group|feedback|dedicated|check.in/i, why: "Retention and support promises affect both workload and repeat revenue.", action: "Describe onboarding, ongoing support and who provides it." },
  revenue: { detail: MONEY, why: "A revenue category is not enough to estimate what each customer contributes.", action: "Record a proposed price, charging unit, billing period and expected paying customer numbers." },
  keyResources: { detail: /tutor|teacher|engineer|developer|data|platform|software|internet|staff|capital|licen|equipment|people|content/i, why: "The promised outcome requires available people, tools and capacity.", action: "Name the people, tools and capacity required to deliver the stated value proposition." },
  keyActivities: { detail: /teach|tutor|lesson|assess|schedul|deliver|develop|build|research|train|onboard|support|market/i, why: "Resources alone do not specify how the service is delivered reliably.", action: "Name the delivery activities, frequency and person responsible for each." },
  keyPartners: { detail: /school|supplier|platform|provider|partner|tutor|none|no external|independent|not required/i, why: "Unrecorded external dependencies can interrupt delivery or acquisition.", action: "Name essential suppliers or partners, or explicitly record that none are required and why." },
  costs: { detail: MONEY, why: "Cost categories without amounts and timing cannot establish financial viability.", action: "Estimate each operating expense, separating fixed monthly costs from costs per customer or session." },
};

/** Pure local review: statements and status labels are not proof of validation. */
export function analyzeCoherence(canvas: Canvas) {
  const active = (block: BlockId) => canvas[block].filter((item) => item.status !== "invalidated" && item.text.trim());
  const text = (block: BlockId) => active(block).map((item) => item.text).join(" ");
  const entries = (blocks: BlockId[]) => blocks.flatMap((block) => active(block).map((item) => ({ block, item })));
  const findings: CoherenceFinding[] = [];
  const add = (id: string, kind: CoherenceFinding["kind"], priority: number, title: string, blocks: BlockId[], why: string, action: string) => {
    findings.push({ id, kind, priority, title, blocks, entries: entries(blocks), why, action });
  };
  const occupied = BLOCK_ORDER.filter((block) => active(block).length);
  const tutoring = /tutor|mathematics|physical sciences|lesson/i.test(text("valueProps") + text("revenue"));

  if (active("revenue").length || active("costs").length) {
    const missing = [
      ...(!MONEY.test(text("revenue")) ? ["price and billing unit"] : []),
      ...(!/\b(?:\d[\d,]*\s+paying\s+(?:learners|students|customers|subscribers|clients)|(?:expect|target|forecast)\w*\s+(?:of\s+)?\d[\d,]*\s+(?:paying\s+)?(?:learners|students|customers|subscribers|clients))\b/i.test(text("revenue") + " " + text("segments")) ? [tutoring ? "expected paying learner numbers" : "expected paying customer numbers"] : []),
      ...(!MONEY.test(text("costs")) ? [tutoring ? "tutor payment rates and other operating expense amounts" : "operating expense amounts"] : []),
      ...(!/fixed|variable|per (?:learner|customer|session|hour)|monthly|per month/i.test(text("costs")) ? ["fixed versus variable costs and their time basis"] : []),
    ];
    add("financial", missing.length ? "missing" : "potential", 0, "Can revenue cover delivery costs?", ["revenue", "costs", "segments"],
      missing.length ? `The entries do not establish ${missing.join("; ")}. Financial viability cannot yet be assessed; this is not a conclusion that the business is unprofitable.` : "Price and some cost figures are recorded, but capacity, cost coverage and retention still require a comparable financial model; no loss or profit is established by these statements alone.",
      tutoring ? "At the stated monthly price, how many learners will pay, how many tutor hours or group sessions will they need, what will tutors be paid, and what are the remaining monthly expenses? Build a monthly revenue-versus-cost estimate." : "Build a same-period revenue-versus-cost estimate using paying customer numbers, delivery capacity, variable costs and fixed operating expenses.");
  }
  if (active("valueProps").length && active("revenue").length) {
    add("value-price", "potential", 1, "Does the offer justify the proposed price?", ["valueProps", "revenue"], "A stated benefit and price do not demonstrate willingness to pay or clarify how much service is included. The price is not assumed to be wrong.", "What outcome and service quantity does this price buy, what alternative does the payer use today, and what paid trial or commitment would test willingness to pay?");
  }
  if (active("valueProps").length || tutoring) {
    const tech = /\b(ai|software|platform|diagnostics)\b/i.test(text("valueProps"));
    const resourcesMissing = !active("keyResources").length || (tutoring && !/tutor|teacher/i.test(text("keyResources"))) || (tech && !/engineer|developer|data|software|model/i.test(text("keyResources")));
    const activitiesMissing = !active("keyActivities").length || (tutoring && !/tutor|teach|lesson|assess/i.test(text("keyActivities")));
    if (resourcesMissing || activitiesMissing) add("delivery", "missing", 1, "Delivery capability is not established", ["valueProps", "revenue", "keyResources", "keyActivities"], tutoring ? "Weekly online tutoring depends on qualified tutors, connectivity, lesson preparation, scheduling and assessment. The listed resources or activities do not yet establish these delivery capabilities." : "The promised value is not yet backed by clearly identified delivery resources and activities.", tutoring ? "Who will teach Mathematics and Physical Sciences, using which online tools, and who prepares lessons, schedules sessions and checks learner progress?" : "Which people and tools deliver the promised outcome, and what recurring activities must they perform?");
  }
  if (active("segments").length && active("channels").length) {
    const mismatch = /enterprise|bank|government|hospital/i.test(text("segments")) && /tiktok|instagram|viral/i.test(text("channels"));
    add("reach", "potential", mismatch ? 1 : 3, "Can these channels reach the stated buyer?", ["segments", "channels"], mismatch ? "Consumer-facing channels may not reach an institutional buying committee; this is a potential mismatch, not a proven contradiction." : "Naming a customer and a channel does not establish that the intended payer uses that channel or will convert.", "Where does this specific payer seek help, and what small channel test will measure qualified enquiries, conversion and acquisition cost?");
  }
  if (/support|personal|dedicated|feedback|account manager|white.glove|check.in/i.test(text("relationships"))) {
    add("support-cost", "potential", 2, "Support promises may add operating costs", ["relationships", "costs"], "The promised relationship requires staff time. General administration or tutor cost categories do not establish how that workload is funded.", "How many support, feedback and onboarding hours are needed per customer, who provides them, and where are those costs included?");
  }
  for (const block of BLOCK_ORDER) {
    const items = active(block);
    const rule = DEPTH[block];
    if (!items.length || !rule.detail.test(text(block))) {
      const context: BlockId[] = occupied.includes("valueProps") && block !== "valueProps" ? ["valueProps"] : occupied.includes("revenue") && block !== "revenue" ? ["revenue"] : [];
      add(`gap-${block}`, "missing", ["segments", "valueProps"].includes(block) ? 1 : 4, `${BLOCKS[block].title}: ${items.length ? "needs more detail" : "no active entries"}`, [block, ...context], rule.why, rule.action);
    }
  }
  // Include every recorded entry so a changed block is always visible, even when no rule is triggered.
  findings.push({ id: "evidence", kind: "recorded", priority: 5, title: "Recorded information is not automatically confirmed", blocks: [...BLOCK_ORDER], entries: BLOCK_ORDER.flatMap((block) => canvas[block].map((item) => ({ block, item }))), why: "Untested hypotheses remain untested. Items marked validated retain that user-recorded status, but this checker cannot verify supporting evidence. Invalidated entries are excluded from active-model checks.", action: "For any claim you consider confirmed, record the test result and supporting evidence in the decision log; a drafted Test Card is not a completed test." });
  return {
    summary: occupied.length ? `Reviewed all nine blocks (${occupied.length} with active entries). No genuine contradiction is established by this local rule-based review. The findings below distinguish missing information and potential tensions; they are not proof of inconsistency.` : "Reviewed all nine blocks. There is insufficient active information for meaningful coherence analysis. Start with the customer, their problem and the promised outcome, then establish delivery and finances.",
    findings: findings.sort((a, b) => a.priority - b.priority),
  };
}

export function coherenceKey(canvas: Canvas) {
  return JSON.stringify(BLOCK_ORDER.map((block) => [block, canvas[block].map(({ text, status }) => [text, status])]));
}

export function formatCoherenceFinding(finding: CoherenceFinding) {
  const label = { missing: "Missing information", potential: "Potential inconsistency / open question", recorded: "Recorded information" }[finding.kind];
  const lines = finding.entries.map(({ block, item }) => `${BLOCKS[block].title} — “${item.text}” [${item.status === "validated" ? "Marked validated; evidence not verified" : item.status === "invalidated" ? "Invalidated" : "Untested hypothesis"}]`);
  const empty = finding.blocks.filter((block) => !finding.entries.some((entry) => entry.block === block));
  return `${finding.title}\n${label} · ${finding.blocks.map((block) => BLOCKS[block].title).join(" / ")}\n${[...lines, ...empty.map((block) => `${BLOCKS[block].title} — no active entries`)].join("\n")}\nWhy it matters: ${finding.why}\nNext: ${finding.action}`;
}