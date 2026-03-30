import type { SupabaseClient } from "@supabase/supabase-js";

/** user_id efetivo (RLS): dono da conta em exibição ou o próprio auth.uid(). */
export async function getEffectiveUserId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc("get_effective_user_id");
  if (error) return user.id;
  return typeof data === "string" ? data : user.id;
}
