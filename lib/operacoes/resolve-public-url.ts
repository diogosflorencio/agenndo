import { buildPublicSlugUrl } from "@/lib/site-url";
import type { UnifiedRow } from "./types";

/** Link público do negócio no domínio atual (browser ou origem explícita). */
export function resolveRowPublicUrl(row: UnifiedRow, origin?: string | null): string | null {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : null);
  if (base && row.publicSlug) return buildPublicSlugUrl(base, row.publicSlug);
  return row.publicUrl;
}
