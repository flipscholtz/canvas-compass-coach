import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { accountEmail } from "./accounts";
import { allowAccountRemoval, newAccountInput, requireAdminPermission } from "./admin-rules";

// The owner supplies this password through the encrypted secret form. Callers
// cannot choose the account, password or role, and no credential is returned.
export const prepareAdminAccount = createServerFn({ method: "POST" }).handler(async () => {
  const password = process.env["CANVASSTACK_ADMIN_PASSWORD"];
  if (!password || password.length < 12 || password.length > 128) return { ready: false };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing, error: lookupError } = await supabaseAdmin.from("profiles").select("id").eq("username", "admin").maybeSingle();
  if (lookupError) return { ready: false };
  if (existing) {
    const { data, error } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", existing.id).eq("role", "admin").maybeSingle();
    return { ready: !error && !!data };
  }
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email: accountEmail("admin"), password, email_confirm: true });
  if (error || !data.user) return { ready: false };
  const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: data.user.id, role: "admin" });
  if (roleError) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return { ready: false };
  }
  return { ready: true };
});

export const getAdminAccess = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  return { allowed: !error && data === true };
});

export const listAccounts = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: allowed, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  requireAdminPermission(allowed, !!roleError);
  const { data, error } = await context.supabase.from("profiles").select("id,username,created_at").order("username");
  if (error) throw new Error("Couldn't load accounts. Please try again.");
  return data;
});

export const createAccount = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => newAccountInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    requireAdminPermission(allowed, !!error);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: failure } = await supabaseAdmin.auth.admin.createUser({ email: accountEmail(data.username), password: data.password, email_confirm: true });
    if (failure) throw new Error("Couldn't create this account. The username may already exist, or the password may be unsafe.");
    return { username: data.username };
  });

export const removeAccount = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    requireAdminPermission(allowed, !!error);
    const { data: targetIsAdmin, error: targetError } = await context.supabase.rpc("has_role", { _user_id: data.id, _role: "admin" });
    if (targetError) throw new Error("Couldn't verify this account. Nothing was removed.");
    allowAccountRemoval(context.userId, data.id, targetIsAdmin === true);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: failure } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (failure) throw new Error("Couldn't remove this account. Please try again.");
    return { removed: true };
  });