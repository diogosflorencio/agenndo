import type { SupabaseClient } from "@supabase/supabase-js";
import { getEffectiveUserId } from "@/lib/supabase/effective-user";

/** Destino após login de prestador (landing /login). */
export async function resolveProviderLoginDestination(
  supabase: SupabaseClient,
  fallback = "/dashboard"
): Promise<string> {
  const { data: isOp } = await supabase.rpc("is_platform_operator");
  if (isOp === true) return "/operacoes";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fallback;

  const profileId = (await getEffectiveUserId(supabase)) ?? user.id;

  const { data: ownedBiz } = await supabase
    .from("businesses")
    .select("id")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle();

  if (ownedBiz?.id) return "/dashboard";

  const { data: staffRows } = await supabase
    .from("collaborators")
    .select("id")
    .eq("auth_user_id", user.id)
    .limit(1);

  if ((staffRows?.length ?? 0) > 0) return "/dashboard/minhas-comissoes";

  return "/setup";
}
