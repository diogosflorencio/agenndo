"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { SwitchToggle } from "@/components/switch-toggle";
import { EntityPhotoControl } from "@/components/dashboard/entity-photo-control";
import { compressImageForUpload } from "@/lib/image-compress";
import { uploadBusinessImage } from "@/lib/business-assets-storage";
import { formatCurrency } from "@/lib/utils";
import { ServiceVariantGalleryEditor } from "@/components/dashboard/service-variant-gallery-editor";
import {
  DashboardFullScreenOverlay,
  useFullScreenOverlayRequestClose,
} from "@/components/dashboard/dashboard-full-screen-overlay";
import { useAppAlert } from "@/components/app-alert-provider";
import { HotkeyHint, useRegisterDashboardHotkeys } from "@/lib/dashboard-hotkeys";
import {
  emptyVariantSlot,
  normalizeVariantGallery,
  type ServiceVariantItem,
} from "@/lib/service-variants";

type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  emoji: string | null;
  image_url: string | null;
  description_public: string | null;
  variant_gallery: unknown;
  active: boolean;
  archived_at: string | null;
  collaborator_services: {
    collaborator_id: string;
    collaborators: { id: string; name: string; color: string | null; avatar_url: string | null } | null;
  }[];
};

type CollaboratorOption = { id: string; name: string; color: string | null; avatar_url: string | null };

