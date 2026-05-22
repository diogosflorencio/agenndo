import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlatformOperator } from "@/lib/platform-operator";

/** SECURITY: APIs em /api/operacoes/* exigem operador de plataforma. */
export async function requirePlatformOperator(supabase: SupabaseClient): Promise<boolean> {
  return isPlatformOperator(supabase);
}
