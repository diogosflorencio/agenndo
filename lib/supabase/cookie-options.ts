import type { CookieOptionsWithName } from "@supabase/ssr";

/** Opções de cookie alinhadas entre browser, middleware e route handlers. */
export function getSupabaseCookieOptions(secure?: boolean): CookieOptionsWithName {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: secure ?? process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 400,
  };
}
