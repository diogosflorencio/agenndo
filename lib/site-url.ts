/**
 * URL pública do site (SEO, OG, sitemap, JSON-LD).
 * Defina `NEXT_PUBLIC_SITE_URL` em produção (ex.: https://www.agenndo.com.br) e mantenha um único domínio canônico (com ou sem www).
 * Opcional: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` e `NEXT_PUBLIC_BING_SITE_VERIFICATION` para Search Console / Bing Webmaster.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit?.startsWith("http")) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}
