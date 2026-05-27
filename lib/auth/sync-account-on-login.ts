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

  await supabase.from("user_accounts").upsert(
    {
      user_id: userId,
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
      role: "provider",
    },
    { onConflict: "id" }
  );

  // Dono + funcionário + cliente: memberships e negócio próprio definem account_kind.
  await supabase.rpc("recompute_user_primary_kind", { p_user_id: userId });
}
