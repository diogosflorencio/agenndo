import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";

export type BusinessMpRow = {
  id: string;
  profile_id: string;
  mp_user_id: string | null;
  mp_access_token_enc: string | null;
  mp_refresh_token_enc: string | null;
  mp_connected_at: string | null;
  mp_token_hint: string | null;
  payment_policy: string;
  deposit_mode: string;
  deposit_percent: number | null;
  deposit_fixed_cents: number | null;
  payment_client_message: string | null;
  mp_checkout_enabled: boolean;
};

export function isBusinessMpConnected(row: Pick<BusinessMpRow, "mp_access_token_enc" | "mp_user_id">): boolean {
  return Boolean(row.mp_access_token_enc && row.mp_user_id);
}

export async function getBusinessMpAccessToken(
  admin: SupabaseClient,
  businessId: string
): Promise<{ accessToken: string; mpUserId: string; business: BusinessMpRow } | null> {
  const { data } = await admin
    .from("businesses")
    .select(
      "id, profile_id, mp_user_id, mp_access_token_enc, mp_refresh_token_enc, mp_connected_at, mp_token_hint, payment_policy, deposit_mode, deposit_percent, deposit_fixed_cents, payment_client_message, mp_checkout_enabled"
    )
    .eq("id", businessId)
    .maybeSingle();

  if (!data?.mp_access_token_enc || !data.mp_user_id) return null;
  try {
    const accessToken = decryptSecret(data.mp_access_token_enc);
    return { accessToken, mpUserId: data.mp_user_id, business: data as BusinessMpRow };
  } catch {
    return null;
  }
}

export async function saveBusinessMpTokens(
  admin: SupabaseClient,
  businessId: string,
  tokens: {
    mpUserId: string;
    accessToken: string;
    refreshToken?: string;
    expiresInSec?: number;
  }
): Promise<void> {
  const hint = tokens.accessToken.slice(-6);
  const expiresAt =
    tokens.expiresInSec != null
      ? new Date(Date.now() + tokens.expiresInSec * 1000).toISOString()
      : null;

  const { error } = await admin
    .from("businesses")
    .update({
      mp_user_id: String(tokens.mpUserId),
      mp_access_token_enc: encryptSecret(tokens.accessToken),
      mp_refresh_token_enc: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
      mp_token_expires_at: expiresAt,
      mp_connected_at: new Date().toISOString(),
      mp_token_hint: hint,
    })
    .eq("id", businessId);

  if (error) throw new Error(error.message);
}

export async function clearBusinessMpTokens(admin: SupabaseClient, businessId: string): Promise<void> {
  const { error } = await admin
    .from("businesses")
    .update({
      mp_user_id: null,
      mp_access_token_enc: null,
      mp_refresh_token_enc: null,
      mp_token_expires_at: null,
      mp_connected_at: null,
      mp_token_hint: null,
      mp_checkout_enabled: false,
      payment_policy: "off",
    })
    .eq("id", businessId);
  if (error) throw new Error(error.message);
}
