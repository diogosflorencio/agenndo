/** postMessage entre popup (`oauth-bridge`) e a janela principal */
export const OAUTH_POPUP_MESSAGE = "agenndo-oauth";

/** Estado do redirect pós-OAuth (next/context). O Supabase pode não preservar query params no retorno. */
const OAUTH_BRIDGE_STATE_KEY = "agenndo-oauth-bridge";

export type OAuthLoginContext = "cliente" | "staff";

export function writeOAuthBridgeRedirectState(state: { next: string; context?: OAuthLoginContext }): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(OAUTH_BRIDGE_STATE_KEY, JSON.stringify(state));
  } catch {
    /* modo anônimo / storage cheio */
  }
}

/** Lê e remove o estado (uma vez por fluxo). */
export function consumeOAuthBridgeRedirectState(): {
  next: string;
  context?: OAuthLoginContext;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(OAUTH_BRIDGE_STATE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(OAUTH_BRIDGE_STATE_KEY);
    const parsed = JSON.parse(raw) as { next?: unknown; context?: unknown };
    const next =
      typeof parsed.next === "string" && parsed.next.startsWith("/") && !parsed.next.startsWith("//")
        ? parsed.next
        : "/dashboard";
    const context =
      parsed.context === "cliente" || parsed.context === "staff" ? (parsed.context as OAuthLoginContext) : undefined;
    return context ? { next, context } : { next };
  } catch {
    return null;
  }
}

export function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

/**
 * Em localhost: login via popup que abre `/auth/oauth-start` (o PKCE fica no storage do cliente Supabase no popup).
 * Fora disso: redirect na mesma aba para `/auth/callback`.
 */
export function isLocalhostOAuthPopup(): boolean {
  return isLocalhost();
}

/**
 * Origem usada no `redirectTo` do `signInWithOAuth` (deve bater com Redirect URLs no Supabase).
 *
 * No browser: **sempre** `window.location.origin`, para o PKCE ficar nos cookies do mesmo host
 * (ex.: www vs apex). Usar env forçado aqui quebra o exchange no `/auth/callback`.
 *
 * Fora do browser (SSR/build): `NEXT_PUBLIC_SUPABASE_OAUTH_ORIGIN`, legado ou `NEXT_PUBLIC_SITE_URL`.
 */
export function getOAuthRedirectOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const forced = process.env.NEXT_PUBLIC_SUPABASE_OAUTH_ORIGIN?.trim().replace(/\/$/, "");
  if (forced?.startsWith("http")) return forced;

  const legacy = process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN?.trim().replace(/\/$/, "");
  if (legacy?.startsWith("http")) return legacy;

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return site?.startsWith("http") ? site : "";
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
  opts: { next: string; context?: OAuthLoginContext }
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
  opts: { next: string; context?: OAuthLoginContext }
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
