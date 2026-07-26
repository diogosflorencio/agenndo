"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

let _client: SupabaseClient | null = null;

/**
 * In-memory lock por nome com timeout de segurança.
 * Substitui `navigator.locks` que trava 10s quando uma aba anterior
 * fechou sem liberar o Web Lock do auth token.
 */
const _locks: Record<string, Promise<void>> = {};
async function inMemoryLock<R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  const previous = _locks[name] ?? Promise.resolve();

  let release!: () => void;
  _locks[name] = previous.then(
    () => new Promise<void>((resolve) => { release = resolve; })
  );

  const maxWaitMs = acquireTimeout > 0 ? acquireTimeout : 4000;

  try {
    await Promise.race([
      previous,
      new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs)),
    ]);
  } catch {
    /* timeout de acquireTimeout explícito */
  }

  try {
    return await fn();
  } finally {
    release?.();
  }
}

/** SECURITY: browser usa anon key + sessão Supabase; RLS no Postgres. Sessão em cookies (persiste ao fechar o navegador). */
function ensureAuthStore(client: SupabaseClient) {
  if (typeof window === "undefined") return;
  const { initBrowserAuthStore } = require("@/lib/auth/browser-auth-store") as typeof import("@/lib/auth/browser-auth-store");
  initBrowserAuthStore(client);
}

export function createClient() {
  if (_client) {
    ensureAuthStore(_client);
    return _client;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: any = {
    cookieOptions: getSupabaseCookieOptions(
      typeof window !== "undefined" ? window.location.protocol === "https:" : true
    ),
    auth: { lock: inMemoryLock },
  };
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    opts,
  );
  ensureAuthStore(_client);
  return _client;
}
