/** Máximo de fotos na galeria da página pública de agendamento. */
export const PUBLIC_GALLERY_MAX_IMAGES = 6;

/** Maior lado ao comprimir fotos da galeria antes do upload (reduz peso na página pública). */
export const GALLERY_COMPRESS_MAX_LONG_EDGE = 1536;

/** Normaliza `gallery_urls` do Postgres (text[], JSON string ou legado). */
export function normalizeGalleryUrlsFromDb(raw: unknown): string[] {
  let urls: string[] = [];
  if (Array.isArray(raw)) {
    urls = raw.filter((u): u is string => typeof u === "string" && u.length > 0);
  } else if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      urls = Array.isArray(p) ? p.filter((u): u is string => typeof u === "string" && u.length > 0) : [];
    } catch {
      urls = [];
    }
  }
  return urls.slice(0, PUBLIC_GALLERY_MAX_IMAGES);
}
