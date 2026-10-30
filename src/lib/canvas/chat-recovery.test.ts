import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCoachResponse, withCoachDeadline } from "./chat-recovery";
import { coachTurn } from "./coach";
import { emptyCanvas } from "./types";

afterEach(() => vi.useRealTimers());
const valid = { reply: "Which area are your homeowners in?", stage: 1, additions: [], assumptions: [], flags: [] };

describe("coach response boundary", () => {
  it("accepts a helpful reply without canvas additions", () => {
    expect(parseCoachResponse(JSON.stringify(valid))).toEqual(valid);
  });
  it.each(["", "not json", JSON.stringify({ ...valid, reply: "  " }), JSON.stringify({ ...valid, stage: 9 }), JSON.stringify({ ...valid, additions: [{ block: "unknown", text: "x" }] })])("rejects invalid output and logs its raw response: %s", (raw) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => parseCoachResponse(raw)).toThrow();
    expect(log).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ rawResponse: raw, error: expect.anything() }));
    log.mockRestore();
  });
  it("ends a stalled turn at exactly 30 seconds and aborts transport", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const run = withCoachDeadline((s) => { signal = s; return new Promise(() => {}); });
    const rejection = expect(run).rejects.toThrow("30 seconds");
    await vi.advanceTimersByTimeAsync(29_999);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(signal?.aborted).toBe(true);
  });
  it("propagates AI failures", async () => {
    await expect(withCoachDeadline(async () => { throw new Error("AI unavailable"); })).rejects.toThrow("AI unavailable");
  });
});

describe("free-text help is not a canvas answer", () => {
  it.each(["Can you help me find some data?", "what do you mean?", "help", "ok"])("replies to %s without advancing or inventing facts", (text) => {
    for (const step of [0, 1, 2, 11]) {
      const result = coachTurn(emptyCanvas(), step, text);
      expect(result.reply.trim().length).toBeGreaterThan(20);
      expect(result.additions).toEqual([]);
      expect(result.assumptions).toEqual([]);
      expect(result.nextStep).toBe(step);
    }
  });
});