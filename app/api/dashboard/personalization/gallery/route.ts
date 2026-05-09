import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserId } from "@/lib/supabase/effective-user";
import {
  BUSINESS_ASSETS_BUCKET,
  tryRelativePathFromPublicUrl,
  removeBusinessObject,
} from "@/lib/business-assets-storage";
import { MAX_COMPRESSED_OUTPUT_BYTES } from "@/lib/image-compress";
import {
  normalizeGalleryUrlsFromDb,
  PUBLIC_GALLERY_MAX_IMAGES,
} from "@/lib/public-gallery";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function resolveBusiness(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Não autenticado", status: 401 as const, businessId: null as string | null };
  const effectiveId = await getEffectiveUserId(supabase);
  if (!effectiveId) return { error: "Sessão inválida", status: 401 as const, businessId: null as string | null };
  const { data: biz, error } = await supabase.from("businesses").select("id").eq("profile_id", effectiveId).maybeSingle();
  if (error || !biz?.id) return { error: "Negócio não encontrado", status: 404 as const, businessId: null as string | null };
  return { businessId: biz.id as string, error: null, status: null };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const auth = await resolveBusiness(supabase);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status! });
  const businessId = auth.businessId!;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const replaceRaw = formData.get("replaceIndex");
  const replaceIndex =
    typeof replaceRaw === "string" && replaceRaw !== "" && !Number.isNaN(Number(replaceRaw))
      ? Number(replaceRaw)
      : null;

  const rawFiles = formData.getAll("files");
  const files: Blob[] = [];
  for (const x of rawFiles) {
    if (typeof Blob !== "undefined" && x instanceof Blob && x.size > 0) files.push(x);
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "Envie pelo menos uma imagem (JPEG, PNG, WebP ou GIF)." }, { status: 400 });
  }

  for (const f of files) {
    const mime = f.type || "application/octet-stream";
    if (!ALLOWED_TYPES.has(mime)) {
      return NextResponse.json({ error: "Use JPG, PNG, WebP ou GIF." }, { status: 400 });
    }
    if (f.size > MAX_COMPRESSED_OUTPUT_BYTES) {
      return NextResponse.json(
        { error: `Arquivo grande demais (máx. ${Math.round(MAX_COMPRESSED_OUTPUT_BYTES / (1024 * 1024))} MB após compressão).` },
        { status: 413 }
      );
    }
  }

  const { data: pers, error: selErr } = await supabase
    .from("personalization")
    .select("id, gallery_urls")
    .eq("business_id", businessId)
    .maybeSingle();

  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  let existing = normalizeGalleryUrlsFromDb(pers?.gallery_urls);
  const nowIso = new Date().toISOString();

  const extFromMime = (mime: string) => {
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    if (mime === "image/gif") return "gif";
    return "jpg";
  };

  const uploadOne = async (file: Blob) => {
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = extFromMime(file.type || "image/jpeg");
    const name = `gallery/${crypto.randomUUID()}.${ext}`;
    const path = `${businessId}/${name}`;
    const { error: upErr } = await supabase.storage.from(BUSINESS_ASSETS_BUCKET).upload(path, buf, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
    });
    if (upErr) throw new Error(upErr.message);
    const { data } = supabase.storage.from(BUSINESS_ASSETS_BUCKET).getPublicUrl(path);
    return data.publicUrl as string;
  };

  try {
    let nextUrls: string[];
    let urlsToDeleteFromStorage: string[] = [];

    if (replaceIndex !== null) {
      if (files.length !== 1) {
        return NextResponse.json({ error: "Substituição aceita apenas um arquivo." }, { status: 400 });
      }
      if (replaceIndex < 0 || replaceIndex >= existing.length) {
        return NextResponse.json({ error: "Índice da foto inválido." }, { status: 400 });
      }
      const oldUrl = existing[replaceIndex]!;
      const newUrl = await uploadOne(files[0]!);
      nextUrls = [...existing];
      nextUrls[replaceIndex] = newUrl;
      urlsToDeleteFromStorage.push(oldUrl);
    } else {
      const remaining = PUBLIC_GALLERY_MAX_IMAGES - existing.length;
      if (remaining <= 0) {
        return NextResponse.json({ error: `Máximo de ${PUBLIC_GALLERY_MAX_IMAGES} fotos.` }, { status: 400 });
      }
      const take = Math.min(files.length, remaining);
      nextUrls = [...existing];
      for (let i = 0; i < take; i++) {
        const url = await uploadOne(files[i]!);
        nextUrls.push(url);
      }
      nextUrls = nextUrls.slice(0, PUBLIC_GALLERY_MAX_IMAGES);
    }

    const payload = {
      gallery_urls: nextUrls.length ? nextUrls : null,
      updated_at: nowIso,
    };

    if (pers?.id) {
      const { error: up } = await supabase.from("personalization").update(payload).eq("id", pers.id as string);
      if (up) throw new Error(up.message);
    } else {
      const { error: insErr } = await supabase.from("personalization").insert({
        business_id: businessId,
        ...payload,
      });
      if (insErr) throw new Error(insErr.message);
    }

    for (const oldUrl of urlsToDeleteFromStorage) {
      const rel = tryRelativePathFromPublicUrl(oldUrl, businessId);
      if (rel) {
        try {
          await removeBusinessObject(supabase, businessId, rel);
        } catch {
          /* best-effort */
        }
      }
    }

    return NextResponse.json({ urls: nextUrls });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao salvar galeria";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
