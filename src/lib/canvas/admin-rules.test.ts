import { describe, expect, it } from "vitest";
import { allowAccountRemoval, newAccountInput, requireAdminPermission } from "./admin-rules";

describe("account administration permissions", () => {
  it("requires verified server-side admin permission", () => {
    expect(() => requireAdminPermission(false)).toThrow();
    expect(() => requireAdminPermission(null)).toThrow();
    expect(() => requireAdminPermission(true, true)).toThrow();
    expect(() => requireAdminPermission(true)).not.toThrow();
  });
  it("protects administrators from removal", () => {
    expect(() => allowAccountRemoval("actor", "actor", false)).toThrow();
    expect(() => allowAccountRemoval("actor", "another", true)).toThrow();
    expect(() => allowAccountRemoval("actor", "another", false)).not.toThrow();
  });
  it("reserves the admin username regardless of case", () => {
    expect(newAccountInput.safeParse({ username: " ADMIN ", password: "a-private-example-pass" }).success).toBe(false);
    expect(newAccountInput.parse({ username: " Assessment ", password: "a-private-example-pass" }).username).toBe("assessment");
  });
  it("requires a password of 12 to 128 characters", () => {
    expect(newAccountInput.safeParse({ username: "assessment", password: "x".repeat(11) }).success).toBe(false);
    expect(newAccountInput.safeParse({ username: "assessment", password: "x".repeat(12) }).success).toBe(true);
    expect(newAccountInput.safeParse({ username: "assessment", password: "x".repeat(129) }).success).toBe(false);
  });
});