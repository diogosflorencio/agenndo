import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_COMPRESSED_OUTPUT_BYTES } from "@/lib/image-compress";

export const BUSINESS_ASSETS_BUCKET = "business-assets";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Limite do arquivo que sobe ao bucket (já deve vir comprimido pelo cliente). */
export function assertImageFile(file: File) {
  if (file.size > MAX_COMPRESSED_OUTPUT_BYTES) {
    const maxMb = Math.round(MAX_COMPRESSED_OUTPUT_BYTES / (1024 * 1024));
    throw new Error(`Imagem ainda grande demais após compressão (máx. ${maxMb} MB no envio).`);
  }
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
