import { BLOCKS, BLOCK_ORDER, type BlockId, type Canvas, type ChatMessage, type HelpOffer } from "./types";

export function helpIntent(text: string): "data" | "example" | "clarify" | null {
  if (/\b(data|statistics|stats|research|evidence|sources?)\b/i.test(text) && /\?|\b(help|find|where|look|give|need|can you)\b/i.test(text)) return "data";
  if (/\b(give|show|share)\b.*\bexample\b|\bfor example\b/i.test(text)) return "example";
  if (/^(help|what do you mean|explain|can you explain|could you explain|please help|i don['’]?t (know|understand)|i do not (know|understand)|not sure)\b/i.test(text.trim())) return "clarify";
  return null;
}

const GUIDANCE: Record<BlockId, { claim: string; example: string; search: string; question: string }> = {
  segments: { claim: "the target customers already pay for help with this job", example: "ask a target customer about the last time they hired someone, how they found them and what they paid", search: "household survey customer spending", question: "Which local customer could you ask about the last time they paid for help with this job?" },
  valueProps: { claim: "customers value the proposed benefit more than their current workaround", example: "ask what made their last workaround frustrating and what happened as a result", search: "customer complaints alternatives", question: "Which customer could describe the last time their current workaround let them down?" },
  channels: { claim: "target customers discover and trust providers through the proposed channel", example: "ask where they found the last provider they actually hired, rather than where they might search", search: "customer acquisition referral channels", question: "Where could you ask a customer how they found their last provider?" },
  relationships: { claim: "customers need the proposed level of support to keep using the service", example: "ask about the last support request, how it was handled and whether they stayed", search: "customer support retention reviews", question: "Which customer could tell you about their last support experience?" },
  keyActivities: { claim: "the team can perform the proposed activities reliably", example: "observe one real delivery and record its steps, time and errors", search: "service delivery workflow benchmarks", question: "Which delivery activity could you observe or try manually this week?" },
  keyResources: { claim: "the required resources can be secured within the venture’s budget", example: "ask a worker or supplier for current availability and a written quote", search: "skills availability supplier rates", question: "Who could give you a real quote or availability check this week?" },
  keyPartners: { claim: "a suitable partner will agree to a pilot on workable terms", example: "ask a named potential partner about their last pilot and the terms they required", search: "trade association supplier partnership", question: "Which potential partner could you approach about a small pilot?" },
  revenue: { claim: "target customers will pay the proposed price", example: "ask about their last actual purchase, then offer a small paid pilot instead of asking if they like the idea", search: "competitor service pricing customer spending", question: "Which customer could you invite to a small paid pilot at your proposed price?" },
  costs: { claim: "delivery costs can fit within the proposed revenue", example: "get a written supplier quote and time one delivery, including travel and rework", search: "supplier prices delivery labour costs", question: "Which cost could you check with a quote or timed trial this week?" },
};

function relatedBlock(question: string, fallback: BlockId): BlockId {
  const cues: [BlockId, RegExp][] = [
    ["costs", /cost|expense|margin/i], ["revenue", /price|revenue|how much|willing.*pay/i],
    ["keyPartners", /partner|supplier|alliance/i], ["keyResources", /resource|skill|licen[cs]e|equipment/i],
    ["keyActivities", /activit|workflow|deliver.*reliabl/i], ["relationships", /support|relationship|retain/i],
    ["channels", /channel|discover|reach|find.*provider/i], ["valueProps", /benefit|value proposition|workaround/i],
    ["segments", /homeowner|domestic worker|customer|household|who.*for/i],
  ];
  return cues.find(([, re]) => re.test(question))?.[0] ?? fallback;
}

/** Shared, browser-independent help. The configured completion API has no web-search tools. */
export function coachHelp(opts: { text: string; canvas: Canvas; history?: ChatMessage[]; block?: BlockId | null; question?: string }): { reply: string; offer: HelpOffer } | null {
  const intent = helpIntent(opts.text);
  if (!intent) return null;
  const history = opts.history ?? [];
  const prior = [...history].reverse().find((m) => m.role === "coach" && !m.helpOffer && !m.retryUserId)?.text ?? opts.question ?? "";
  const block = relatedBlock(prior, opts.block ?? "segments");
  const guide = GUIDANCE[block];
  const userContext = [...history].reverse().filter((m) => m.role === "user" && !helpIntent(m.text)).slice(0, 3).map((m) => m.text).join(" ");
  const context = `${prior} ${userContext} ${BLOCK_ORDER.flatMap((b) => opts.canvas[b].filter((i) => i.status !== "invalidated").map((i) => i.text)).join(" ")}`;
  const cleaning = /domestic|cleaning|homeowner/i.test(context) && block === "segments";
  const anchor = opts.canvas[block].find((i) => i.status !== "invalidated")?.text;
  const claim = cleaning ? "homeowners in our target area already hire and pay domestic workers for cleaning" : `${guide.claim}${anchor ? ` (to test: “${anchor}”)` : ""}`;
  const topic = cleaning ? "domestic cleaning" : anchor?.replace(/[?\n]/g, " ").slice(0, 100) ?? guide.search;
  const searches = cleaning
    ? ["domestic workers household survey [country]", "homeowners hiring cleaning services [city]", "domestic cleaning industry report [country]"]
    : [`${topic} survey [country]`, `${topic} industry report [country]`, `${topic} prices reviews [city]`];
  const example = cleaning ? "ask a homeowner about the last time they hired a domestic worker, how they found them and what they paid" : guide.example;
  const firstHand = block === "keyActivities" || block === "costs"
    ? "This week: try one manual delivery and record time, cost and errors; get a supplier quote for the biggest unknown. Treat this as an exploratory test, not market-wide proof."
    : block === "keyPartners" || block === "keyResources"
      ? "This week: contact 5 relevant suppliers, workers or potential partners for short calls about availability, terms and recent examples. Treat this as exploratory evidence, not proof of scale."
      : `This week: run 5 short interviews with ${cleaning ? "homeowners in your target area" : "target customers"}. ${example.charAt(0).toUpperCase() + example.slice(1)}. Record recent behaviour, not polite interest; five interviews won't estimate a whole market.`;
  const answer = intent === "data"
    ? `Yes, I can help you plan the search.\n\nI can't look this up live, but here's where I'd look: a national statistics office’s census, household or labour-force surveys; industry or trade association reports; job and service marketplaces; Google Trends; competitor websites and reviews. Check the date, location and who was counted. Employment totals are not household hiring rates, and search interest or reviews are signals, not market-size estimates.\n\nSearch phrases (replace the location):\n${searches.map((s) => `• ${s}`).join("\n")}`
    : `${intent === "example" ? "Sure — here’s an illustrative example, not a fact about your venture." : "Of course — we can work through the unknown together."}\n\nFor ${BLOCKS[block].title}, ${example}. You don't need to guess or claim evidence you don't have.`;
  const question = cleaning ? "Which neighbourhood could you reach five homeowners in this week?" : guide.question;
  return {
    reply: `${answer}\n\n${firstHand}\n\nProposed untested assumption — ${BLOCKS[block].title}: “${claim}”. I can save it and draft a Test Card if you choose Yes below.\n\n${question}`,
    offer: {
      block, claim,
      card: {
        title: `Evidence check: ${BLOCKS[block].title}`,
        block,
        hypothesis: `We believe that ${claim}.`,
        assumption: claim,
        experiment: firstHand,
        metric: "Record recent real examples, spending or quotes, and evidence that contradicts the claim.",
        criteria: "Before running this exploratory test, set a decision threshold; do not mark the claim validated from interest alone.",
      },
    },
  };
}