"use client";

/** Cache client do catálogo público — evita refetch completo ao vitrine ↔ agendar. */

export type PublicPageCatalogClient = {
  business: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    phone: string | null;
    primary_color: string | null;
    segment: string | null;
    logo_url: string | null;
    public_pix_key?: string | null;
    public_pix_suggest_enabled?: boolean | null;
    public_pix_suggest_message?: string | null;
    payment_policy?: "off" | "optional" | "required_deposit" | "required_full";
    deposit_mode?: "percent" | "fixed";
    deposit_percent?: number | null;
    deposit_fixed_cents?: number | null;
    payment_client_message?: string | null;
    mp_checkout_enabled?: boolean;
    mp_connected?: boolean;
  } | null;
  services: unknown[];
  collaborators: unknown[];
  personalization: unknown | null;
};

type CacheEntry = { data: PublicPageCatalogClient; fetchedAt: number };

/** Incrementar quando o payload do catálogo mudar (ex.: campos de pagamento). */
const CATALOG_CACHE_VERSION = 2;
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 20_000;

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PublicPageCatalogClient | null>>();

function cacheKey(slug: string) {
  return `v${CATALOG_CACHE_VERSION}:${slug.trim()}`;
}

export function getCachedPublicCatalog(slug: string): PublicPageCatalogClient | null {
  const key = cacheKey(slug);
  if (!key) return null;
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > CACHE_TTL_MS) return null;
  return hit.data;
}

export function setCachedPublicCatalog(slug: string, data: PublicPageCatalogClient) {
  const key = cacheKey(slug);
  if (!key || !data.business) return;
  cache.set(key, { data, fetchedAt: Date.now() });
}

/** Dispara fetch sem bloquear (ex.: hover / vitrine já carregada). */
export function prefetchPublicCatalog(slug: string) {
  void fetchPublicCatalog(slug).catch(() => null);
}

export async function fetchPublicCatalog(
  slug: string,
  signal?: AbortSignal
): Promise<PublicPageCatalogClient | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  const key = cacheKey(trimmed);

  const fresh = getCachedPublicCatalog(key);
  if (fresh?.business) return fresh;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async (): Promise<PublicPageCatalogClient | null> => {
    const timeout = new AbortController();
    const onExternalAbort = () => {
      inflight.delete(key);
      timeout.abort();
    };
    signal?.addEventListener("abort", onExternalAbort);

    const timer = window.setTimeout(() => timeout.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(`/api/public/page-data?slug=${encodeURIComponent(key)}`, {
        signal: timeout.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as PublicPageCatalogClient;
      if (data.business) setCachedPublicCatalog(key, data);
      return data.business ? data : null;
    } catch (err) {
      const aborted =
        (err instanceof DOMException && err.name === "AbortError") ||
        (err instanceof Error && err.name === "AbortError");
      if (aborted) {
        inflight.delete(key);
      }
      return getCachedPublicCatalog(key);
    } finally {
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", onExternalAbort);
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}
