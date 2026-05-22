import { getSiteUrl } from "@/lib/site-url";

/** Origens que podem chamar o site/API via browser (CORS). SECURITY: não usar `*`. */
export function getAllowedOrigins(): string[] {
  const origins = new Set<string>([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  const site = getSiteUrl();
  if (site.startsWith("http")) origins.add(site.replace(/\/$/, ""));

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) origins.add(`https://${vercel.replace(/\/$/, "")}`);

  const extra = process.env.CORS_ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  for (const o of extra) {
    if (o.startsWith("http")) origins.add(o.replace(/\/$/, ""));
  }

  return Array.from(origins);
}

export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, "");
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
