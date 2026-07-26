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
    try {
      const u = new URL(request.url);
      if (u.host) return u.origin;
    } catch {
      /* ignore */
    }
  }
  return getSiteUrl();
}

export function buildPublicSlugUrl(siteBase: string, slug: string | null | undefined): string | null {
  const s = slug?.trim();
  if (!s) return null;
  return `${siteBase.replace(/\/$/, "")}/${encodeURIComponent(s)}`;
}

function stripWww(host: string): string {
  return host.replace(/^www\./i, "");
}

/**
 * Redireciona apex ↔ www para `NEXT_PUBLIC_SITE_URL`, evitando perder cookies PKCE
 * quando o login começa num host e o callback cai noutro.
 */
export function canonicalHostRedirectUrl(requestUrl: string, hostHeader: string | null): string | null {
  const canonical = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!canonical?.startsWith("http")) return null;

  const canonicalUrl = new URL(canonical);
  const requestHost = hostHeader?.split(",")[0]?.trim().split(":")[0];
  if (!requestHost || requestHost === "localhost" || requestHost.startsWith("127.0.0.1")) {
    return null;
  }

  const canonicalHost = canonicalUrl.hostname;
  if (requestHost === canonicalHost) return null;
  if (stripWww(requestHost) !== stripWww(canonicalHost)) return null;

  const url = new URL(requestUrl);
  url.protocol = canonicalUrl.protocol;
  url.host = canonicalUrl.host;
  return url.toString();
}
