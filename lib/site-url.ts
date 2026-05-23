/**
 * URL pública do site (SEO, OG, sitemap, links de negócio).
 * Em produção defina `NEXT_PUBLIC_SITE_URL` (ex.: https://www.agenndo.com.br).
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit?.startsWith("http")) return explicit.replace(/\/$/, "");

  // Produção na Vercel: domínio do projeto, não *.vercel.app do deploy
  if (process.env.VERCEL_ENV === "production") {
    const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (prod) return `https://${prod.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

/** Origem da requisição HTTP (domínio que o utilizador está a usar). */
export function resolveRequestSiteUrl(input: Request | Headers): string | null {
  const headers = input instanceof Request ? input.headers : input;
  const host = (headers.get("x-forwarded-host") ?? headers.get("host"))?.split(",")[0]?.trim();
  if (!host) return null;
  if (host === "localhost" || host.startsWith("127.0.0.1")) return null;
  const proto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  return `${proto}://${host}`;
}

/** Preferência para APIs/painéis: URL atual do browser → cabeçalhos → env canónico. */
export function resolveOperacoesSiteBase(request?: Request | null): string {
  if (request) {
    const fromRequest = resolveRequestSiteUrl(request);
    if (fromRequest) return fromRequest;
  }
  return getSiteUrl();
}

export function buildPublicSlugUrl(siteBase: string, slug: string | null | undefined): string | null {
  const s = slug?.trim();
  if (!s) return null;
  return `${siteBase.replace(/\/$/, "")}/${encodeURIComponent(s)}`;
}
