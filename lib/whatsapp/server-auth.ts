import type { SupabaseClient } from "@supabase/supabase-js";
import { getEffectiveUserId } from "@/lib/supabase/effective-user";

export async function resolveDashboardBusinessId(supabase: SupabaseClient) {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { businessId: null as string | null, error: "Nao autenticado", status: 401 as const };
  }
  const effectiveId = await getEffectiveUserId(supabase);
  if (!effectiveId) {
    return { businessId: null, error: "Sessao invalida", status: 401 as const };
  }
  const { data: biz, error } = await supabase.from("businesses").select("id").eq("profile_id", effectiveId).maybeSingle();
  if (error || !biz?.id) {
    return { businessId: null, error: "Negocio nao encontrado", status: 404 as const };
  }
  return { businessId: biz.id as string, error: null, status: null };
}

export function verifyGatewayApiKey(request: Request): boolean {
  const expected = (process.env.WHATSAPP_GATEWAY_API_KEY ?? "").trim();
  if (!expected) return false;
  const auth = request.headers.get("authorization") ?? "";
  if (auth === `Bearer ${expected}`) return true;
  const header = request.headers.get("x-whatsapp-gateway-key") ?? "";
  return header === expected;
}
