import { z } from "zod";
import { normalizeUsername } from "./accounts";

export const newAccountInput = z.object({
  username: z.string().transform(normalizeUsername).refine((name) => name !== "admin", "The administrator username is reserved."),
  password: z.string().min(12, "Use at least 12 characters.").max(128, "Use at most 128 characters."),
});

export function requireAdminPermission(allowed: boolean | null, failed = false) {
  if (failed || allowed !== true) throw new Error("Administrator access required.");
}

export function allowAccountRemoval(actor: string, target: string, targetIsAdmin: boolean) {
  if (actor === target || targetIsAdmin) throw new Error("Administrator accounts cannot be removed here.");
}