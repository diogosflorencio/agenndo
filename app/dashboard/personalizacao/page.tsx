"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { SwitchToggle } from "@/components/switch-toggle";
import { cn, formatBrazilPhoneFromDigits, formatCurrency, maskPhoneInputRaw } from "@/lib/utils";
import {
  uploadBusinessImage,
  tryRelativePathFromPublicUrl,
  removeBusinessObject,
} from "@/lib/business-assets-storage";
import { compressImageForUpload } from "@/lib/image-compress";
import { useAppAlert } from "@/components/app-alert-provider";
import { UnsavedChangesIndicator } from "@/components/dashboard-unsaved-indicator";
import { PersonalizationShareQr } from "@/components/personalization-share-qr";

const PALETTE = [
  { value: "#13EC5B", label: "Verde" },
  { value: "#3B82F6", label: "Azul" },
  { value: "#8B5CF6", label: "Violeta" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#F59E0B", label: "Âmbar" },
  { value: "#EF4444", label: "Vermelho" },
  { value: "#14B8A6", label: "Teal" },
  { value: "#6366F1", label: "Índigo" },
  { value: "#F97316", label: "Laranja" },
  { value: "#84CC16", label: "Lima" },
  { value: "#06B6D4", label: "Ciano" },
  { value: "#A855F7", label: "Púrpura" },
];

type PreviewServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  emoji: string | null;
};

type PersonalizationRow = {
  id?: string;
  banner_url: string | null;
  gallery_urls: string[] | null;
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_number: string | null;
  tagline: string | null;
  about: string | null;
  public_theme: string | null;
  show_whatsapp_fab: boolean | null;
  address_line: string | null;
};

function normalizeInstagram(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.startsWith("http")) return t;
  const u = t.replace(/^@/, "").replace(/^\//, "");
  return `https://instagram.com/${u}`;
}

function normalizeFacebook(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.startsWith("http")) return t;
  return `https://facebook.com/${t.replace(/^@/, "")}`;
}

function displayInstagram(url: string | null) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("instagram.com")) {
      const p = u.pathname.replace(/\/$/, "").split("/").filter(Boolean)[0];
      return p ? `@${p}` : url;
    }
  } catch {
    /* ignore */
  }
  return url;
}

function normalizeGalleryUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === "string" && u.length > 0);
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? p.filter((u): u is string => typeof u === "string" && u.length > 0) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function storageFileExt(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export default function PersonalizacaoPage() {
  const { showAlert } = useAppAlert();
  const router = useRouter();
  const { business } = useDashboard();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const galleryReplaceInputRef = useRef<HTMLInputElement>(null);
  const galleryReplaceIndexRef = useRef<number | null>(null);

  const [persId, setPersId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    businessName: "",
    tagline: "",
    primaryColor: "#13EC5B",
    about: "",
    instagram: "",
    facebook: "",
    whatsapp: "",
    address: "",
    floatingWhatsapp: true,
    darkPage: true,
    logoUrl: null as string | null,
    bannerUrl: null as string | null,
    galleryUrls: [] as string[],
  });

  const [uploading, setUploading] = useState<"logo" | "banner" | "gallery" | null>(null);
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"aparencia" | "conteudo" | "contato" | "compartilhar">("aparencia");
  const [copied, setCopied] = useState(false);
  const [previewServices, setPreviewServices] = useState<PreviewServiceRow[]>([]);
  /** Baseline serializado para `formDirty`; estado (não ref) para recalcular após salvar. */
  const [formBaseline, setFormBaseline] = useState<string | null>(null);
  /** Alvo do portal da pré-visualização do QR na coluna lateral (desktop). */
  const [qrPreviewHostEl, setQrPreviewHostEl] = useState<HTMLDivElement | null>(null);
  const onQrPreviewHostRef = useCallback((el: HTMLDivElement | null) => {
    setQrPreviewHostEl(el);
  }, []);

  const loadData = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const supabase = createClient();
    const [persRes, svcRes] = await Promise.all([
      supabase.from("personalization").select("*").eq("business_id", business.id).maybeSingle(),
      supabase
        .from("services")
        .select("id, name, duration_minutes, price_cents, emoji")
        .eq("business_id", business.id)
        .eq("active", true)
        .order("name", { ascending: true }),
    ]);

    const error = persRes.error;
    if (error) {
      setLoadError(error.message);
      setLoading(false);
      setPreviewServices([]);
      return;
    }

    setPreviewServices(svcRes.error ? [] : ((svcRes.data as PreviewServiceRow[]) ?? []));

    const pers = persRes.data;
    const p = pers as PersonalizationRow | null;
    if (p?.id) setPersId(p.id);

    const nextForm = {
      businessName: business.name ?? "",
      tagline: p?.tagline ?? "",
      primaryColor: business.primary_color ?? "#13EC5B",
      about: p?.about ?? "",
      instagram: displayInstagram(p?.instagram_url ?? null),
      facebook: p?.facebook_url?.replace(/^https?:\/\/(www\.)?facebook\.com\//i, "") ?? "",
      whatsapp: formatBrazilPhoneFromDigits(business.phone ?? p?.whatsapp_number ?? ""),
      address: p?.address_line ?? "",
      floatingWhatsapp: p?.show_whatsapp_fab !== false,
      darkPage: (p?.public_theme ?? "dark") !== "light",
      logoUrl: business.logo_url ?? null,
      bannerUrl: p?.banner_url ?? null,
      galleryUrls: normalizeGalleryUrls(p?.gallery_urls),
    };
    const baseline = JSON.stringify(nextForm);
    setForm(nextForm);
    setFormBaseline(baseline);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const formDirty = useMemo(() => {
    if (loading || formBaseline === null) return false;
    return JSON.stringify(form) !== formBaseline;
  }, [loading, form, formBaseline]);

  const blockMediaActions = uploading !== null || saving;

  const persistGalleryUrls = useCallback(
    async (urls: string[]) => {
      if (!business?.id) return;
      const supabase = createClient();
      const payload = {
        gallery_urls: urls.length ? urls : null,
        updated_at: new Date().toISOString(),
      };
      const { data: existing, error: selErr } = await supabase
        .from("personalization")
        .select("id")
        .eq("business_id", business.id)
        .maybeSingle();
      if (selErr) throw new Error(selErr.message);

      if (existing?.id) {
        const { error } = await supabase.from("personalization").update(payload).eq("id", existing.id);
        if (error) throw new Error(error.message);
        setPersId(existing.id);
      } else {
        const { data: ins, error } = await supabase
          .from("personalization")
          .insert({
            business_id: business.id,
            ...payload,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        if (ins?.id) setPersId(ins.id as string);
      }

      setFormBaseline((prev) => {
        if (prev === null) return null;
        try {
          const b = JSON.parse(prev) as Record<string, unknown>;
          b.galleryUrls = urls;
          return JSON.stringify(b);
        } catch {
          return prev;
        }
      });
      router.refresh();
    },
    [business?.id, router]
  );

  const publicUrl =
    typeof window !== "undefined" ? `${window.location.origin}/${business?.slug ?? ""}` : "";

  const handleCopy = () => {
    if (!publicUrl || !business?.slug) return;
    void navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onPickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !business?.id || blockMediaActions) return;
    setUploading("logo");
    setUploadLabel("Otimizando e enviando logo…");
    try {
      const prepared = await compressImageForUpload(file);
      const ext = storageFileExt(prepared);
      const supabase = createClient();
      const url = await uploadBusinessImage(supabase, business.id, `logo.${ext}`, prepared);
      const { error } = await supabase.from("businesses").update({ logo_url: url }).eq("id", business.id);
      if (error) throw new Error(error.message);
      setForm((f) => ({ ...f, logoUrl: url }));
      router.refresh();
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Falha no upload", { title: "Upload" });
    } finally {
      setUploading(null);
      setUploadLabel(null);
    }
  };

  const onPickBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !business?.id || blockMediaActions) return;
    setUploading("banner");
    setUploadLabel("Otimizando e enviando capa…");
    try {
      const prepared = await compressImageForUpload(file);
      const ext = storageFileExt(prepared);
      const supabase = createClient();
      const url = await uploadBusinessImage(supabase, business.id, `banner.${ext}`, prepared);
      setForm((f) => ({ ...f, bannerUrl: url }));
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Falha no upload", { title: "Upload" });
    } finally {
      setUploading(null);
      setUploadLabel(null);
    }
  };

  const onPickGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length || !business?.id || blockMediaActions) return;
    const remaining = 8 - form.galleryUrls.length;
    if (remaining <= 0) {
      showAlert("Máximo de 8 fotos na galeria.", { title: "Galeria" });
      return;
    }
    setUploading("gallery");
    const supabase = createClient();
    let next = [...form.galleryUrls];
    const count = Math.min(files.length, remaining);
    try {
      for (let i = 0; i < count; i++) {
        setUploadLabel(`Otimizando e enviando ${i + 1} de ${count}…`);
        const prepared = await compressImageForUpload(files[i]);
        const ext = storageFileExt(prepared);
        const name = `gallery/${crypto.randomUUID()}.${ext}`;
        const url = await uploadBusinessImage(supabase, business.id, name, prepared);
        next = [...next, url];
        await persistGalleryUrls(next);
        setForm((f) => ({ ...f, galleryUrls: next }));
      }
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Falha no upload", { title: "Galeria" });
    } finally {
      setUploading(null);
      setUploadLabel(null);
    }
  };

  const onPickGalleryReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const index = galleryReplaceIndexRef.current;
    galleryReplaceIndexRef.current = null;
    if (!file || !business?.id || index === null || blockMediaActions) return;
    if (index < 0 || index >= form.galleryUrls.length) return;
    setUploading("gallery");
    setUploadLabel("Substituindo foto da galeria…");
    const supabase = createClient();
    const oldUrl = form.galleryUrls[index];
    try {
      const prepared = await compressImageForUpload(file);
      const ext = storageFileExt(prepared);
      const name = `gallery/${crypto.randomUUID()}.${ext}`;
      const url = await uploadBusinessImage(supabase, business.id, name, prepared);
      const next = [...form.galleryUrls];
      next[index] = url;
      await persistGalleryUrls(next);
      const rel = tryRelativePathFromPublicUrl(oldUrl, business.id);
      if (rel) {
        try {
          await removeBusinessObject(supabase, business.id, rel);
        } catch {
          /* arquivo antigo pode já ter sido removido */
        }
      }
      setForm((f) => ({ ...f, galleryUrls: next }));
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Falha ao substituir", { title: "Galeria" });
    } finally {
      setUploading(null);
      setUploadLabel(null);
    }
  };

  const removeGalleryAt = async (index: number) => {
    if (!business?.id || blockMediaActions) return;
    const url = form.galleryUrls[index];
    const next = form.galleryUrls.filter((_, i) => i !== index);
    setUploading("gallery");
    setUploadLabel("Atualizando galeria…");
    try {
      await persistGalleryUrls(next);
      const supabase = createClient();
      const rel = tryRelativePathFromPublicUrl(url, business.id);
      if (rel) {
        try {
          await removeBusinessObject(supabase, business.id, rel);
        } catch {
          /* continua */
        }
      }
      setForm((f) => ({ ...f, galleryUrls: next }));
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Falha ao remover da galeria", { title: "Galeria" });
    } finally {
      setUploading(null);
      setUploadLabel(null);
    }
  };

  const removeLogo = async () => {
    if (!business?.id || !form.logoUrl || blockMediaActions) return;
    setUploading("logo");
    setUploadLabel("Removendo logo…");
    try {
      const supabase = createClient();
      const rel = tryRelativePathFromPublicUrl(form.logoUrl, business.id);
      if (rel) {
        try {
          await removeBusinessObject(supabase, business.id, rel);
        } catch {
          /* segue limpando URL no banco */
        }
      }
      const { error } = await supabase.from("businesses").update({ logo_url: null }).eq("id", business.id);
      if (error) throw new Error(error.message);
      setForm((f) => ({ ...f, logoUrl: null }));
      router.refresh();
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Não foi possível remover a foto", { title: "Logo" });
    } finally {
      setUploading(null);
      setUploadLabel(null);
    }
  };

  const removeBanner = async () => {
    if (!business?.id || !form.bannerUrl || blockMediaActions) return;
    const url = form.bannerUrl;
    setUploading("banner");
    setUploadLabel("Removendo capa…");
    try {
      const supabase = createClient();
      const rel = tryRelativePathFromPublicUrl(url, business.id);
      if (rel) {
        try {
          await removeBusinessObject(supabase, business.id, rel);
        } catch {
          /* remove só do formulário */
        }
      }
      setForm((f) => ({ ...f, bannerUrl: null }));
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Não foi possível remover a capa", { title: "Capa" });
    } finally {
      setUploading(null);
      setUploadLabel(null);
    }
  };

  const saveAll = async () => {
    if (!business?.id || uploading !== null) return;
    setSaving(true);
    setSaveMsg(null);
    const supabase = createClient();
    const phoneDigits = form.whatsapp.replace(/\D/g, "");
    const fbUrl = normalizeFacebook(form.facebook);

    const { error: bizErr } = await supabase
      .from("businesses")
      .update({
        name: form.businessName.trim() || business.name,
        primary_color: form.primaryColor,
        phone: phoneDigits || null,
      })
      .eq("id", business.id);

    if (bizErr) {
      setSaveMsg(bizErr.message);
      setSaving(false);
      return;
    }

    const payload = {
      business_id: business.id,
      banner_url: form.bannerUrl,
      gallery_urls: form.galleryUrls.length ? form.galleryUrls : null,
      instagram_url: normalizeInstagram(form.instagram),
      facebook_url: fbUrl,
      whatsapp_number: phoneDigits || null,
      tagline: form.tagline.trim() || null,
      about: form.about.trim() || null,
      public_theme: form.darkPage ? "dark" : "light",
      show_whatsapp_fab: form.floatingWhatsapp,
      address_line: form.address.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (persId) {
      const { error } = await supabase.from("personalization").update(payload).eq("id", persId);
      if (error) {
        setSaveMsg(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { data: ins, error } = await supabase.from("personalization").insert(payload).select("id").single();
      if (error) {
        setSaveMsg(error.message);
        setSaving(false);
        return;
      }
      if (ins?.id) setPersId(ins.id as string);
    }

    setSaveMsg("Alterações salvas.");
    setFormBaseline(JSON.stringify(form));
    setSaving(false);
    router.refresh();
    setTimeout(() => setSaveMsg(null), 4000);
  };

  if (!business) {
    return (
      <div className="w-full p-6">
        <p className="text-gray-600 text-sm">Carregue o negócio para personalizar.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-24">
        <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold text-gray-900">Personalização</h1>
          <UnsavedChangesIndicator dirty={formDirty} variant="inline" />
        </div>
        <p className="text-gray-600 text-sm mt-1">Aparência e conteúdo da página pública — salvos no banco e nos arquivos.</p>
        {loadError && <p className="text-red-600 text-sm mt-2">{loadError}</p>}
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
        <div className="order-1 min-w-0 lg:col-span-3">
          <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 shadow-sm [-webkit-overflow-scrolling:touch]">
            {[
              { key: "aparencia", label: "Aparência", icon: "palette" },
              { key: "conteudo", label: "Conteúdo", icon: "edit" },
              { key: "contato", label: "Contato", icon: "contacts" },
              { key: "compartilhar", label: "Compartilhar", icon: "share" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={cn(
                  "flex shrink-0 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-3.5",
                  activeTab === tab.key ? "bg-primary text-black" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <span className="material-symbols-outlined text-sm shrink-0">{tab.icon}</span>
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "aparencia" && (
            <div className="space-y-5">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Cor principal</h3>
                <div className="grid grid-cols-6 gap-2">
                  {PALETTE.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setForm({ ...form, primaryColor: color.value })}
                      className={cn(
                        "aspect-square rounded-xl transition-all",
                        form.primaryColor === color.value
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-gray-50 scale-110"
                          : "hover:scale-105"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Logo / Foto de perfil</h3>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="size-16 rounded-xl overflow-hidden border-2 shrink-0 bg-gray-50 flex items-center justify-center">
                    {form.logoUrl ? (
                      <Image src={form.logoUrl} alt="" width={64} height={64} className="size-16 object-cover" unoptimized />
                    ) : (
                      <span
                        className="text-2xl font-bold"
                        style={{ color: form.primaryColor }}
                      >
                        {form.businessName[0]?.toUpperCase() ?? "?"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPickLogo} />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={blockMediaActions}
                        onClick={() => logoInputRef.current?.click()}
                        className="px-4 py-2 bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-sm">upload</span>
                        {uploading === "logo" ? "Enviando…" : form.logoUrl ? "Substituir foto" : "Enviar foto"}
                      </button>
                      {form.logoUrl ? (
                        <button
                          type="button"
                          disabled={blockMediaActions}
                          onClick={() => void removeLogo()}
                          className="px-4 py-2 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 text-red-700 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Remover
                        </button>
                      ) : null}
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">PNG, JPG ou WebP até 12 MB (comprimimos antes do envio).</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-1">Foto de capa</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Recomendado: imagem larga, por exemplo <strong className="font-medium text-gray-600">1920 × 640 px</strong> (ou
                  proporção parecida); JPG ou WebP até 12 MB (comprimidos no envio).
                </p>
                <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPickBanner} />
                {form.bannerUrl ? (
                  <div className="space-y-3">
                    <div className="relative w-full h-28 rounded-xl border border-gray-200 overflow-hidden bg-gray-100">
                      <Image src={form.bannerUrl} alt="" fill className="object-cover" unoptimized />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={blockMediaActions}
                        onClick={() => bannerInputRef.current?.click()}
                        className="px-4 py-2 bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-sm">upload</span>
                        {uploading === "banner" ? "Enviando…" : "Substituir capa"}
                      </button>
                      <button
                        type="button"
                        disabled={blockMediaActions}
                        onClick={() => void removeBanner()}
                        className="px-4 py-2 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 text-red-700 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Remover capa
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={blockMediaActions}
                    onClick={() => bannerInputRef.current?.click()}
                    className="relative w-full h-28 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary/40 overflow-hidden group"
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
                      <span className="material-symbols-outlined text-gray-500 group-hover:text-primary text-3xl">add_photo_alternate</span>
                      <p className="text-xs text-gray-500 mt-1">Clique para enviar capa</p>
                    </div>
                  </button>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Tema da página pública</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {form.darkPage ? "Modo escuro" : "Modo claro"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-500 text-base">light_mode</span>
                    <SwitchToggle checked={form.darkPage} onChange={() => setForm({ ...form, darkPage: !form.darkPage })} />
                    <span className="material-symbols-outlined text-gray-500 text-base">dark_mode</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "conteudo" && (
            <div className="space-y-4">
              {[
                { label: "Nome do negócio", key: "businessName" as const, placeholder: "Nome do seu negócio" },
                { label: "Tagline / Slogan", key: "tagline" as const, placeholder: "Ex: Seu visual, nossa paixão" },
              ].map((field) => (
                <div key={field.key} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <label className="text-sm font-medium text-gray-700 block mb-2">{field.label}</label>
                  <input
                    type="text"
                    value={form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
                  />
                </div>
              ))}

              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <label className="text-sm font-medium text-gray-700 block mb-2">Sobre o negócio</label>
                <textarea
                  value={form.about}
                  onChange={(e) => setForm({ ...form, about: e.target.value })}
                  placeholder="Conte um pouco sobre seu negócio..."
                  rows={4}
                  maxLength={500}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm resize-none"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{form.about.length}/500</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Galeria de fotos</label>
                  <span className="text-xs text-gray-500">{form.galleryUrls.length}/8</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Fotos são otimizadas ao enviar e salvas automaticamente. Máx. 8 imagens.
                </p>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={onPickGallery}
                />
                <input
                  ref={galleryReplaceInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={onPickGalleryReplace}
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {form.galleryUrls.map((url, i) => (
                    <div
                      key={`${i}-${url.slice(-24)}`}
                      className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group"
                    >
                      <Image src={url} alt="" fill className="object-cover" unoptimized />
                      <div className="absolute inset-x-0 bottom-0 flex gap-0.5 p-1 bg-gradient-to-t from-black/70 to-transparent pt-6 justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={blockMediaActions}
                          onClick={() => {
                            galleryReplaceIndexRef.current = i;
                            galleryReplaceInputRef.current?.click();
                          }}
                          className="flex-1 min-w-0 py-1 px-0.5 rounded-md bg-white/95 text-[10px] font-bold text-gray-800 hover:bg-white disabled:opacity-50"
                          title="Substituir"
                        >
                          Trocar
                        </button>
                        <button
                          type="button"
                          disabled={blockMediaActions}
                          onClick={() => void removeGalleryAt(i)}
                          className="flex-1 min-w-0 py-1 px-0.5 rounded-md bg-red-600/95 text-[10px] font-bold text-white hover:bg-red-600 disabled:opacity-50"
                          title="Remover"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                  {form.galleryUrls.length < 8 && (
                    <button
                      type="button"
                      disabled={blockMediaActions}
                      onClick={() => galleryInputRef.current?.click()}
                      className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-200 hover:border-primary/40 flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <span
                        className={cn(
                          "material-symbols-outlined text-gray-500 text-xl",
                          uploading === "gallery" && "animate-spin"
                        )}
                      >
                        {uploading === "gallery" ? "progress_activity" : "add"}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-500">Adicionar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "contato" && (
            <div className="space-y-4">
              {[
                { label: "Instagram", key: "instagram" as const, icon: "photo_camera", placeholder: "@seuperfil" },
                { label: "Facebook", key: "facebook" as const, icon: "public", placeholder: "usuario ou URL" },
                { label: "WhatsApp", key: "whatsapp" as const, icon: "chat", placeholder: "(11) 99999-9999" },
                { label: "Endereço", key: "address" as const, icon: "location_on", placeholder: "Rua, número — Cidade/UF" },
              ].map((field) => (
                <div key={field.key} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <label className="text-sm font-medium text-gray-700 block mb-2">{field.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-base">
                      {field.icon}
                    </span>
                    <input
                      type={field.key === "whatsapp" ? "tel" : "text"}
                      inputMode={field.key === "whatsapp" ? "tel" : undefined}
                      autoComplete={field.key === "whatsapp" ? "tel" : undefined}
                      value={form[field.key]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [field.key]:
                            field.key === "whatsapp" ? maskPhoneInputRaw(e.target.value) : e.target.value,
                        })
                      }
                      placeholder={field.placeholder}
                      className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl pl-10 pr-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
                    />
                  </div>
                </div>
              ))}

              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Botão WhatsApp flutuante</p>
                    <p className="text-xs text-gray-500 mt-0.5">Na página pública (precisa de número em WhatsApp)</p>
                  </div>
                  <SwitchToggle
                    checked={form.floatingWhatsapp}
                    onChange={() => setForm({ ...form, floatingWhatsapp: !form.floatingWhatsapp })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "compartilhar" && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Seu link público</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 flex items-center min-w-0">
                    <span className="text-gray-600 text-sm truncate">{publicUrl}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={cn(
                      "h-11 px-4 rounded-xl font-semibold text-sm transition-all flex items-center gap-1.5 flex-shrink-0",
                      copied ? "bg-primary text-black" : "bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700"
                    )}
                  >
                    <span className="material-symbols-outlined text-sm">{copied ? "check" : "content_copy"}</span>
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>

              <PersonalizationShareQr
                publicUrl={publicUrl}
                slug={business.slug ?? ""}
                businessName={form.businessName || business.name || "Negócio"}
                tagline={form.tagline.trim() || null}
                logoUrl={form.logoUrl}
                primaryColor={form.primaryColor}
                desktopPreviewHost={qrPreviewHostEl}
              />

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl flex-shrink-0 mt-0.5">tips_and_updates</span>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-1">Dica: Instagram Bio</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Cole o link público na bio do Instagram para seus clientes agendarem direto.
                  </p>
                </div>
              </div>
            </div>
          )}

          {saveMsg && (
            <p className={cn("text-sm mt-3", saveMsg.includes("salvas") ? "text-green-600" : "text-red-600")}>{saveMsg}</p>
          )}
          <UnsavedChangesIndicator dirty={formDirty} className="w-full mt-4" />
          <button
            type="button"
            disabled={saving || uploading !== null}
            onClick={() => void saveAll()}
            className={cn(
              "w-full mt-3 py-4 bg-primary hover:bg-primary/90 disabled:opacity-60 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)] flex items-center justify-center gap-2",
              formDirty && "ring-2 ring-amber-500/45"
            )}
          >
            <span className="material-symbols-outlined text-base">save</span>
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>

        <aside
          className={cn(
            "order-2 w-full min-w-0 lg:col-span-2 lg:sticky lg:top-6",
            activeTab === "compartilhar" && business.slug ? "hidden lg:block" : ""
          )}
        >
          {activeTab === "compartilhar" && business.slug ? (
            <>
              <p className="mb-3 hidden text-xs font-bold uppercase tracking-wider text-gray-500 lg:block">
                Pré-visualização do QR Code
              </p>
              <div
                ref={onQrPreviewHostRef}
                className="hidden min-h-[120px] w-full justify-center lg:flex"
              />
            </>
          ) : (
            <>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                Preview da página pública
              </p>
              <PagePreview form={form} services={previewServices} />
            </>
          )}
        </aside>
      </div>

      {uploading && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 px-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 px-6 py-5 max-w-sm w-full text-center">
            <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-900">{uploadLabel ?? "Aguarde…"}</p>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Não clique várias vezes nem feche a aba até terminar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

type PreviewForm = {
  businessName: string;
  tagline: string;
  primaryColor: string;
  about: string;
  instagram: string;
  address: string;
  floatingWhatsapp: boolean;
  darkPage: boolean;
  logoUrl: string | null;
  bannerUrl: string | null;
  galleryUrls: string[];
};

const PREVIEW_MAX_SERVICES = 8;

function PagePreview({ form, services }: { form: PreviewForm; services: PreviewServiceRow[] }) {
  /* Modo claro: cores literais — o dashboard usa data-theme=dark e globals.css força .bg-white/.text-gray-* etc. */
  const bg = form.darkPage ? "bg-[#020403]" : "bg-[#f9fafb]";
  const cardBg = form.darkPage ? "bg-[#14221A] border-[#213428]" : "bg-[#ffffff] border-[#e5e7eb]";
  const cardBgSoft = form.darkPage ? "bg-[#0f1c15] border-white/5" : "bg-[#f9fafb] border-[#e5e7eb]";
  const text = form.darkPage ? "text-white" : "text-[#111827]";
  const subtext = form.darkPage ? "text-gray-400" : "text-[#6b7280]";
  const avatarBorder = form.darkPage ? "border-[#020403]" : "border-[#f9fafb]";
  const shown = services.slice(0, PREVIEW_MAX_SERVICES);
  const restCount = Math.max(0, services.length - shown.length);

  return (
    <div
      className={cn(
        "rounded-2xl border shadow-[0_12px_40px_-8px_rgba(0,0,0,0.25)] overflow-visible",
        form.darkPage ? "border-white/10" : "border-[#e5e7eb]",
        bg
      )}
    >
      <div className="relative">
        <div
          className={cn(
            "relative h-32 w-full overflow-hidden rounded-t-2xl",
            form.darkPage ? "ring-1 ring-white/10" : "ring-1 ring-black/5"
          )}
        >
          {form.bannerUrl ? (
            <Image src={form.bannerUrl} alt="" fill className="object-cover" sizes="400px" unoptimized />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(145deg, ${form.primaryColor}40 0%, ${form.darkPage ? "#0a120e" : "#e8f0ec"} 50%, ${form.darkPage ? "#020403" : "#f3f4f6"} 100%)`,
              }}
            />
          )}
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/35 via-black/5 to-transparent pointer-events-none" />
          <div className="absolute top-2 right-2 z-[5] flex items-center gap-1.5">
            <span className="text-[9px] font-semibold px-2.5 py-1 rounded-full bg-black/45 text-white border border-white/20 backdrop-blur-sm">
              Entrar
            </span>
          </div>
        </div>

        <div className="relative z-10 px-3 -mt-7 pb-2">
          <div className="flex gap-2.5 items-end">
            <div
              className={cn(
                "size-[3.75rem] rounded-xl border-[3px] shadow-lg overflow-hidden shrink-0 flex items-center justify-center text-lg font-bold",
                avatarBorder
              )}
              style={{
                backgroundColor: form.logoUrl ? undefined : form.primaryColor + "25",
                color: form.primaryColor,
              }}
            >
              {form.logoUrl ? (
                <Image src={form.logoUrl} alt="" width={60} height={60} className="size-full object-cover" unoptimized />
              ) : (
                form.businessName[0]?.toUpperCase() ?? "?"
              )}
            </div>
            <div className="flex-1 min-w-0 pb-0.5 pt-5">
              <h2 className={cn("font-bold text-sm leading-tight truncate", text)}>{form.businessName}</h2>
              {form.tagline ? <p className={cn("text-[11px] mt-0.5 line-clamp-2", subtext)}>{form.tagline}</p> : null}
            </div>
            <span
              className="shrink-0 px-2.5 py-1 text-[10px] font-bold rounded-lg text-black mb-0.5"
              style={{ backgroundColor: form.primaryColor }}
            >
              Agendar
            </span>
          </div>
        </div>
      </div>

      <div className={cn("px-3 pb-2 space-y-1.5 border-b", cardBgSoft)}>
        {form.address && (
          <div className="flex items-center gap-1">
            <span className={cn("material-symbols-outlined text-[14px]", subtext)}>location_on</span>
            <p className={cn("text-[11px] truncate", subtext)}>{form.address}</p>
          </div>
        )}
        {form.instagram && (
          <p className={cn("text-[10px]", subtext)}>Instagram · {form.instagram}</p>
        )}
      </div>

      {form.about ? (
        <div className={cn("px-3 py-2.5 border-b text-[11px] leading-relaxed", cardBgSoft, subtext)}>{form.about}</div>
      ) : null}

      {form.galleryUrls.length > 0 && (
        <div className="flex gap-1 p-2 overflow-x-auto border-b border-transparent">
          {form.galleryUrls.slice(0, 5).map((u) => (
            <div key={u} className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden ring-1 ring-black/10">
              <Image src={u} alt="" fill className="object-cover" unoptimized />
            </div>
          ))}
        </div>
      )}

      <div className="p-3 max-h-[280px] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className={cn("text-[11px] font-bold uppercase tracking-wide", subtext)}>Serviços</p>
          {services.length > 0 && (
            <span className={cn("text-[9px] tabular-nums", subtext)}>{services.length} ativo{services.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        {services.length === 0 ? (
          <p className={cn("text-[11px] leading-relaxed py-2", subtext)}>
            Nenhum serviço ativo. Cadastre em <span className={cn("font-semibold", text)}>Serviços</span> no menu para
            aparecer na página pública.
          </p>
        ) : (
          <div className="space-y-1.5">
            {shown.map((s) => (
              <div
                key={s.id}
                className={cn("flex items-center gap-2 p-2 rounded-xl border", cardBg)}
              >
                <div
                  className={cn(
                    "size-9 rounded-lg flex items-center justify-center text-base shrink-0",
                    form.darkPage ? "bg-[#213428]" : "bg-[#f3f4f6]"
                  )}
                >
                  {s.emoji ? (
                    <span className="leading-none">{s.emoji}</span>
                  ) : (
                    <span className="material-symbols-outlined text-[#6b7280] text-lg">category</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[11px] font-semibold truncate", text)}>{s.name}</p>
                  <p className={cn("text-[10px]", subtext)}>
                    {s.duration_minutes} min
                  </p>
                </div>
                <span className="text-[11px] font-bold shrink-0" style={{ color: form.primaryColor }}>
                  {formatCurrency(s.price_cents / 100)}
                </span>
              </div>
            ))}
            {restCount > 0 && (
              <p className={cn("text-[10px] text-center pt-1", subtext)}>+{restCount} na página pública</p>
            )}
          </div>
        )}
      </div>

      {form.floatingWhatsapp && (
        <div className="px-3 pb-3 flex justify-end">
          <div className="size-9 rounded-full flex items-center justify-center shadow-lg bg-[#25D366] ring-2 ring-black/10">
            <span className="material-symbols-outlined text-white text-lg">chat</span>
          </div>
        </div>
      )}
    </div>
  );
}

