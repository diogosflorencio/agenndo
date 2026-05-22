import type { SupabaseClient } from "@supabase/supabase-js";

/** Verifica se a sessão atual é operador interno (RLS: platform_operators). */
export async function isPlatformOperator(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_platform_operator");
  if (error) {
    console.warn("[platform-operator] is_platform_operator:", error.message);
    return false;
  }
  return data === true;
}
