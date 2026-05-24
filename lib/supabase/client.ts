"use client";

import { createBrowserClient } from "@supabase/ssr";

/** SECURITY: browser usa anon key + sessão Supabase; RLS no Postgres. Sessão em cookies (persiste ao fechar o navegador). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: typeof window !== "undefined" ? window.location.protocol === "https:" : true,
        maxAge: 60 * 60 * 24 * 400,
      },
    }
  );
}
