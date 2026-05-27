import { getMercadoPagoConfig } from "@/lib/mercadopago/config";

export function getMercadoPagoSiteOrigin(): string {
  const cfg = getMercadoPagoConfig();
  return cfg?.siteOrigin ?? process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export function mercadoPagoOAuthReturnPath(returnTo?: string): string {
  const base = returnTo?.trim() || "/dashboard/pagamentos";
  if (!base.startsWith("/")) return "/dashboard/pagamentos?mp_connected=1";
  const u = new URL(base, "http://local");
  if (!u.searchParams.has("mp_connected") && !u.searchParams.has("mp_error")) {
    u.searchParams.set("mp_connected", "1");
  }
  return `${u.pathname}${u.search}`;
}

export function mercadoPagoOAuthErrorPath(code: string, returnTo?: string): string {
  const base = returnTo?.trim() || "/dashboard/pagamentos";
  const u = new URL(base.startsWith("/") ? base : "/dashboard/pagamentos", "http://local");
  u.searchParams.set("mp_error", code);
  u.searchParams.delete("mp_connected");
  return `${u.pathname}${u.search}`;
}

export function absoluteMercadoPagoRedirect(path: string): string {
  const origin = getMercadoPagoSiteOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
