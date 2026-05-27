import type { SupabaseClient } from "@supabase/supabase-js";
import { getEffectiveUserId } from "@/lib/supabase/effective-user";
import {
  fetchStaffCollaboratorRows,
  isStaffProfileComplete,
} from "@/lib/auth/staff-dashboard-access";

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

  const effectiveUserId = (await getEffectiveUserId(supabase)) ?? user.id;
  if (effectiveUserId !== user.id) {
    return fallback;
  }

  const { data: ownedBiz } = await supabase
    .from("businesses")
    .select("id")
    .eq("profile_id", effectiveUserId)
    .limit(1)
    .maybeSingle();

  if (ownedBiz?.id) return "/dashboard";

  const staffRows = await fetchStaffCollaboratorRows(supabase, user.id);
  if (staffRows.length > 0) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    if (!isStaffProfileComplete(profile)) {
      return "/setup";
    }
    if (fallback.startsWith("/dashboard")) {
      return fallback;
    }
    return "/dashboard/minhas-comissoes";
  }

  return "/setup";
}
