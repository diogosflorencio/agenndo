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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return;
  }

  const channel: SignupChannel = signupChannelFromLoginContext(options.loginContext);

  const { error: touchErr } = await supabase.rpc("touch_user_account_on_login", {
    p_channel: channel,
  });
  if (touchErr) {
    console.error("[syncAccountOnLogin] touch_user_account_on_login:", touchErr.message);
  }

  // Só metadados OAuth; account_kind/primary_kind vêm de recompute (SQL, SECURITY DEFINER).
  await supabase.from("profiles").upsert(
    {
      id: userId,
      email: options.email ?? undefined,
      full_name: options.fullName ?? undefined,
      avatar_url: options.avatarUrl ?? undefined,
    },
    { onConflict: "id" }
  );
}