export default function ServicosPage() {
  const { business } = useDashboard();
  const { showConfirm } = useAppAlert();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [archivedServices, setArchivedServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState<ServiceRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const selectServices =
    "id, name, duration_minutes, price_cents, emoji, image_url, description_public, variant_gallery, active, archived_at, collaborator_services(collaborator_id, collaborators(id, name, color, avatar_url))";

  const load = useCallback(() => {
    if (!business?.id) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("services").select(selectServices).eq("business_id", business.id).is("archived_at", null).order("name"),
      supabase.from("services").select(selectServices).eq("business_id", business.id).not("archived_at", "is", null).order("name"),
    ]).then(([activeRes, archRes]) => {
      if (activeRes.error) {
        setListError(activeRes.error.message);
        return;
      }
      if (archRes.error) {
        setListError(archRes.error.message);
        return;
      }
      setListError(null);
      setServices((activeRes.data as unknown as ServiceRow[]) ?? []);
      setArchivedServices((archRes.data as unknown as ServiceRow[]) ?? []);
    });
  }, [business?.id]);

  useEffect(() => {
    if (!business?.id) return;
    load();
    setLoading(false);
  }, [business?.id, load]);

  useRegisterDashboardHotkeys(!showModal && !!business?.id, "servicos-novo", {
    novo: () => {
      setEditService(null);
      setShowModal(true);
    },
  });

  const toggleActive = async (s: ServiceRow) => {
    if (s.archived_at) return;
    setListError(null);
    setBusyId(s.id);
    const supabase = createClient();
    const { error } = await supabase.from("services").update({ active: !s.active }).eq("id", s.id);
    setBusyId(null);
    if (error) {
      setListError(error.message);
      return;
    }
    load();
  };

  const duplicateService = async (s: ServiceRow) => {
    if (!business?.id) return;
    setListError(null);
    setBusyId(s.id);
    const supabase = createClient();
    const collabIds = (s.collaborator_services ?? [])
      .map((cs) => cs.collaborator_id || cs.collaborators?.id)
      .filter((id): id is string => Boolean(id));

    const { data: inserted, error: insErr } = await supabase
      .from("services")
      .insert({
        business_id: business.id,
        name: `${s.name} (cópia)`,
        duration_minutes: s.duration_minutes,
        price_cents: s.price_cents,
        emoji: s.emoji,
        active: s.active,
        description_public: s.description_public,
        variant_gallery: s.variant_gallery ?? [],
        image_url: s.image_url,
        archived_at: null,
      })
      .select("id")
      .single();

    if (insErr || !inserted?.id) {
      setBusyId(null);
      setListError(insErr?.message ?? "Não foi possível duplicar o serviço.");
      return;
    }

    const newId = inserted.id as string;

    if (collabIds.length > 0) {
      const links = collabIds.map((collaborator_id) => ({ collaborator_id, service_id: newId }));
      const { error: linkErr } = await supabase.from("collaborator_services").insert(links);
      if (linkErr) {
        setBusyId(null);
        setListError(`${linkErr.message} O serviço foi criado; vincule os profissionais manualmente se precisar.`);
        load();
        return;
      }
    }

    setBusyId(null);
    load();
  };

  const archiveService = async (s: ServiceRow) => {
    const ok = await showConfirm({
      title: "Arquivar este serviço?",
      message:
        "Ele deixa de aparecer na página pública e na lista de serviços ativos. Os agendamentos já feitos continuam no histórico (o registro não é apagado por causa desses vínculos).",
      confirmLabel: "Arquivar",
      variant: "danger",
    });
    if (!ok) return;
    setListError(null);
    setBusyId(s.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("services")
      .update({ archived_at: new Date().toISOString(), active: false })
      .eq("id", s.id);
    setBusyId(null);
    if (error) {
      setListError(error.message);
      return;
    }
    load();
  };

  const restoreService = async (s: ServiceRow) => {
    setListError(null);
    setBusyId(s.id);
    const supabase = createClient();
    const { error } = await supabase.from("services").update({ archived_at: null }).eq("id", s.id);
    setBusyId(null);
    if (error) {
      setListError(error.message);
      return;
    }
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {listError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {listError}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
          <p className="text-gray-400 text-sm mt-1">
            {services.length} ativo{services.length !== 1 ? "s" : ""}
            {archivedServices.length > 0
              ? ` · ${archivedServices.length} arquivado${archivedServices.length !== 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditService(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)]"
        >
          <span className="material-symbols-outlined shrink-0 text-base">add</span>
          <span className="min-w-0 flex-1 text-left">Novo serviço</span>
          <HotkeyHint action="novo" variant="primary" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map((service) => {
          const collabs = (service.collaborator_services ?? [])
            .map((cs) => cs.collaborators)
            .filter(Boolean) as CollaboratorOption[];
          const anyProf = collabs.length === 0;
          return (
            <div key={service.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-all group flex flex-col min-h-0">
              <div className="p-3.5 flex-1">
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-9 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center text-lg shrink-0 border border-gray-200/80">
                      {service.image_url ? (
                        <Image src={service.image_url} alt="" width={36} height={36} className="size-full object-cover" unoptimized />
                      ) : service.emoji ? (
                        <span className="leading-none select-none" aria-hidden>
                          {service.emoji}
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-gray-400 text-[22px]" aria-hidden>
                          category
                        </span>
                      )}
                    </div>
                    <h3 className="text-gray-900 font-bold text-sm leading-tight truncate">{service.name}</h3>
                  </div>
                  <div className={`shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${service.active ? "bg-primary/10 text-primary" : "bg-gray-500/10 text-gray-500"}`}>
                    <span className={`size-1 rounded-full ${service.active ? "bg-primary" : "bg-gray-500"}`} />
                    {service.active ? "Ativo" : "Off"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2.5 text-[11px]">
                  <div className="flex items-center gap-1 text-gray-500">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {service.duration_minutes}min
                  </div>
                  <div className="flex items-center gap-1 text-primary font-bold">
                    <span className="material-symbols-outlined text-[14px]">attach_money</span>
                    {formatCurrency(service.price_cents / 100)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 min-h-[22px]">
                  <div className="flex -space-x-1">
                    {(anyProf ? [{ id: "all", name: "Todos", color: null, avatar_url: null }] : collabs).slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="size-5 rounded-full border border-white overflow-hidden flex items-center justify-center text-[8px] font-bold text-gray-900 shrink-0"
                        style={{ backgroundColor: c.avatar_url ? undefined : c.color ?? "#94a3b8" }}
                        title={anyProf ? "Qualquer profissional" : c.name}
                      >
                        {anyProf ? (
                          "∗"
                        ) : c.avatar_url ? (
                          <Image src={c.avatar_url} alt="" width={20} height={20} className="size-full object-cover" unoptimized />
                        ) : (
                          c.name[0]
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500 line-clamp-2 leading-tight">
                    {anyProf ? "Todos os profissionais" : collabs.map((c) => c.name.split(" ")[0]).join(", ")}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-px bg-gray-100 border-t border-gray-200 mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    setEditService(service);
                    setShowModal(true);
                  }}
                  className="bg-white hover:bg-gray-50 text-[10px] font-semibold text-gray-600 py-2 transition-colors flex items-center justify-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                  Editar
                </button>
                <button
                  type="button"
                  disabled={busyId === service.id}
                  onClick={() => void duplicateService(service)}
                  className="bg-white hover:bg-gray-50 disabled:opacity-50 text-[10px] font-semibold text-gray-600 py-2 transition-colors flex items-center justify-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  Dup.
                </button>
                <button
                  type="button"
                  disabled={busyId === service.id}
                  onClick={() => void toggleActive(service)}
                  className="bg-white hover:bg-gray-50 disabled:opacity-50 text-[10px] font-semibold text-gray-600 py-2 transition-colors flex items-center justify-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[14px]">{service.active ? "visibility_off" : "visibility"}</span>
                  {service.active ? "Off" : "On"}
                </button>
              </div>
              <button
                type="button"
                disabled={busyId === service.id}
                onClick={() => void archiveService(service)}
                className="w-full bg-white hover:bg-red-50 disabled:opacity-50 text-[10px] font-semibold text-red-600 py-2.5 border-t border-gray-200 transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                Arquivar
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setEditService(null);
            setShowModal(true);
          }}
          className="flex flex-col items-center justify-center gap-2 p-6 bg-white border border-dashed border-gray-200 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group min-h-[140px]"
        >
          <div className="size-10 rounded-lg bg-gray-100 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-gray-500 group-hover:text-primary text-xl transition-colors">add</span>
          </div>
          <p className="text-gray-500 group-hover:text-primary text-xs font-semibold transition-colors">Adicionar serviço</p>
        </button>
      </div>

      {archivedServices.length > 0 && (
        <div className="mt-10 pt-8 border-t border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Arquivados</h2>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Serviços que você removeu da oferta. Continuam no banco para manter o histórico de agendamentos; não aparecem na
            página pública. Você pode restaurar quando quiser.
          </p>
          <div className="space-y-2">
            {archivedServices.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {s.duration_minutes} min · {formatCurrency(s.price_cents / 100)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === s.id}
                  onClick={() => void restoreService(s)}
                  className="shrink-0 text-xs font-bold px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-primary/10 hover:border-primary/40 text-gray-800 disabled:opacity-50 transition-colors"
                >
                  Restaurar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <ServiceModal
          key={editService?.id ?? "new-service"}
          businessId={business!.id}
          service={editService}
          refreshList={load}
          onClose={() => setShowModal(false)}
          onSaved={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function extFromFile(f: File): string {
  if (f.type === "image/png") return "png";
  if (f.type === "image/webp") return "webp";
  if (f.type === "image/gif") return "gif";
  return "jpg";
}

function padVariantSlots(raw: unknown): ServiceVariantItem[] {
  const n = normalizeVariantGallery(raw);
  const p = [...n];
  while (p.length < 3) p.push(emptyVariantSlot());
  return p.slice(0, 3);
}

function ServiceModalFooterActions({
  saving,
  canSubmit,
  isEdit,
  onSaveClick,
}: {
  saving: boolean;
  canSubmit: boolean;
  isEdit: boolean;
  onSaveClick: () => void;
}) {
  const requestClose = useFullScreenOverlayRequestClose();
  return (
    <>
      <button
        type="button"
        disabled={saving}
        onClick={() => void requestClose()}
        className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 pr-4 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50 sm:w-auto sm:min-w-[160px] lg:pr-[4.75rem]"
      >
        <span className="flex min-w-0 flex-1 justify-center">Cancelar</span>
        <HotkeyHint action="cancel" layout="floating-end" />
      </button>
      <button
        type="button"
        onClick={onSaveClick}
        disabled={saving || !canSubmit}
        className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 pr-4 text-sm font-bold text-black transition-colors hover:bg-primary/90 disabled:opacity-50 sm:min-w-[220px] sm:w-auto lg:pr-[4.75rem]"
      >
        <span className="flex min-w-0 flex-1 justify-center">
          {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar serviço"}
        </span>
        {!saving ? <HotkeyHint action="save" variant="primary" layout="floating-end" /> : null}
      </button>
    </>
  );
}

function ServiceModal({
  businessId,
  service,
  refreshList,
  onClose,
  onSaved,
}: {
  businessId: string;
  service: ServiceRow | null;
  refreshList: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showAlert } = useAppAlert();
  const initialLinked = (service?.collaborator_services ?? [])
    .map((cs) => cs.collaborator_id || cs.collaborators?.id)
    .filter((id): id is string => Boolean(id));

  const [form, setForm] = useState({
    name: service?.name ?? "",
    duration: service?.duration_minutes ?? 30,
    price: service ? service.price_cents / 100 : 0,
    emoji: service?.emoji ?? null,
    active: service?.active ?? true,
  });
  const [collaborators, setCollaborators] = useState<CollaboratorOption[]>([]);
  const [linkedIds, setLinkedIds] = useState<string[]>(initialLinked);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [descriptionPublic, setDescriptionPublic] = useState(service?.description_public ?? "");
  const [variantSlots, setVariantSlots] = useState<ServiceVariantItem[]>(() => padVariantSlots(service?.variant_gallery));
  const [imageUrl, setImageUrl] = useState<string | null>(service?.image_url ?? null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const newPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreview(null);
      return;
    }
    const u = URL.createObjectURL(pendingFile);
    setPendingPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [pendingFile]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("collaborators")
      .select("id, name, color, avatar_url")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        setCollaborators((data as CollaboratorOption[]) ?? []);
      });
  }, [businessId]);

  /** Atalhos: o usuário pode usar qualquer emoji no campo abaixo ou deixar vazio */
  const emojiPresets = [
    "✂️", "💈", "🪒", "💅", "🦶", "💆", "🏋️", "📷", "🐾", "🦷", "💊", "🎯",
    "💇", "✨", "🧴", "🪮", "🧼", "☕", "🍰", "🚗", "🏠", "💻", "📱", "🎨", "🎵",
    "⚡", "🔧", "🌿", "❤️", "⭐", "🎁", "👟", "🧘", "💼", "📚", "🐕", "🌸", "🍕",
  ];

  const toggleCollab = (id: string) => {
    setLinkedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllCollabs = () => setLinkedIds(collaborators.map((c) => c.id));
  const clearCollabs = () => setLinkedIds([]);

  const syncLinks = async (supabase: ReturnType<typeof createClient>, serviceId: string) => {
    await supabase.from("collaborator_services").delete().eq("service_id", serviceId);
    if (linkedIds.length > 0) {
      const links = linkedIds.map((collaborator_id) => ({ collaborator_id, service_id: serviceId }));
      const { error } = await supabase.from("collaborator_services").insert(links);
      if (error) throw new Error(error.message);
    }
  };

  const linkedBaselineStr = useMemo(() => {
    const ids = (service?.collaborator_services ?? [])
      .map((cs) => cs.collaborator_id || cs.collaborators?.id)
      .filter((id): id is string => Boolean(id));
    return [...ids].sort().join(",");
  }, [service?.collaborator_services]);

  const baselineSnap = useMemo(
    () =>
      JSON.stringify({
        form: {
          name: (service?.name ?? "").trim(),
          duration: service?.duration_minutes ?? 30,
          price: service ? service.price_cents / 100 : 0,
          emoji: service?.emoji ?? null,
          active: service?.active ?? true,
        },
        linked: linkedBaselineStr,
        description: (service?.description_public ?? "").trim(),
        variants: padVariantSlots(service?.variant_gallery),
        imageUrl: service?.image_url ?? null,
        pendingKey: null as string | null,
      }),
    [
      service?.name,
      service?.duration_minutes,
      service?.price_cents,
      service?.emoji,
      service?.active,
      service?.description_public,
      service?.variant_gallery,
      service?.image_url,
      linkedBaselineStr,
    ]
  );

  const currentSnap = useMemo(
    () =>
      JSON.stringify({
        form: {
          name: form.name.trim(),
          duration: form.duration,
          price: form.price,
          emoji: form.emoji,
          active: form.active,
        },
        linked: [...linkedIds].sort().join(","),
        description: descriptionPublic.trim(),
        variants: variantSlots,
        imageUrl,
        pendingKey: pendingFile ? `${pendingFile.name}:${pendingFile.size}` : null,
      }),
    [form, linkedIds, descriptionPublic, variantSlots, imageUrl, pendingFile]
  );

  const modalDirty = currentSnap !== baselineSnap;

  const persistService = async (): Promise<boolean> => {
    if (!form.name.trim()) return false;
    setSaving(true);
    setModalError(null);
    const supabase = createClient();
    const emojiVal = form.emoji?.trim() ? form.emoji.trim() : null;
    const variantPayload = variantSlots
      .filter((v) => v.url.trim())
      .map((v) => {
        const row: {
          url: string;
          title: string | null;
          description: string | null;
          price_cents?: number;
        } = {
          url: v.url.trim(),
          title: v.title.trim() || null,
          description: v.description.trim() || null,
        };
        if (v.price_cents != null && Number.isFinite(v.price_cents) && v.price_cents >= 0) {
          row.price_cents = Math.round(v.price_cents);
        }
        return row;
      });
    const row = {
      business_id: businessId,
      name: form.name.trim(),
      duration_minutes: form.duration,
      price_cents: Math.round(form.price * 100),
      emoji: emojiVal,
      active: form.active,
      description_public: descriptionPublic.trim() || null,
      variant_gallery: variantPayload,
    };
    try {
      if (service) {
        const { error: uErr } = await supabase.from("services").update(row).eq("id", service.id);
        if (uErr) throw new Error(uErr.message);
        await syncLinks(supabase, service.id);
      } else {
        const { data: inserted, error: iErr } = await supabase.from("services").insert(row).select("id").single();
        if (iErr || !inserted?.id) throw new Error(iErr?.message ?? "Falha ao criar serviço");
        const newId = inserted.id as string;
        await syncLinks(supabase, newId);
        if (pendingFile) {
          try {
            const prepared = await compressImageForUpload(pendingFile, { maxLongEdge: 1680 });
            const ext = extFromFile(prepared);
            const publicUrl = await uploadBusinessImage(
              supabase,
              businessId,
              `services/${newId}/${crypto.randomUUID()}.${ext}`,
              prepared
            );
            await supabase.from("services").update({ image_url: publicUrl }).eq("id", newId);
          } catch (photoErr) {
            showAlert(
              photoErr instanceof Error
                ? `${photoErr.message} Você pode enviar a foto editando o serviço.`
                : "Foto não enviada. Edite o serviço para tentar novamente.",
              { title: "Serviço criado" }
            );
          }
          setPendingFile(null);
        }
      }
      setSaving(false);
      refreshList();
      return true;
    } catch (e) {
      setSaving(false);
      setModalError(e instanceof Error ? e.message : "Erro ao salvar");
      return false;
    }
  };

  const handleSubmit = async () => {
    const ok = await persistService();
    if (ok) onSaved();
  };

  const errorBanner =
    modalError ? (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{modalError}</div>
    ) : undefined;

  return (
    <DashboardFullScreenOverlay
      title={service ? "Editar serviço" : "Novo serviço"}
      subtitle={
        service
          ? "Imagem, texto na página pública, variações com foto e quem pode atender."
          : "Aparece na página pública de agendamento. Você poderá adicionar variações depois."
      }
      onClose={onClose}
      banner={errorBanner}
      dirty={modalDirty}
      onSaveBeforeClose={persistService}
      closeBlocked={saving}
      hotkeys={{
        save: () => void handleSubmit(),
      }}
      footer={
        <ServiceModalFooterActions
          saving={saving}
          canSubmit={!!form.name.trim()}
          isEdit={!!service}
          onSaveClick={() => void handleSubmit()}
        />
      }
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 lg:items-start">
        {/* Coluna identidade (desktop esquerda) */}
        <div className="space-y-5 lg:col-span-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Identidade na página pública</h3>
            <p className="mt-1 text-[11px] leading-snug text-gray-500">
              Foto opcional; sem foto usamos ícone ou emoji.
            </p>
            <div className="mt-4 flex justify-center lg:justify-start">
              {service ? (
                <EntityPhotoControl
                  businessId={businessId}
                  kind="service"
                  entityId={service.id}
                  imageUrl={imageUrl}
                  onPersist={async (url) => {
                    const sb = createClient();
                    const { error: pErr } = await sb.from("services").update({ image_url: url }).eq("id", service.id);
                    if (pErr) throw new Error(pErr.message);
                    setImageUrl(url);
                  }}
                  size="md"
                  fallback={
                    form.emoji?.trim() ? (
                      <span className="text-4xl leading-none select-none">{form.emoji}</span>
                    ) : (
                      <span className="material-symbols-outlined text-4xl text-gray-400">category</span>
                    )
                  }
                />
              ) : (
                <div className="flex w-full max-w-sm flex-col items-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5">
                  <div className="relative">
                    <div className="flex size-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
                      {pendingPreview ? (
                        <Image
                          src={pendingPreview}
                          alt=""
                          width={96}
                          height={96}
                          className="size-full object-cover"
                          unoptimized
                        />
                      ) : form.emoji?.trim() ? (
                        <span className="text-4xl leading-none select-none">{form.emoji}</span>
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-gray-400">category</span>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => newPhotoInputRef.current?.click()}
                        title="Adicionar foto"
                        className="flex size-9 items-center justify-center rounded-xl border-2 border-white bg-primary text-black shadow-lg transition-transform hover:brightness-95 hover:scale-105 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-lg">add_a_photo</span>
                      </button>
                      {pendingPreview ? (
                        <button
                          type="button"
                          onClick={() => setPendingFile(null)}
                          title="Remover seleção"
                          className="flex size-9 items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-red-600 shadow-lg transition-transform hover:bg-red-50 hover:scale-105 active:scale-95"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      ) : null}
                    </div>
                    <input
                      ref={newPhotoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) setPendingFile(f);
                      }}
                    />
                  </div>
                  <p className="mt-3 text-center text-[11px] text-gray-500">
                    Opcional agora; você pode enviar depois em Editar.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <label className="mb-2 block text-sm font-medium text-gray-600">Ícone (opcional)</label>
            <p className="mb-3 text-xs text-gray-500">
              Atalhos ou qualquer emoji (atalho do sistema). Vazio = sem ícone.
            </p>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, emoji: null })}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  form.emoji == null || form.emoji === ""
                    ? "border-primary bg-primary/15 text-gray-900 ring-2 ring-primary/40"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                Sem ícone
              </button>
            </div>
            <input
              type="text"
              value={form.emoji ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setForm({ ...form, emoji: v === "" ? null : v });
              }}
              placeholder="Cole ou digite emoji…"
              className="mb-3 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-lg text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary"
              maxLength={32}
              autoComplete="off"
            />
            <p className="mb-2 text-xs font-medium text-gray-500">Atalhos</p>
            <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch] sm:max-h-none">
              {emojiPresets.map((e) => (
                <button
                  key={e}
                  type="button"
                  title={e}
                  onClick={() => setForm({ ...form, emoji: e })}
                  className={`flex size-10 items-center justify-center rounded-xl text-xl transition-all ${
                    form.emoji === e ? "bg-primary/20 ring-2 ring-primary" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <label className="mb-1.5 block text-sm font-medium text-gray-600">Nome do serviço *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: nome do serviço"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary"
            />
            <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-600">
              Descrição para o cliente (opcional)
            </label>
            <textarea
              value={descriptionPublic}
              onChange={(e) => setDescriptionPublic(e.target.value)}
              placeholder="Detalhes na página pública ao escolher este serviço…"
              rows={4}
              maxLength={1200}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary"
            />
            <p className="mt-1 text-right text-[11px] text-gray-400">{descriptionPublic.length}/1200</p>
          </section>
        </div>

        {/* Coluna preço, variações e equipe (desktop direita) */}
        <div className="space-y-5 lg:col-span-7">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Tempo e valor</h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-600">Duração (min)</label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  step={5}
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-600">Preço (R$)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-5">
              <SwitchToggle checked={form.active} onChange={() => setForm({ ...form, active: !form.active })} />
              <span className="text-sm text-gray-600">Serviço ativo (visível na página pública)</span>
            </div>
          </section>

          {service ? (
            <ServiceVariantGalleryEditor
              businessId={businessId}
              serviceId={service.id}
              basePriceReais={form.price}
              slots={variantSlots}
              onSlotsChange={setVariantSlots}
              disabled={saving}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-xs text-gray-600">
              Depois de criar o serviço, abra <strong className="text-gray-800">Editar</strong> para adicionar até 3 fotos
              de variações (título e texto curto), opcionais.
            </div>
          )}

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <label className="block text-sm font-medium text-gray-800">Quem faz este serviço</label>
            <p className="mt-1 text-[11px] leading-snug text-gray-500">
              Nenhum marcado = <strong className="text-gray-700">qualquer profissional ativo</strong> pode atender.
            </p>
            {collaborators.length === 0 ? (
              <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Cadastre profissionais em Equipe para vincular aqui.
              </p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAllCollabs}
                    className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    Marcar todos
                  </button>
                  <button
                    type="button"
                    onClick={clearCollabs}
                    className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    Limpar (todos na página pública)
                  </button>
                </div>
                <ul className="mt-3 max-h-[min(22rem,45vh)] space-y-2 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch] lg:max-h-[min(28rem,50vh)]">
                  {collaborators.map((c) => {
                    const on = linkedIds.includes(c.id);
                    return (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 px-2 py-2 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleCollab(c.id)}
                            className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span
                            className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[11px] font-bold text-gray-900"
                            style={{
                              backgroundColor: c.avatar_url ? undefined : c.color ? `${c.color}40` : "#e5e7eb",
                            }}
                          >
                            {c.avatar_url ? (
                              <Image src={c.avatar_url} alt="" width={28} height={28} className="size-full object-cover" unoptimized />
                            ) : (
                              c.name[0]
                            )}
                          </span>
                          <span className="truncate text-sm text-gray-800">{c.name}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-[10px] text-gray-400">
                  {linkedIds.length === 0
                    ? "Página pública: profissionais no agendamento = todos os ativos."
                    : `Página pública: apenas ${linkedIds.length} profissional(is) marcado(s).`}
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </DashboardFullScreenOverlay>
  );
}
