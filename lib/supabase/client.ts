"use client";

import { createBrowserClient } from "@supabase/ssr";

/** SECURITY: browser usa anon key + sessão Supabase; RLS no Postgres. Catálogo público: /api/public/*. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
