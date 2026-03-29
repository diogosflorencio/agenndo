"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";
import {
  uploadBusinessImage,
  tryRelativePathFromPublicUrl,
  removeBusinessObject,
} from "@/lib/business-assets-storage";

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

export default function PersonalizacaoPage() {
  const router = useRouter();
  const { business } = useDashboard();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  const [activeTab, setActiveTab] = useState<"aparencia" | "conteudo" | "contato" | "compartilhar">("aparencia");
  const [copied, setCopied] = useState(false);
  const [previewServices, setPreviewServices] = useState<PreviewServiceRow[]>([]);

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

    setForm({
      businessName: business.name ?? "",
      tagline: p?.tagline ?? "",
      primaryColor: business.primary_color ?? "#13EC5B",
      about: p?.about ?? "",
      instagram: displayInstagram(p?.instagram_url ?? null),
      facebook: p?.facebook_url?.replace(/^https?:\/\/(www\.)?facebook\.com\//i, "") ?? "",
      whatsapp: business.phone ?? p?.whatsapp_number ?? "",
      address: p?.address_line ?? "",
      floatingWhatsapp: p?.show_whatsapp_fab !== false,
      darkPage: (p?.public_theme ?? "dark") !== "light",
      logoUrl: business.logo_url ?? null,
      bannerUrl: p?.banner_url ?? null,
      galleryUrls: Array.isArray(p?.gallery_urls) ? [...p.gallery_urls] : [],
    });
    setLoading(false);
  }, [business]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
    if (!file || !business?.id) return;
    setUploading("logo");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase();
      const safe = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "") ? ext! : "jpg";
      const url = await uploadBusinessImage(supabase, business.id, `logo.${safe}`, file);
      const { error } = await supabase.from("businesses").update({ logo_url: url }).eq("id", business.id);
      if (error) throw new Error(error.message);
      setForm((f) => ({ ...f, logoUrl: url }));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(null);
    }
  };

  const onPickBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !business?.id) return;
    setUploading("banner");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase();
      const safe = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "") ? ext! : "jpg";
      const url = await uploadBusinessImage(supabase, business.id, `banner.${safe}`, file);
      setForm((f) => ({ ...f, bannerUrl: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(null);
    }
  };

  const onPickGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length || !business?.id) return;
    const remaining = 8 - form.galleryUrls.length;
    if (remaining <= 0) {
      alert("Máximo de 8 fotos na galeria.");
      return;
    }
    setUploading("gallery");
    const supabase = createClient();
    const next = [...form.galleryUrls];
    try {
      for (let i = 0; i < Math.min(files.length, remaining); i++) {
        const file = files[i];
        const ext = file.name.split(".").pop()?.toLowerCase();
        const safe = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "") ? ext! : "jpg";
        const name = `gallery/${crypto.randomUUID()}.${safe}`;
        const url = await uploadBusinessImage(supabase, business.id, name, file);
        next.push(url);
      }
      setForm((f) => ({ ...f, galleryUrls: next }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(null);
    }
  };

  const removeGalleryAt = async (index: number) => {
    if (!business?.id) return;
    const url = form.galleryUrls[index];
    const supabase = createClient();
    const rel = tryRelativePathFromPublicUrl(url, business.id);
    if (rel) {
      try {
        await removeBusinessObject(supabase, business.id, rel);
      } catch {
        /* continua removendo da lista */
      }
    }
    setForm((f) => ({
      ...f,
      galleryUrls: f.galleryUrls.filter((_, i) => i !== index),
    }));
  };

  const saveAll = async () => {
    if (!business?.id) return;
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
        <h1 className="text-2xl font-bold text-gray-900">Personalização</h1>
        <p className="text-gray-600 text-sm mt-1">Aparência e conteúdo da página pública — salvos no banco e nos arquivos.</p>
        {loadError && <p className="text-red-600 text-sm mt-2">{loadError}</p>}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl mb-5 shadow-sm">
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
                  "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all",
                  activeTab === tab.key ? "bg-primary text-black" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                <span className="material-symbols-outlined text-sm hidden sm:block">{tab.icon}</span>
                <span className="hidden sm:block">{tab.label}</span>
                <span className="sm:hidden">{tab.label.slice(0, 3)}</span>
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
                <div className="flex items-center gap-4">
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
                  <div>
                    <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPickLogo} />
                    <button
                      type="button"
                      disabled={uploading === "logo"}
                      onClick={() => logoInputRef.current?.click()}
                      className="px-4 py-2 bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">upload</span>
                      {uploading === "logo" ? "Enviando…" : "Upload logo"}
                    </button>
                    <p className="text-xs text-gray-500 mt-1.5">PNG, JPG ou WebP até 5 MB.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Foto de capa</h3>
                <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPickBanner} />
                <button
                  type="button"
                  disabled={uploading === "banner"}
                  onClick={() => bannerInputRef.current?.click()}
                  className="relative w-full h-28 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary/40 overflow-hidden group"
                >
                  {form.bannerUrl ? (
                    <Image src={form.bannerUrl} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
                      <span className="material-symbols-outlined text-gray-500 group-hover:text-primary text-3xl">add_photo_alternate</span>
                      <p className="text-xs text-gray-500 mt-1">Clique para enviar capa</p>
                    </div>
                  )}
                </button>
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
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, darkPage: !form.darkPage })}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        form.darkPage ? "bg-primary" : "bg-gray-200"
                      )}
                    >
                      <span
                        className="inline-block size-4 rounded-full bg-white transition-transform shadow"
                        style={{ transform: form.darkPage ? "translateX(18px)" : "translateX(2px)" }}
                      />
                    </button>
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
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={onPickGallery}
                />
                <div className="grid grid-cols-4 gap-2">
                  {form.galleryUrls.map((url, i) => (
                    <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                      <Image src={url} alt="" fill className="object-cover" unoptimized />
                      <button
                        type="button"
                        onClick={() => void removeGalleryAt(i)}
                        className="absolute top-1 right-1 size-7 rounded-lg bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {form.galleryUrls.length < 8 && (
                    <button
                      type="button"
                      disabled={uploading === "gallery"}
                      onClick={() => galleryInputRef.current?.click()}
                      className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-200 hover:border-primary/40 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-gray-500 text-xl">
                        {uploading === "gallery" ? "progress_activity" : "add"}
                      </span>
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
                      type="text"
                      value={form[field.key]}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
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
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, floatingWhatsapp: !form.floatingWhatsapp })}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      form.floatingWhatsapp ? "bg-primary" : "bg-gray-200"
                    )}
                  >
                    <span
                      className="inline-block size-4 rounded-full bg-white transition-transform shadow"
                      style={{ transform: form.floatingWhatsapp ? "translateX(18px)" : "translateX(2px)" }}
                    />
                  </button>
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

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">QR Code</h3>
                <div className="flex items-start gap-4">
                  <div
                    className="size-32 rounded-xl flex-shrink-0 flex items-center justify-center border-2"
                    style={{ borderColor: form.primaryColor + "40", backgroundColor: form.primaryColor + "10" }}
                  >
                    <QRCodePlaceholder color={form.primaryColor} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Gere na página de QR Code a partir do slug do seu negócio.
                    </p>
                    <a
                      href="/dashboard/qrcode"
                      className="w-full py-2.5 bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">qr_code_2</span>
                      Gerar e imprimir QR Code
                    </a>
                  </div>
                </div>
              </div>

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
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveAll()}
            className="w-full mt-5 py-4 bg-primary hover:bg-primary/90 disabled:opacity-60 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)] flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">save</span>
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>

        <div className="hidden lg:block lg:col-span-2">
          <div className="sticky top-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Preview da página pública</p>
            <PagePreview form={form} services={previewServices} />
          </div>
        </div>
      </div>
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
  const bg = form.darkPage ? "bg-[#020403]" : "bg-gray-50";
  const cardBg = form.darkPage ? "bg-[#14221A] border-[#213428]" : "bg-white border-gray-200";
  const cardBgSoft = form.darkPage ? "bg-[#0f1c15] border-white/5" : "bg-gray-50 border-gray-200";
  const text = form.darkPage ? "text-white" : "text-gray-900";
  const subtext = form.darkPage ? "text-gray-400" : "text-gray-500";
  const avatarBorder = form.darkPage ? "border-[#020403]" : "border-gray-50";
  const shown = services.slice(0, PREVIEW_MAX_SERVICES);
  const restCount = Math.max(0, services.length - shown.length);

  return (
    <div
      className={cn(
        "rounded-2xl border shadow-[0_12px_40px_-8px_rgba(0,0,0,0.25)] overflow-visible",
        form.darkPage ? "border-white/10" : "border-gray-200",
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
                    form.darkPage ? "bg-[#213428]" : "bg-gray-100"
                  )}
                >
                  {s.emoji ? (
                    <span className="leading-none">{s.emoji}</span>
                  ) : (
                    <span className="material-symbols-outlined text-gray-500 text-lg">category</span>
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

function QRCodePlaceholder({ color }: { color: string }) {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <rect x="4" y="4" width="24" height="24" rx="3" fill={color} opacity="0.3" />
      <rect x="8" y="8" width="16" height="16" rx="2" fill={color} opacity="0.5" />
      <rect x="12" y="12" width="8" height="8" rx="1" fill={color} />
      <rect x="52" y="4" width="24" height="24" rx="3" fill={color} opacity="0.3" />
      <rect x="56" y="8" width="16" height="16" rx="2" fill={color} opacity="0.5" />
      <rect x="60" y="12" width="8" height="8" rx="1" fill={color} />
      <rect x="4" y="52" width="24" height="24" rx="3" fill={color} opacity="0.3" />
      <rect x="8" y="56" width="16" height="16" rx="2" fill={color} opacity="0.5" />
      <rect x="12" y="60" width="8" height="8" rx="1" fill={color} />
      <rect x="34" y="4" width="4" height="4" rx="1" fill={color} opacity="0.8" />
      <rect x="42" y="4" width="4" height="4" rx="1" fill={color} opacity="0.6" />
      <rect x="34" y="34" width="4" height="4" rx="1" fill={color} opacity="0.9" />
      <rect x="40" y="34" width="4" height="4" rx="1" fill={color} opacity="0.5" />
      <rect x="46" y="34" width="4" height="4" rx="1" fill={color} opacity="0.7" />
    </svg>
  );
}
