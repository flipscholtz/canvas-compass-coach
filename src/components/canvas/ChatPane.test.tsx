import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChatPane } from "./ChatPane";
import { useCanvasStore } from "@/lib/canvas/store";
import { llmTurn } from "@/lib/canvas/llm";

vi.mock("./useServerAi", () => ({ useServerAi: () => true }));
vi.mock("@/lib/canvas/llm", () => ({ llmTurn: vi.fn() }));
beforeEach(() => {
  useCanvasStore.getState().newScenario();
  vi.mocked(llmTurn).mockReset();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it("renders an in-chat fallback, allows input and retries the same user turn", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(llmTurn).mockRejectedValueOnce(new Error("bad response")).mockResolvedValueOnce({ reply: "Which area are your homeowners in?", additions: [], assumptions: [], flags: [], stage: 1 });
  render(<ChatPane />);
  const input = screen.getByPlaceholderText(/Answer the coach/);
  fireEvent.change(input, { target: { value: "We offer domestic cleaning to homeowners" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);
  await screen.findByText(/couldn.t answer just now/);
  expect(input).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("Which area are your homeowners in?");
  expect(useCanvasStore.getState().messages.filter((m) => m.role === "user")).toHaveLength(1);
  expect(screen.queryByText(/couldn.t answer just now/)).not.toBeInTheDocument();
});

it("releases a stalled chat at 30 seconds and ignores its late result", async () => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  let finish: ((r: Awaited<ReturnType<typeof llmTurn>>) => void) | undefined;
  vi.mocked(llmTurn).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  render(<ChatPane />);
  const input = screen.getByPlaceholderText(/Answer the coach/);
  fireEvent.change(input, { target: { value: "We offer domestic cleaning to homeowners" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);
  expect(screen.getByRole("status")).toHaveTextContent("Coach is thinking…");
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
  expect(screen.getByText(/couldn.t answer just now/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  expect(input).toBeEnabled();
  await act(async () => { finish?.({ reply: "Late reply", stage: 5, additions: [], assumptions: [], flags: [] }); });
  expect(screen.queryByText("Late reply")).not.toBeInTheDocument();
  expect(useCanvasStore.getState().stage).toBe(1);
});

it("helps without an AI call and saves the proposed note/card only after Yes", async () => {
  render(<ChatPane />);
  const input = screen.getByPlaceholderText(/Answer the coach/);
  fireEvent.change(input, { target: { value: "Can you help me find some data?" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);
  await screen.findByRole("button", { name: /^Yes$/ });
  expect(llmTurn).not.toHaveBeenCalled();
  expect(useCanvasStore.getState().cards).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: /^Yes$/ }));
  expect(useCanvasStore.getState().cards).toHaveLength(1);
  expect(useCanvasStore.getState().versions.at(-1)?.canvas.segments[0]?.status).toBe("hypothesis");
  expect(screen.getByText(/Saved as untested/)).toBeInTheDocument();
});

it("Not now leaves the canvas and cards untouched", async () => {
  render(<ChatPane />);
  const input = screen.getByPlaceholderText(/Answer the coach/);
  fireEvent.change(input, { target: { value: "I don't know" } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);
  fireEvent.click(await screen.findByRole("button", { name: "Not now" }));
  expect(useCanvasStore.getState().cards).toHaveLength(0);
  expect(useCanvasStore.getState().versions.at(-1)?.canvas.segments).toEqual([]);
  expect(input).toBeEnabled();
});