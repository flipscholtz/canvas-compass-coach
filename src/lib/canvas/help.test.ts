import { beforeEach, describe, expect, it } from "vitest";
import { coachHelp } from "./help";
import { BLOCK_ORDER, emptyCanvas, type ChatMessage } from "./types";
import { useCanvasStore } from "./store";

const history: ChatMessage[] = [
  { id: "u", role: "user", text: "We offer domestic cleaning services to homeowners" },
  { id: "c", role: "coach", text: "Do you have any data on how many homeowners hire domestic workers?" },
];
function help(text = "Can you help me find some data?") {
  const result = coachHelp({ text, canvas: emptyCanvas(), history });
  if (!result) throw new Error("Expected help");
  return result;
}

describe("practical help", () => {
  it("gives three searches, honest source guidance and five first-hand interviews for cleaning", () => {
    const { reply, offer } = help();
    expect(reply).toContain("I can't look this up live");
    expect(reply).toContain("household or labour-force surveys");
    expect(reply).toContain("Google Trends");
    expect(reply).toContain("competitor websites and reviews");
    expect(reply.match(/^• /gm)).toHaveLength(3);
    expect(reply).toContain("5 short interviews");
    expect(reply).toContain("won't estimate a whole market");
    expect(reply.match(/\?/g)).toHaveLength(1);
    expect(offer.block).toBe("segments");
    expect(offer.claim).toBe("homeowners in our target area already hire and pay domestic workers for cleaning");
  });
  it.each(["give me an example", "what do you mean?", "I don't know", "help"])("answers %s concretely and ends with one question", (text) => {
    const { reply } = help(text);
    expect(reply).toContain("last time they hired a domestic worker");
    expect(reply.match(/\?/g)).toHaveLength(1);
  });
  it.each(BLOCK_ORDER)("keeps help relevant to %s when no prior coach question is available", (block) => {
    const result = coachHelp({ text: "give me an example", canvas: emptyCanvas(), block });
    expect(result?.offer.block).toBe(block);
    expect(result?.offer.card.block).toBe(block);
  });
});

describe("consent", () => {
  beforeEach(() => useCanvasStore.getState().newScenario());
  function proposal() {
    const s = useCanvasStore.getState();
    s.pushMessage({ role: "coach", text: help().reply, helpOffer: { ...help().offer, versionId: s.versions.at(-1)?.id ?? "" } });
    const id = useCanvasStore.getState().messages.at(-1)?.id;
    if (!id) throw new Error("Missing message");
    return id;
  }
  it("Yes saves exactly one untested note and card with no evidence", () => {
    const id = proposal();
    const s = useCanvasStore.getState();
    s.resolveHelpOffer(id, true);
    s.resolveHelpOffer(id, true);
    const next = useCanvasStore.getState();
    expect(next.versions.at(-1)?.canvas.segments).toHaveLength(1);
    expect(next.versions.at(-1)?.canvas.segments[0]?.status).toBe("hypothesis");
    expect(next.versions.at(-1)?.canvas.segments[0]?.evidence).toBeUndefined();
    expect(next.cards).toHaveLength(1);
    expect(next.cards[0]?.assumption).toBe(help().offer.claim);
  });
  it("Not now creates nothing and cannot be accepted later", () => {
    const id = proposal();
    useCanvasStore.getState().resolveHelpOffer(id, false);
    useCanvasStore.getState().resolveHelpOffer(id, true);
    expect(useCanvasStore.getState().cards).toEqual([]);
    expect(useCanvasStore.getState().versions.at(-1)?.canvas.segments).toEqual([]);
  });
  it("does not apply an earlier-version offer to a new working canvas", () => {
    const id = proposal();
    useCanvasStore.getState().commitVersion("v1.1", "new snapshot");
    useCanvasStore.getState().resolveHelpOffer(id, true);
    expect(useCanvasStore.getState().cards).toEqual([]);
  });
});