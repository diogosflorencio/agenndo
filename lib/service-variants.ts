export const SERVICE_VARIANT_MAX_PHOTOS = 3;

/** Maior lado ao comprimir mini-fotos de variação do serviço (leve, até 3 no card). */
export const SERVICE_VARIANT_COMPRESS_MAX_LONG_EDGE = 1280;

export type ServiceVariantItem = {
  url: string;
  title: string;
  description: string;
  /** Se definido, substitui o preço base do serviço para esta opção; `null` = usa o preço do serviço. */
  price_cents: number | null;
};

export function emptyVariantSlot(): ServiceVariantItem {
  return { url: "", title: "", description: "", price_cents: null };
}

/** Normaliza JSON do banco → lista com até 3 itens com URL válida preservando título/descrição. */
export function normalizeVariantGallery(raw: unknown): ServiceVariantItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ServiceVariantItem[] = [];
  for (const entry of raw) {
    if (out.length >= SERVICE_VARIANT_MAX_PHOTOS) break;
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url.trim() : "";
    if (!url) continue;
    let price_cents: number | null = null;
    const pc = o.price_cents;
    if (typeof pc === "number" && Number.isFinite(pc) && pc >= 0) {
      price_cents = Math.round(pc);
    }
    out.push({
      url,
      title: typeof o.title === "string" ? o.title.trim().slice(0, 80) : "",
      description: typeof o.description === "string" ? o.description.trim().slice(0, 200) : "",
      price_cents,
    });
  }
  return out;
}

export function variantsNeedPicker(variants: ServiceVariantItem[]): boolean {
  return variants.length > 0;
}

/** Preço efetivo da opção: override da variação ou preço base do serviço. */
export function variantEffectivePriceCents(
  item: ServiceVariantItem | undefined | null,
  basePriceCents: number
): number {
  const base = Math.max(0, Math.round(Number(basePriceCents) || 0));
  if (!item) return base;
  const o = item.price_cents;
  if (o == null || !Number.isFinite(o) || o < 0) return base;
  return Math.round(o);
}
