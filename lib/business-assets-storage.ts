import type { SupabaseClient } from "@supabase/supabase-js";

export const BUSINESS_ASSETS_BUCKET = "business-assets";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function assertImageFile(file: File) {
  if (file.size > MAX_BYTES) throw new Error("Arquivo muito grande (máx. 5 MB).");
  if (!ALLOWED.has(file.type)) throw new Error("Use JPG, PNG, WebP ou GIF.");
}

export async function uploadBusinessImage(
  supabase: SupabaseClient,
  businessId: string,
  relativePath: string,
  file: File
): Promise<string> {
  assertImageFile(file);
  const path = `${businessId}/${relativePath}`;
  const { error } = await supabase.storage.from(BUSINESS_ASSETS_BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUSINESS_ASSETS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeBusinessObject(supabase: SupabaseClient, businessId: string, relativePath: string) {
  const path = `${businessId}/${relativePath}`;
  await supabase.storage.from(BUSINESS_ASSETS_BUCKET).remove([path]);
}

/** Extrai o path relativo ao bucket a partir da URL pública (quando possível). */
export function tryRelativePathFromPublicUrl(publicUrl: string, businessId: string): string | null {
  try {
    const u = new URL(publicUrl);
    const marker = `/object/public/${BUSINESS_ASSETS_BUCKET}/`;
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    const full = u.pathname.slice(i + marker.length);
    const prefix = `${businessId}/`;
    if (!full.startsWith(prefix)) return null;
    return full.slice(prefix.length);
  } catch {
    return null;
  }
}
