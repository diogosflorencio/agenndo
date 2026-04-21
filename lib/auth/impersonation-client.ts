"use client";

import { createClient } from "@/lib/supabase/client";

const LS_KEY = "impersonateUserId";

export function getStoredImpersonateToken(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(LS_KEY)?.trim();
  return v && /^[0-9a-f]{32}$/i.test(v) ? v.toLowerCase() : null;
}

export function setStoredImpersonateToken(token: string) {
  const t = token.trim().toLowerCase();
  if (/^[0-9a-f]{32}$/.test(t)) localStorage.setItem(LS_KEY, t);
}

export function clearStoredImpersonateToken() {
  if (typeof window !== "undefined") localStorage.removeItem(LS_KEY);
}

type StartResult = { ok?: boolean; error?: string };

export async function startImpersonation(token: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("start_impersonation", {
    p_token_hash: token.trim().toLowerCase(),
  });
  if (error) throw new Error(error.message);
  const row = data as StartResult;
  if (row && row.ok === false) {
    const code = row.error;
    throw new Error(
      code === "token_invalid"
        ? "Token inválido ou revogado."
        : code === "cannot_impersonate_self"
          ? "Você não pode usar um token da própria conta."
          : "Não foi possível acessar a conta."
    );
  }
  setStoredImpersonateToken(token.trim().toLowerCase());
  window.location.assign("/dashboard");
}

/**
 * Remove a sessão de impersonação no Supabase e o token em localStorage.
 * Não navega — usar antes de signOut para não voltar “preso” na outra conta ao logar de novo.
 */
export async function clearImpersonationSession(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const res = await fetch("/api/impersonation/stop", {
    method: "POST",
    credentials: "include",
  });

  if (res.ok) {
    clearStoredImpersonateToken();
    return;
  }

  await supabase.rpc("stop_impersonation");
  const { error: delError } = await supabase.from("session_impersonation").delete().eq("real_uid", user.id);
  if (delError) {
    const raw = await res.text();
    let apiMsg: string | undefined;
    try {
      apiMsg = (JSON.parse(raw) as { error?: string }).error;
    } catch {
      /* ignore */
    }
    throw new Error(apiMsg ?? delError.message);
  }

  const { data: row } = await supabase
    .from("session_impersonation")
    .select("real_uid")
    .eq("real_uid", user.id)
    .maybeSingle();
  if (row) {
    throw new Error("Não foi possível encerrar o acesso compartilhado. Tente de novo.");
  }
  clearStoredImpersonateToken();
}

export async function stopImpersonation() {
  await clearImpersonationSession();
  window.location.replace("/dashboard");
}

/** Devolve o token atual ou cria um (contas antigas / edge cases). Não invalida o token existente. */
export async function ensureImpersonateToken(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("ensure_impersonate_token");
  if (error) throw new Error(error.message);
  if (typeof data !== "string" || !/^[0-9a-f]{32}$/.test(data)) {
    throw new Error("Resposta inválida ao carregar o token.");
  }
  return data;
}

export async function regenerateImpersonateToken(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("regenerate_impersonate_token");
  if (error) throw new Error(error.message);
  if (typeof data !== "string" || !/^[0-9a-f]{32}$/.test(data)) {
    throw new Error("Resposta inválida ao gerar token.");
  }
  return data;
}
