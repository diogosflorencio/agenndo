import type { SupabaseClient } from "@supabase/supabase-js";
import { signupChannelFromLoginContext, type SignupChannel } from "@/lib/account-types";

/**
 * SECURITY: após OAuth, alinha user_accounts e perfil com o canal de entrada (dono / staff / cliente).
 */
export async function syncAccountOnLogin(
  supabase: SupabaseClient,
  userId: string,
  options: {
    email?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
    loginContext?: "cliente" | "staff" | "owner" | null;
  }
): Promise<void> {
  const channel: SignupChannel = signupChannelFromLoginContext(options.loginContext);
  const kind =
    channel === "client"
      ? "client"
      : channel === "staff"
        ? "business_staff"
        : channel === "admin"
          ? "platform_admin"
          : "business_owner";

  const role = kind === "platform_admin" ? "admin" : "provider";

  await supabase.from("user_accounts").upsert(
    {
      user_id: userId,
      primary_kind: kind,
      signup_channel: channel,
      last_login_channel: channel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  await supabase.from("profiles").upsert(
    {
      id: userId,
      email: options.email ?? undefined,
      full_name: options.fullName ?? undefined,
      avatar_url: options.avatarUrl ?? undefined,
      role,
      account_kind: kind,
    },
    { onConflict: "id" }
  );

  await supabase.rpc("recompute_user_primary_kind", { p_user_id: userId });
}
