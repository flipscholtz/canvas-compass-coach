import { beforeEach, expect, it, vi } from "vitest";
import { llmSuggest, llmTurn } from "./llm";
import { serverChat } from "./llm.functions";
import { BLOCK_ORDER, type Canvas } from "./types";

vi.mock("./llm.functions", () => ({ serverChat: vi.fn() }));
const canvas = Object.fromEntries(BLOCK_ORDER.map((block) => [block, []])) as Canvas;
beforeEach(() => vi.mocked(serverChat).mockReset());

it("routes coach context through the shared server without browser credentials or model overrides", async () => {
  vi.mocked(serverChat).mockResolvedValue({ content: JSON.stringify({ reply: "You serve restaurant owners. Their past behaviour matters. What do they do today?", stage: 1, additions: [], assumptions: [], flags: [] }), error: null });
  const result = await llmTurn({ canvas, history: [], stage: 1 });
  expect(result.reply).toContain("restaurant owners");
  expect(serverChat).toHaveBeenCalledWith({ data: { messages: expect.arrayContaining([expect.objectContaining({ content: expect.stringContaining("Current canvas JSON") })]) } });
});

it("routes generated assumptions through the same shared server and keeps their block", async () => {
  vi.mocked(serverChat).mockResolvedValue({ content: JSON.stringify({ assumptions: [{ block: "segments", text: "Owners need an online menu" }] }), error: null });
  expect(await llmSuggest({ canvas, blocks: ["segments"] })).toEqual([{ block: "segments", text: "Owners need an online menu" }]);
  expect(serverChat).toHaveBeenCalledTimes(1);
});