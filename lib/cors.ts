import { getSiteUrl } from "@/lib/site-url";

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

/** Inclui `www` e sem `www` para o mesmo host (evita 403 quando env ≠ URL do browser). */
function addOriginWithWwwVariants(origins: Set<string>, raw: string) {
  const base = normalizeOrigin(raw);
  if (!base.startsWith("http")) return;
  origins.add(base);
  try {
    const u = new URL(base);
    const host = u.hostname;
    if (host.startsWith("www.")) {
      origins.add(`${u.protocol}//${host.slice(4)}`);
    } else if (!host.includes("localhost") && !host.startsWith("127.0.0.1")) {
      origins.add(`${u.protocol}//www.${host}`);
    }
  } catch {
    /* ignore */
  }
}

/** Requisição do próprio site (ex.: dashboard → /api/dashboard/*). CORS não se aplica. */
export function isSameSiteAsRequest(requestUrl: string, origin: string | null | undefined): boolean {
  if (!origin) return false;
  try {
    const req = new URL(requestUrl);
    const o = new URL(normalizeOrigin(origin));
    return req.protocol === o.protocol && req.hostname === o.hostname && req.port === o.port;
  } catch {
    return false;
  }
}

/** Origens que podem chamar o site/API via browser (CORS). SECURITY: não usar `*`. */
export function getAllowedOrigins(): string[] {
  const origins = new Set<string>();
  addOriginWithWwwVariants(origins, "http://localhost:3000");
  addOriginWithWwwVariants(origins, "http://127.0.0.1:3000");

  const site = getSiteUrl();
  if (site.startsWith("http")) addOriginWithWwwVariants(origins, site);

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) addOriginWithWwwVariants(origins, `https://${vercel.replace(/\/$/, "")}`);

  const extra = process.env.CORS_ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  for (const o of extra) {
    if (o.startsWith("http")) addOriginWithWwwVariants(origins, o);
  }

  return Array.from(origins);
}

export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  return getAllowedOrigins().some((a) => a === normalized);
}

export function corsHeadersForAllowedOrigin(origin: string | null): HeadersInit | null {
  if (!origin || !isOriginAllowed(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}
