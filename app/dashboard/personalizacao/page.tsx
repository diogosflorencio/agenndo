"use client";

import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from "react";
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
import {
  GALLERY_COMPRESS_MAX_LONG_EDGE,
  PUBLIC_GALLERY_MAX_IMAGES,
  normalizeGalleryUrlsFromDb,
} from "@/lib/public-gallery";
import { useAppAlert } from "@/components/app-alert-provider";
import { UnsavedChangesIndicator } from "@/components/dashboard-unsaved-indicator";
import { HotkeyHint, useRegisterDashboardHotkeys } from "@/lib/dashboard-hotkeys";
import { useRegisterDashboardUnsavedNavigation } from "@/lib/dashboard-navigation-guard";
import { useTheme } from "@/lib/theme-context";
import { PersonalizationShareQr } from "@/components/personalization-share-qr";
import { SocialBrandIcon, socialBrandAccent } from "@/components/social-brand-icon";
import {
  MAX_SOCIAL_LINKS,
  mergePersonalizationSocialLinks,
  SOCIAL_PLATFORM_OPTIONS,
  socialLinksForDb,
  formatSocialDisplay,
  socialProfileUrl,
  type SocialLink,
  type SocialPlatformId,
} from "@/lib/social-links";

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

/** Aceita #RGB ou #RRGGBB; devolve #RRGGBB normalizado ou null. */
function normalizePrimaryHex(input: string): string | null {
  let s = input.trim();
  if (!s.startsWith("#")) s = `#${s}`;
  const hex = s.slice(1).replace(/[^0-9a-fA-F]/g, "");
  if (hex.length === 3) {
    const [r, g, b] = hex.split("") as [string, string, string];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (hex.length === 6) return `#${hex.toUpperCase()}`;
  return null;
}

function primaryColorInputValue(hex: string): string {
  return normalizePrimaryHex(hex) ?? "#13EC5B";
}

type PreviewServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  emoji: string | null;
  image_url: string | null;
  description_public: string | null;
};

type PersonalizationRow = {
  id?: string;
  banner_url: string | null;
  gallery_urls: string[] | null;
  social_links?: unknown;
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_number: string | null;
  tagline: string | null;
  about: string | null;
  public_theme: string | null;
  show_whatsapp_fab: boolean | null;
  address_line: string | null;
};

