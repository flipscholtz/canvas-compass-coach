import { describe, expect, it } from "vitest";
import { accountEmail, accountStorageKey, canAccessScenario, normalizeUsername } from "./accounts";
import { useCanvasStore } from "./store";

describe("account rules", () => {
  it("uses the same username credential after case and whitespace normalization", () => {
    expect(accountEmail("  Flippie  ")).toBe("flippie@accounts.canvasstack.local");
    expect(normalizeUsername("flippie")).toBe("flippie");
    expect(() => accountEmail("someone@example.com")).toThrow();
  });
  it("private scenarios belong only to their account", () => {
    expect(canAccessScenario("account-a", "account-a")).toBe(true);
    expect(canAccessScenario("account-a", "account-b")).toBe(false);
  });
  it("every account can access shared demos", () => {
    expect(canAccessScenario(null, "account-a", true)).toBe(true);
    expect(canAccessScenario(null, "account-b", true)).toBe(true);
  });
  it("browser draft keys differ between accounts", () => {
    expect(accountStorageKey("a")).toBe("canvasstack-account-a");
    expect(accountStorageKey("a")).not.toBe(accountStorageKey("b"));
  });
  it("clearing an account removes private canvas, chat, cards, scenarios and API key", () => {
    const s = useCanvasStore.getState();
    s.newScenario("Private restaurant business");
    s.addItems([{ block: "segments", text: "Private owners" }]);
    s.pushMessage({ role: "user", text: "Private chat" });
    s.setSettings("private-key", "gpt-4o");
    s.saveScenario("Private restaurant business");
    s.clearWorkspace();
    const clean = useCanvasStore.getState();
    expect(clean.versions[0]?.canvas.segments).toEqual([]);
    expect(clean.messages.some((m) => m.text === "Private chat")).toBe(false);
    expect(clean.scenarios).toEqual([]);
    expect(clean.cards).toEqual([]);
    expect(clean.apiKey).toBe("");
    expect(clean.scenarioId).toBe(null);
  });
});