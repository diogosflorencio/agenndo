import type { SupabaseClient } from "@supabase/supabase-js";
import { syncAccountOnLogin } from "@/lib/auth/sync-account-on-login";
import { resolveProviderLoginDestination } from "@/lib/auth/resolve-login-destination";
import type { OAuthLoginContext } from "@/lib/auth/oauth-popup";

export type FinishOAuthParams = {
  supabase: SupabaseClient;
  code: string;
  nextPath: string;
  loginContext: OAuthLoginContext | null;
};

export type FinishOAuthResult = { ok: true; path: string } | { ok: false; error: string };

function normalizeNextPath(nextPath: string): string {
  return nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
}

function resolveLoginContext(
  loginContext: OAuthLoginContext | null,
  nextPath: string
): OAuthLoginContext | null {
  if (loginContext) return loginContext;
  if (nextPath.startsWith("/conta")) return "cliente";
  if (nextPath.includes("minhas-comissoes")) return "staff";
  return null;
}

/** Troca o code OAuth por sessão, sincroniza conta e resolve destino pós-login. */
export async function finishOAuthSession(params: FinishOAuthParams): Promise<FinishOAuthResult> {
  const { supabase, code, nextPath } = params;
  const normalizedNext = normalizeNextPath(nextPath);
  const resolvedContext = resolveLoginContext(params.loginContext, normalizedNext);

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return { ok: false, error: exchangeError.message };
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "no_user_after_exchange" };
  }

  await syncAccountOnLogin(supabase, user.id, {
    email: user.email,
    fullName: (user.user_metadata?.full_name ?? user.user_metadata?.name) as string | undefined,
    avatarUrl: (user.user_metadata?.avatar_url ?? user.user_metadata?.picture) as string | undefined,
    loginContext: resolvedContext,
  });

  const { data: isOp } = await supabase.rpc("is_platform_operator");
  if (isOp === true) {
    return { ok: true, path: "/operacoes" };
  }

  if (resolvedContext === "cliente") {
    return { ok: true, path: normalizedNext };
  }

  const dest = await resolveProviderLoginDestination(supabase, normalizedNext);
  return { ok: true, path: dest };
}
