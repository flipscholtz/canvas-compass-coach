import { supabase } from "@/integrations/supabase/client";

export function shouldShowTour(completed: boolean | null | undefined) {
  return completed !== true;
}

export async function readTourCompletion() {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Please sign in again to load your tour preference.");
  const { data, error } = await supabase.from("account_preferences").select("tour_completed").eq("user_id", auth.user.id).maybeSingle();
  if (error) throw new Error("Couldn't load your tour preference.");
  return data?.tour_completed ?? false;
}

export async function completeAccountTour() {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Please sign in again to save tour completion.");
  const { error: insertError } = await supabase.from("account_preferences").upsert({ user_id: auth.user.id, tour_completed: true }, { onConflict: "user_id", ignoreDuplicates: true });
  if (insertError) throw new Error("Couldn't save tour completion. Please try again.");
  const { data, error } = await supabase.from("account_preferences").update({ tour_completed: true }).eq("user_id", auth.user.id).select("tour_completed").single();
  if (error || !data?.tour_completed) throw new Error("Couldn't save tour completion. Please try again.");
}