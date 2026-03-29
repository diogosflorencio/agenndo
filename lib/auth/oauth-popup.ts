/** postMessage entre popup (`oauth-bridge`) e a janela principal */
export const OAUTH_POPUP_MESSAGE = "agenndo-oauth";

export function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

/**
 * Em localhost: login via popup que abre `/auth/oauth-start` (o PKCE fica no sessionStorage do popup).
 * Fora disso: redirect na mesma aba para `/auth/callback`.
 */
export function isLocalhostOAuthPopup(): boolean {
  return isLocalhost();
}

/**
 * Origem usada no `redirectTo` do `signInWithOAuth` (deve bater com Redirect URLs no Supabase).
 *
 * Ordem:
 * 1. `NEXT_PUBLIC_SUPABASE_OAUTH_ORIGIN` — força ex.: `http://localhost:3000` (recomendado em dev).
 * 2. `NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN` — só em localhost/127.0.0.1.
 * 3. `window.location.origin`.
 */
export function getOAuthRedirectOrigin(): string {
  const forced = process.env.NEXT_PUBLIC_SUPABASE_OAUTH_ORIGIN?.trim().replace(/\/$/, "");
  if (forced?.startsWith("http")) return forced;

  const legacy = process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN?.trim().replace(/\/$/, "");
  if (legacy?.startsWith("http") && typeof window !== "undefined" && isLocalhost()) {
    return legacy;
  }

  if (typeof window !== "undefined") return window.location.origin;
  return legacy || forced || "";
}

/**
 * URL absoluta para `signInWithOAuth({ options: { redirectTo } })`.
 * Ex.: `http://localhost:3000/auth/callback?next=%2Fdashboard`
 */
export function buildSupabaseOAuthRedirectUrl(
  path: "/auth/callback" | "/auth/oauth-bridge",
  searchParams: Record<string, string | undefined>
): string {
  let base = getOAuthRedirectOrigin();
  if (typeof window !== "undefined" && !base) base = window.location.origin;
  const normalized = (base || "http://localhost:3000").replace(/\/$/, "");
  const u = new URL(path, `${normalized}/`);
  for (const [k, v] of Object.entries(searchParams)) {
    if (v != null && v !== "") u.searchParams.set(k, v);
  }
  return u.toString();
}

export function buildOAuthBridgeUrl(
  origin: string,
  opts: { next: string; context?: "cliente" }
): string {
  const u = new URL(`${origin.replace(/\/$/, "")}/auth/oauth-bridge`);
  const next = opts.next.startsWith("/") ? opts.next : `/${opts.next}`;
  u.searchParams.set("next", next);
  if (opts.context) u.searchParams.set("context", opts.context);
  return u.toString();
}

/** URL aberta no popup; a página chama signInWithOAuth dentro do popup (PKCE válido). */
export function buildOAuthStartUrl(
  origin: string,
  opts: { next: string; context?: "cliente" }
): string {
  const u = new URL(`${origin.replace(/\/$/, "")}/auth/oauth-start`);
  const next = opts.next.startsWith("/") ? opts.next : `/${opts.next}`;
  u.searchParams.set("next", next);
  if (opts.context) u.searchParams.set("context", opts.context);
  return u.toString();
}

/** @deprecated use isLocalhostOAuthPopup */
export function isClientOAuthBridge(): boolean {
  return isLocalhost();
}
