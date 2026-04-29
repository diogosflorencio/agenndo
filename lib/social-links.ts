/**
 * Redes sociais na página pública: plataforma escolhida no dashboard + texto/handle do usuário.
 * URLs são derivadas aqui (evita armazenar URLs duplicadas).
 */

export type SocialPlatformId = "instagram" | "facebook" | "tiktok" | "youtube" | "linkedin" | "x";

export type SocialLink = {
  platform: SocialPlatformId;
  /** Texto livre: @usuario, slug ou URL parcial conforme a rede */
  handle: string;
};

export const SOCIAL_PLATFORM_OPTIONS: { id: SocialPlatformId; label: string; hint: string }[] = [
  { id: "instagram", label: "Instagram", hint: "usuário (ex.: minhaempresa)" },
  { id: "facebook", label: "Facebook", hint: "página ou perfil (ex.: MinhaEmpresa)" },
  { id: "tiktok", label: "TikTok", hint: "usuário sem @" },
  { id: "youtube", label: "YouTube", hint: "@canal ou ID do canal" },
  { id: "linkedin", label: "LinkedIn", hint: "slug do perfil (ex.: nome-sobrenome)" },
  { id: "x", label: "X (Twitter)", hint: "usuário sem @" },
];

export const MAX_SOCIAL_LINKS = 6;

const PLATFORMS = new Set<SocialPlatformId>(SOCIAL_PLATFORM_OPTIONS.map((o) => o.id));

function stripAt(s: string): string {
  return s.trim().replace(/^@+/, "");
}

/** Normaliza JSON do banco → lista válida, no máx. MAX_SOCIAL_LINKS, uma entrada por plataforma (primeira ganha). */
export function normalizeSocialLinks(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<SocialPlatformId>();
  const out: SocialLink[] = [];
  for (const entry of raw) {
    if (out.length >= MAX_SOCIAL_LINKS) break;
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const platform = o.platform;
    const handle = typeof o.handle === "string" ? o.handle.trim() : "";
    if (!handle || typeof platform !== "string" || !PLATFORMS.has(platform as SocialPlatformId)) continue;
    const p = platform as SocialPlatformId;
    if (seen.has(p)) continue;
    seen.add(p);
    out.push({ platform: p, handle });
  }
  return out;
}

function legacyInstagramHandle(url: string | null): string | null {
  if (!url?.trim()) return null;
  const t = url.trim();
  if (!t.startsWith("http")) return stripAt(t) || null;
  try {
    const u = new URL(t);
    if (!u.hostname.includes("instagram.com")) return null;
    const seg = u.pathname.replace(/\/$/, "").split("/").filter(Boolean)[0];
    return seg ? stripAt(seg) : null;
  } catch {
    return null;
  }
}

function legacyFacebookHandle(url: string | null): string | null {
  if (!url?.trim()) return null;
  const t = url.trim();
  if (!t.startsWith("http")) return stripAt(t) || null;
  try {
    const u = new URL(t);
    if (!u.hostname.includes("facebook.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const slug = parts[parts.length - 1];
    return slug ? decodeURIComponent(slug) : null;
  } catch {
    return null;
  }
}

/** Mescla coluna nova + migração a partir de instagram_url/facebook_url legados. */
export function mergePersonalizationSocialLinks(
  rawSocialLinks: unknown,
  instagramUrl: string | null,
  facebookUrl: string | null
): SocialLink[] {
  const parsed = normalizeSocialLinks(rawSocialLinks);
  if (parsed.length > 0) return parsed;
  const out: SocialLink[] = [];
  const ig = legacyInstagramHandle(instagramUrl);
  if (ig) out.push({ platform: "instagram", handle: ig });
  const fb = legacyFacebookHandle(facebookUrl);
  if (fb) out.push({ platform: "facebook", handle: fb });
  return out;
}

/** URL externa para o link do rodapé / página pública. */
export function socialProfileUrl(link: SocialLink): string | null {
  const raw = link.handle.trim();
  if (!raw) return null;
  const h = stripAt(raw);
  switch (link.platform) {
    case "instagram":
      return `https://instagram.com/${encodeURIComponent(h)}`;
    case "facebook":
      if (/^https?:\/\//i.test(raw)) return raw;
      return `https://www.facebook.com/${h.replace(/^\//, "")}`;
    case "tiktok":
      return `https://www.tiktok.com/@${encodeURIComponent(h)}`;
    case "youtube":
      if (/^https?:\/\//i.test(raw)) return raw;
      return `https://www.youtube.com/@${encodeURIComponent(h)}`;
    case "linkedin":
      if (/^https?:\/\//i.test(raw)) return raw;
      return `https://www.linkedin.com/in/${h.replace(/^\/+/, "")}`;
    case "x":
      return `https://x.com/${encodeURIComponent(h)}`;
    default:
      return null;
  }
}

/** Texto exibido ao lado do ícone (username amigável). */
export function formatSocialDisplay(link: SocialLink): string {
  const raw = link.handle.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const path = u.pathname.replace(/\/$/, "").split("/").filter(Boolean).pop();
      return path ? decodeURIComponent(path) : u.hostname;
    } catch {
      return raw.slice(0, 48);
    }
  }
  if (link.platform === "tiktok" || link.platform === "instagram" || link.platform === "x") {
    const s = stripAt(raw);
    return `@${s}`;
  }
  return raw.length > 42 ? `${raw.slice(0, 40)}…` : raw;
}

/** Payload para JSONB no Supabase (sem duplicar plataforma). */
export function socialLinksForDb(links: SocialLink[]): SocialLink[] {
  return normalizeSocialLinks(links);
}