function storageFileExt(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export default function PersonalizacaoPage() {
  const { showAlert } = useAppAlert();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
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
    socialLinks: [] as SocialLink[],
    whatsapp: "",
    address: "",
    floatingWhatsapp: true,
    darkPage: true,
    logoUrl: null as string | null,
    bannerUrl: null as string | null,
    galleryUrls: [] as string[],
  });

  const [primaryHexDraft, setPrimaryHexDraft] = useState(form.primaryColor);
  useEffect(() => {
    setPrimaryHexDraft(form.primaryColor);
  }, [form.primaryColor]);

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
        .select("id, name, duration_minutes, price_cents, emoji, image_url, description_public")
        .eq("business_id", business.id)
        .eq("active", true)
        .is("archived_at", null)
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
      socialLinks: mergePersonalizationSocialLinks(p?.social_links, p?.instagram_url ?? null, p?.facebook_url ?? null),
      whatsapp: formatBrazilPhoneFromDigits(business.phone ?? p?.whatsapp_number ?? ""),
      address: p?.address_line ?? "",
      floatingWhatsapp: p?.show_whatsapp_fab !== false,
      darkPage: (p?.public_theme ?? "dark") !== "light",
      logoUrl: business.logo_url ?? null,
      bannerUrl: p?.banner_url ?? null,
      galleryUrls: normalizeGalleryUrlsFromDb(p?.gallery_urls),
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

  const addSocialLinkRow = () => {
    setForm((f) => {
      const used = new Set(f.socialLinks.map((l) => l.platform));
      const nextPlatform = SOCIAL_PLATFORM_OPTIONS.find((o) => !used.has(o.id))?.id;
      if (!nextPlatform || f.socialLinks.length >= MAX_SOCIAL_LINKS) return f;
      return { ...f, socialLinks: [...f.socialLinks, { platform: nextPlatform, handle: "" }] };
    });
  };

  const removeSocialLinkRow = (index: number) => {
    setForm((f) => ({
      ...f,
      socialLinks: f.socialLinks.filter((_, i) => i !== index),
    }));
  };

  const persistGalleryUrls = useCallback(
    async (urls: string[], opts?: { skipRouterRefresh?: boolean }) => {
      if (!business?.id) return;
      const capped = urls.slice(0, PUBLIC_GALLERY_MAX_IMAGES);
      const supabase = createClient();
      const payload = {
        gallery_urls: capped.length ? capped : null,
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
          b.galleryUrls = capped;
          return JSON.stringify(b);
        } catch {
          return prev;
        }
      });
      if (!opts?.skipRouterRefresh) router.refresh();
    },
    [business?.id, router]
  );

  const mergeGalleryUrlsIntoBaseline = useCallback((urls: string[]) => {
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
  }, []);

  /** Igual ao logo/galeria: capa persiste na hora (evita “sumiu” ao recarregar sem clicar em Salvar). */
  const persistBannerUrl = useCallback(
    async (bannerUrl: string | null) => {
      if (!business?.id) return;
      const supabase = createClient();
      const payload = {
        banner_url: bannerUrl,
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
          b.bannerUrl = bannerUrl;
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
      if (form.logoUrl) {
        const relOld = tryRelativePathFromPublicUrl(form.logoUrl, business.id);
        if (relOld) {
          try {
            await removeBusinessObject(supabase, business.id, relOld);
          } catch {
            /* arquivo antigo pode já ter sido removido */
          }
        }
      }
      const url = await uploadBusinessImage(supabase, business.id, `logo/${crypto.randomUUID()}.${ext}`, prepared);
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
      if (form.bannerUrl) {
        const relOld = tryRelativePathFromPublicUrl(form.bannerUrl, business.id);
        if (relOld) {
          try {
            await removeBusinessObject(supabase, business.id, relOld);
          } catch {
            /* arquivo antigo pode já ter sido removido */
          }
        }
      }
      const url = await uploadBusinessImage(supabase, business.id, `banner/${crypto.randomUUID()}.${ext}`, prepared);
      await persistBannerUrl(url);
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
    const remaining = PUBLIC_GALLERY_MAX_IMAGES - form.galleryUrls.length;
    if (remaining <= 0) {
      showAlert(`Máximo de ${PUBLIC_GALLERY_MAX_IMAGES} fotos na galeria.`, { title: "Galeria" });
      return;
    }
    setUploading("gallery");
    const count = Math.min(files.length, remaining);
    try {
      const fd = new FormData();
      for (let i = 0; i < count; i++) {
        setUploadLabel(`Otimizando e enviando ${i + 1} de ${count}…`);
        const prepared = await compressImageForUpload(files[i], {
          maxLongEdge: GALLERY_COMPRESS_MAX_LONG_EDGE,
        });
        fd.append("files", prepared, prepared.name || `foto-${i + 1}.jpg`);
      }
      const res = await fetch("/api/dashboard/personalization/gallery", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string; urls?: string[] };
      if (!res.ok) throw new Error(data.error ?? "Falha no upload");
      const urls = data.urls ?? [];
      setForm((f) => ({ ...f, galleryUrls: urls }));
      mergeGalleryUrlsIntoBaseline(urls);
      router.refresh();
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
    try {
      const prepared = await compressImageForUpload(file, {
        maxLongEdge: GALLERY_COMPRESS_MAX_LONG_EDGE,
      });
      const fd = new FormData();
      fd.append("replaceIndex", String(index));
      fd.append("files", prepared, prepared.name || "foto.jpg");
      const res = await fetch("/api/dashboard/personalization/gallery", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string; urls?: string[] };
      if (!res.ok) throw new Error(data.error ?? "Falha ao substituir");
      const urls = data.urls ?? [];
      setForm((f) => ({ ...f, galleryUrls: urls }));
      mergeGalleryUrlsIntoBaseline(urls);
      router.refresh();
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
      await persistBannerUrl(null);
      const supabase = createClient();
      const rel = tryRelativePathFromPublicUrl(url, business.id);
      if (rel) {
        try {
          await removeBusinessObject(supabase, business.id, rel);
        } catch {
          /* arquivo pode já ter sido removido */
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

  const saveAll = async (): Promise<boolean> => {
    if (!business?.id || uploading !== null) return false;
    setSaving(true);
    setSaveMsg(null);
    const supabase = createClient();
    const phoneDigits = form.whatsapp.replace(/\D/g, "");

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
      return false;
    }

    const payload = {
      business_id: business.id,
      banner_url: form.bannerUrl,
      gallery_urls: form.galleryUrls.length
        ? form.galleryUrls.slice(0, PUBLIC_GALLERY_MAX_IMAGES)
        : null,
      social_links: socialLinksForDb(form.socialLinks),
      instagram_url: null,
      facebook_url: null,
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
        return false;
      }
    } else {
      const { data: ins, error } = await supabase.from("personalization").insert(payload).select("id").single();
      if (error) {
        setSaveMsg(error.message);
        setSaving(false);
        return false;
      }
      if (ins?.id) setPersId(ins.id as string);
    }

    setSaveMsg("Alterações salvas.");
    setFormBaseline(JSON.stringify(form));
    setSaving(false);
    router.refresh();
    setTimeout(() => setSaveMsg(null), 4000);
    return true;
  };

  const saveAllRef = useRef(saveAll);
  saveAllRef.current = saveAll;

  useRegisterDashboardHotkeys(!(saving || uploading !== null), "personalizacao-save", {
    save: () => void saveAllRef.current(),
  });

  const saveForNavigation = useCallback(async () => saveAllRef.current(), []);

  useRegisterDashboardUnsavedNavigation(formDirty, saveForNavigation, !loading && !!business);

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
          <h1 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>Personalização</h1>
          <UnsavedChangesIndicator dirty={formDirty} variant="inline" />
        </div>
        <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-gray-600")}>
          Aparência e conteúdo da página pública (salvos no banco e nos arquivos).
        </p>
        {loadError && <p className="text-red-600 text-sm mt-2">{loadError}</p>}
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
        <div className="order-1 min-w-0 lg:col-span-3">
          <div
            className={cn(
              "mb-5 flex gap-1 overflow-x-auto rounded-xl border p-1 shadow-sm [-webkit-overflow-scrolling:touch]",
              isDark ? "border-white/[0.08] bg-[#111318]" : "border-gray-200 bg-white"
            )}
          >
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
                  activeTab === tab.key
                    ? "bg-primary text-black"
                    : isDark
                      ? "text-gray-400 hover:bg-white/10 hover:text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <span className="material-symbols-outlined text-sm shrink-0">{tab.icon}</span>
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "aparencia" && (
            <div className="space-y-5">
              <div
                className={cn(
                  "rounded-xl border p-5 shadow-sm",
                  isDark ? "border-white/[0.08] bg-[#111318]" : "border-gray-200 bg-white"
                )}
              >
                <div className="mb-3">
                  <h3 className={cn("text-sm font-bold", isDark ? "text-white" : "text-gray-900")}>Cor principal</h3>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-gray-400" : "text-gray-500")}>
                    Presets compactos ou qualquer cor com o seletor ou o código hexadecimal.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {PALETTE.map((color) => {
                    const selected =
                      normalizePrimaryHex(form.primaryColor)?.toUpperCase() === color.value.toUpperCase();
                    return (
                      <button
                        key={color.value}
                        type="button"
                        aria-label={color.label}
                        title={color.label}
                        onClick={() => setForm({ ...form, primaryColor: color.value })}
                        className={cn(
                          "size-7 shrink-0 rounded-md shadow-sm ring-1 ring-black/10 transition-transform outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                          selected
                            ? cn(
                                "ring-2 ring-primary ring-offset-2 scale-105 z-[1]",
                                isDark ? "ring-offset-[#111318]" : "ring-offset-white"
                              )
                            : "hover:scale-110 active:scale-95"
                        )}
                        style={{ backgroundColor: color.value }}
                      />
                    );
                  })}
                </div>
                <div
                  className={cn(
                    "rounded-xl border p-3.5 shadow-inner",
                    isDark
                      ? "border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-black/20"
                      : "border-gray-200 bg-gradient-to-br from-gray-50/90 to-white"
                  )}
                >
                  <p className={cn("text-[11px] font-semibold uppercase tracking-wide mb-2.5", isDark ? "text-gray-400" : "text-gray-500")}>
                    Cor personalizada
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <span className={cn("text-[11px] font-medium", isDark ? "text-gray-400" : "text-gray-600")}>Seletor</span>
                      <label
                        className={cn(
                          "group relative flex size-11 cursor-pointer overflow-hidden rounded-xl border-2 shadow-sm transition-colors hover:border-primary/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25",
                          isDark ? "border-white/[0.12] bg-[#1a1f26]" : "border-gray-200 bg-white"
                        )}
                      >
                        <input
                          type="color"
                          value={primaryColorInputValue(form.primaryColor)}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, primaryColor: e.target.value.toUpperCase() }))
                          }
                          className={cn(
                            "h-11 w-11 cursor-pointer border-0 bg-transparent p-0",
                            "[&::-webkit-color-swatch-wrapper]:p-0",
                            "[&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0",
                            "[&::-moz-color-swatch]:rounded-lg [&::-moz-color-swatch]:border-0"
                          )}
                          aria-label="Abrir seletor de cor do sistema"
                        />
                      </label>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[12rem]">
                      <label htmlFor="primary-hex" className={cn("text-[11px] font-medium", isDark ? "text-gray-400" : "text-gray-600")}>
                        Hexadecimal
                      </label>
                      <input
                        id="primary-hex"
                        type="text"
                        spellCheck={false}
                        autoCapitalize="characters"
                        placeholder="#13EC5B"
                        value={primaryHexDraft}
                        onChange={(e) => setPrimaryHexDraft(e.target.value)}
                        onBlur={() => {
                          const n = normalizePrimaryHex(primaryHexDraft);
                          if (n) {
                            setForm((f) => ({ ...f, primaryColor: n }));
                            setPrimaryHexDraft(n);
                          } else {
                            setPrimaryHexDraft(form.primaryColor);
                          }
                        }}
                        className={cn(
                          "h-10 w-full rounded-lg border px-3 font-mono text-sm uppercase tracking-wide outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20",
                          isDark
                            ? "border-white/[0.1] bg-black/25 text-white placeholder:text-gray-500"
                            : "border-gray-200 bg-white text-gray-900"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Logo / Foto de perfil</h3>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="size-16 rounded-xl overflow-hidden border-2 shrink-0 bg-gray-50 flex items-center justify-center">
                    {form.logoUrl ? (
                      <Image key={form.logoUrl} src={form.logoUrl} alt="" width={64} height={64} className="size-16 object-cover" unoptimized />
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
                      <Image key={form.bannerUrl} src={form.bannerUrl} alt="" fill className="object-cover" unoptimized />
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
                { label: "Tagline / Slogan", key: "tagline" as const, placeholder: "Frase curta sobre o seu negócio" },
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
                  <span className="text-xs text-gray-500">
                    {form.galleryUrls.length}/{PUBLIC_GALLERY_MAX_IMAGES}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Fotos são comprimidas ao enviar e salvas automaticamente. Opcional: até{" "}
                  {PUBLIC_GALLERY_MAX_IMAGES} fotos na página pública (mosaico).
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
                  {form.galleryUrls.length < PUBLIC_GALLERY_MAX_IMAGES && (
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
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <label className="text-sm font-medium text-gray-700 block mb-1">Redes sociais</label>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Escolha a rede e informe o usuário ou página. Na página pública aparece o ícone da rede com esse texto.
                </p>
                <div className="space-y-3">
                  {form.socialLinks.map((link, index) => {
                    const platformOptions = SOCIAL_PLATFORM_OPTIONS.filter(
                      (opt) =>
                        opt.id === link.platform ||
                        !form.socialLinks.some((l, j) => j !== index && l.platform === opt.id)
                    );
                    const hint = SOCIAL_PLATFORM_OPTIONS.find((o) => o.id === link.platform)?.hint ?? "";
                    return (
                      <div
                        key={`${index}-${link.platform}`}
                        className="flex flex-wrap items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-gray-600 flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-gray-200">
                            <SocialBrandIcon platform={link.platform} size={20} className="text-gray-800" />
                          </span>
                          <select
                            value={link.platform}
                            disabled={saving}
                            onChange={(e) => {
                              const platform = e.target.value as SocialPlatformId;
                              setForm((f) => ({
                                ...f,
                                socialLinks: f.socialLinks.map((l, i) => (i === index ? { ...l, platform } : l)),
                              }));
                            }}
                            className="h-11 text-sm font-medium bg-white border border-gray-200 rounded-xl px-3 pr-8 outline-none focus:border-primary text-gray-900 max-w-[140px]"
                          >
                            {platformOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          value={link.handle}
                          disabled={saving}
                          onChange={(e) => {
                            const handle = e.target.value;
                            setForm((f) => ({
                              ...f,
                              socialLinks: f.socialLinks.map((l, i) => (i === index ? { ...l, handle } : l)),
                            }));
                          }}
                          placeholder={hint}
                          className="flex-1 min-w-[160px] h-11 bg-white border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
                        />
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => removeSocialLinkRow(index)}
                          className="h-11 px-3 rounded-xl border border-gray-200 bg-white text-red-600 text-xs font-bold hover:bg-red-50 transition-colors shrink-0"
                          title="Remover"
                        >
                          Remover
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={
                    saving ||
                    form.socialLinks.length >= MAX_SOCIAL_LINKS ||
                    SOCIAL_PLATFORM_OPTIONS.every((o) => form.socialLinks.some((l) => l.platform === o.id))
                  }
                  onClick={addSocialLinkRow}
                  className="mt-3 w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold border border-dashed border-gray-300 text-gray-700 hover:border-primary/50 hover:bg-primary/5 disabled:opacity-45 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  Adicionar rede ({form.socialLinks.length}/{MAX_SOCIAL_LINKS})
                </button>
              </div>

              {[
                { label: "WhatsApp", key: "whatsapp" as const, icon: "chat", placeholder: "(11) 99999-9999" },
                { label: "Endereço", key: "address" as const, icon: "location_on", placeholder: "Rua, número, Cidade/UF" },
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
              "relative mt-3 flex w-full items-center justify-center gap-3 px-4 py-4 text-black shadow-[0_0_15px_rgba(19,236,91,0.2)] transition-all bg-primary hover:bg-primary/90 disabled:opacity-60 font-bold rounded-xl lg:pr-[4.75rem]",
              formDirty && "ring-2 ring-amber-500/45"
            )}
          >
            <span className="flex min-w-0 flex-1 items-center justify-center gap-2">
              <span className="material-symbols-outlined shrink-0 text-base">save</span>
              {saving ? "Salvando…" : "Salvar alterações"}
            </span>
            {!(saving || uploading !== null) ? (
              <HotkeyHint action="save" variant="primary" layout="floating-end" />
            ) : null}
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
              <PagePreview form={form} services={previewServices} segment={business.segment ?? null} />
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
  socialLinks: SocialLink[];
  address: string;
  floatingWhatsapp: boolean;
  darkPage: boolean;
  logoUrl: string | null;
  bannerUrl: string | null;
  galleryUrls: string[];
};

const PREVIEW_MAX_SERVICES = 8;

function PagePreview({
  form,
  services,
  segment,
}: {
  form: PreviewForm;
  services: PreviewServiceRow[];
  segment: string | null;
}) {
  const accent = form.primaryColor;
  const isDark = form.darkPage;
  /** Modo claro: cores em formato arbitrário para não serem sobrescritas por `[data-theme="dark"] .text-gray-*` / `.bg-white` do painel. */
  const titleCls = isDark ? "text-white" : "text-[#111827]";
  const subCls = isDark ? "text-gray-400" : "text-[#4b5563]";
  const mutedCls = isDark ? "text-gray-500" : "text-[#6b7280]";
  const cardCls = isDark ? "bg-[#14221A] border-[#213428]" : "bg-[#ffffff] border-[#e5e7eb]";
  const cardHover = isDark ? "hover:border-white/25" : "hover:border-[#d1d5db]";
  const avatarBorder = isDark ? "border-[#020403]" : "border-[#f9fafb]";
  const floatBtn =
    "text-[9px] font-semibold px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md text-white border border-white/25 shadow-md";

  const hasBanner = Boolean(form.bannerUrl);
  const shown = services.slice(0, PREVIEW_MAX_SERVICES);
  const restCount = Math.max(0, services.length - shown.length);

  return (
    <div
      data-public-preview-theme={isDark ? "dark" : "light"}
      className={cn(
        "relative flex max-h-[min(78vh,860px)] flex-col overflow-hidden overflow-y-auto overscroll-contain rounded-2xl border shadow-[0_16px_48px_-12px_rgba(0,0,0,0.35)]",
        isDark ? "border-white/10 bg-[#020403]" : "border-[#e5e7eb] bg-[#f9fafb]"
      )}
      style={{ ["--public-accent"]: accent } as CSSProperties}
    >
      <div
        className={cn("pointer-events-none absolute inset-0", isDark ? "opacity-[0.12]" : "opacity-[0.06]")}
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% -20%, ${accent}, transparent)`,
        }}
      />

      <div className="relative z-[2] shrink-0">
        <div className="relative w-full overflow-visible">
          <div
            className={cn(
              "relative isolate h-[118px] w-full overflow-hidden rounded-t-2xl sm:h-[132px]",
              isDark ? "ring-1 ring-white/[0.1]" : "ring-1 ring-black/[0.07]"
            )}
          >
            {hasBanner && form.bannerUrl ? (
              <Image
                key={form.bannerUrl}
                src={form.bannerUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 480px"
                unoptimized
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(145deg, ${accent}35 0%, ${isDark ? "#0a120e" : "#e8f5ef"} 55%, ${isDark ? "#020403" : "#f3f4f6"} 100%)`,
                }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/30 via-black/5 to-transparent" />
            <div className="absolute right-2 top-2 z-[6] flex gap-1.5">
              <span className={floatBtn}>Entrar</span>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[15]">
            <div className="relative mx-auto h-0 w-full px-3">
              <div
                className={cn(
                  "pointer-events-auto absolute bottom-0 left-1 translate-y-1/2 overflow-hidden rounded-2xl border-[3px] shadow-xl",
                  "flex size-[3.75rem] items-center justify-center text-xl font-bold text-black",
                  avatarBorder
                )}
                style={{
                  backgroundColor: form.logoUrl ? undefined : accent,
                  boxShadow: `0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.12)`,
                }}
              >
                {form.logoUrl ? (
                  <Image key={form.logoUrl} src={form.logoUrl} alt="" width={60} height={60} className="size-full object-cover" unoptimized />
                ) : (
                  form.businessName[0]?.toUpperCase() ?? "?"
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="relative z-[5] flex-1 space-y-5 px-3 pb-16 pt-10">
        <section>
          <div className="flex flex-col gap-3">
            <div className="min-w-0 space-y-1.5">
              <h1 className={cn("text-[17px] font-extrabold leading-tight tracking-tight sm:text-lg", titleCls)}>
                {form.businessName}
              </h1>
              {form.tagline?.trim() ? (
                <p className={cn("text-[11px] font-medium leading-relaxed sm:text-xs", subCls)}>{form.tagline.trim()}</p>
              ) : null}
              {segment ? (
                <p
                  className={cn(
                    "inline-flex items-center rounded-lg px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                    isDark ? "bg-white/10 text-gray-300" : "bg-[rgb(229_231_235/0.88)] text-[#374151]"
                  )}
                >
                  {segment}
                </p>
              ) : null}
            </div>

            {form.address?.trim() ? (
              <div className={cn("flex items-start gap-1 text-[10px]", mutedCls)}>
                <span className="material-symbols-outlined shrink-0 text-sm leading-none">location_on</span>
                <span className="leading-snug">{form.address.trim()}</span>
              </div>
            ) : null}

            {form.socialLinks.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {form.socialLinks.map((link, i) => {
                  const href = socialProfileUrl(link);
                  if (!href) return null;
                  const iconColor =
                    isDark && (link.platform === "x" || link.platform === "tiktok") ? "#f3f4f6" : socialBrandAccent(link.platform);
                  return (
                    <span
                      key={`${link.platform}-${i}`}
                      className={cn(
                        "inline-flex max-w-full items-center gap-1.5 rounded-xl border px-2 py-1.5 text-[10px] font-semibold",
                        isDark ? "border-white/15 bg-white/[0.04]" : "border-[#e5e7eb] bg-[#ffffff]"
                      )}
                    >
                      <SocialBrandIcon platform={link.platform} size={14} className="shrink-0" style={{ color: iconColor }} />
                      <span className={cn("truncate", isDark ? "text-gray-200" : "text-[#1f2937]")}>{formatSocialDisplay(link)}</span>
                    </span>
                  );
                })}
              </div>
            ) : null}

            <div>
              <button
                type="button"
                className={cn(
                  "w-full rounded-xl px-4 py-3 text-xs font-bold text-black shadow-lg transition-transform",
                  "hover:scale-[1.02] active:scale-[0.98]"
                )}
                style={{ backgroundColor: accent, boxShadow: `0 0 24px ${accent}55` }}
              >
                Novo agendamento
              </button>
              <p className={cn("mt-1.5 text-[9px] leading-relaxed", mutedCls)}>
                Escolha serviço, profissional, data e horário
              </p>
            </div>
          </div>
        </section>

        {form.about?.trim() ? (
          <section>
            <h2 className={cn("mb-2 text-[11px] font-bold uppercase tracking-wider", subCls)}>Sobre</h2>
            <p className={cn("rounded-xl border p-3 text-[11px] leading-relaxed", cardCls, mutedCls)}>{form.about.trim()}</p>
          </section>
        ) : null}

        <section>
          <h2 className={cn("mb-3 text-[11px] font-bold uppercase tracking-wider", subCls)}>Serviços</h2>
          {services.length === 0 ? (
            <p className={cn("text-[11px] leading-relaxed", mutedCls)}>
              Nenhum serviço disponível no momento. Cadastre em{" "}
              <span className={cn("font-semibold", titleCls)}>Serviços</span> no menu.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {shown.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                    cardCls,
                    cardHover
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/5 text-xl",
                      isDark ? "bg-[#213428]" : "bg-[#f3f4f6]"
                    )}
                  >
                    {s.image_url ? (
                      <Image src={s.image_url} alt="" width={40} height={40} className="size-full object-cover" unoptimized />
                    ) : s.emoji ? (
                      <span className="leading-none">{s.emoji}</span>
                    ) : (
                      <span className="material-symbols-outlined text-[#6b7280] text-[22px]">category</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[12px] font-semibold leading-tight line-clamp-2", titleCls)}>{s.name}</p>
                    <p className={cn("mt-0.5 text-[10px]", subCls)}>
                      {s.duration_minutes} min · {formatCurrency(s.price_cents / 100)}
                    </p>
                    {s.description_public?.trim() ? (
                      <p className={cn("mt-1 line-clamp-2 text-[10px] leading-snug", mutedCls)}>{s.description_public.trim()}</p>
                    ) : null}
                  </div>
                  <span className="material-symbols-outlined shrink-0 text-base text-[#6b7280]">calendar_add_on</span>
                </div>
              ))}
              {restCount > 0 ? (
                <p className={cn("pt-1 text-center text-[10px]", mutedCls)}>+{restCount} na página pública</p>
              ) : null}
            </div>
          )}
        </section>

        {form.galleryUrls.length > 0 ? (
          <section className="pb-2">
            <h2 className={cn("mb-3 text-[11px] font-bold uppercase tracking-wider", subCls)}>Galeria</h2>
            <div className="columns-2 gap-x-2 [column-fill:_balance]">
              {form.galleryUrls.slice(0, PUBLIC_GALLERY_MAX_IMAGES).map((src, gi) => (
                <div key={`${gi}-${src.slice(-40)}`} className="mb-2 break-inside-avoid">
                  {/* eslint-disable-next-line @next/next/no-img-element -- mosaico fluido como na página pública */}
                  <img
                    src={src}
                    alt=""
                    className={cn(
                      "block w-full rounded-xl border",
                      isDark ? "border-white/10" : "border-[rgb(229_231_235/0.85)]"
                    )}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      {form.floatingWhatsapp ? (
        <div className="pointer-events-none sticky bottom-0 z-20 flex justify-end px-3 pb-3 pt-1">
          <div className="pointer-events-auto flex size-11 items-center justify-center rounded-full bg-[#25D366] shadow-xl ring-2 ring-black/10">
            <span className="material-symbols-outlined text-lg text-white">chat</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

