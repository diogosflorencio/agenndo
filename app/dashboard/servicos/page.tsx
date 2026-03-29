"use client";

import { useState, useEffect, useCallback } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  emoji: string | null;
  active: boolean;
  collaborator_services: {
    collaborator_id: string;
    collaborators: { id: string; name: string; color: string | null } | null;
  }[];
};

type CollaboratorOption = { id: string; name: string; color: string | null };

export default function ServicosPage() {
  const { business } = useDashboard();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState<ServiceRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!business?.id) return;
    const supabase = createClient();
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents, emoji, active, collaborator_services(collaborator_id, collaborators(id, name, color))")
      .eq("business_id", business.id)
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          setListError(error.message);
          return;
        }
        setListError(null);
        setServices((data as unknown as ServiceRow[]) ?? []);
      });
  }, [business?.id]);

  useEffect(() => {
    if (!business?.id) return;
    load();
    setLoading(false);
  }, [business?.id, load]);

  const toggleActive = async (s: ServiceRow) => {
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
          <p className="text-gray-400 text-sm mt-1">{services.length} serviços cadastrados</p>
        </div>
        <button
          onClick={() => {
            setEditService(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)]"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Novo serviço
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
                    <div className="size-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">
                      {service.emoji ? (
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
                    {(anyProf ? [{ id: "all", name: "Todos", color: null }] : collabs).slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="size-5 rounded-full border border-white flex items-center justify-center text-[8px] font-bold text-gray-900"
                        style={{ backgroundColor: c.color ?? "#94a3b8" }}
                        title={anyProf ? "Qualquer profissional" : c.name}
                      >
                        {anyProf ? "∗" : c.name[0]}
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

      {showModal && (
        <ServiceModal
          businessId={business!.id}
          service={editService}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ServiceModal({
  businessId,
  service,
  onClose,
  onSaved,
}: {
  businessId: string;
  service: ServiceRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
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

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("collaborators")
      .select("id, name, color")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        setCollaborators((data as CollaboratorOption[]) ?? []);
      });
  }, [businessId]);

  /** Atalhos — o usuário pode usar qualquer emoji no campo abaixo ou deixar vazio */
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

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setModalError(null);
    const supabase = createClient();
    const emojiVal = form.emoji?.trim() ? form.emoji.trim() : null;
    const row = {
      business_id: businessId,
      name: form.name.trim(),
      duration_minutes: form.duration,
      price_cents: Math.round(form.price * 100),
      emoji: emojiVal,
      active: form.active,
    };
    try {
      if (service) {
        const { error: uErr } = await supabase.from("services").update(row).eq("id", service.id);
        if (uErr) throw new Error(uErr.message);
        await syncLinks(supabase, service.id);
      } else {
        const { data: inserted, error: iErr } = await supabase.from("services").insert(row).select("id").single();
        if (iErr || !inserted?.id) throw new Error(iErr?.message ?? "Falha ao criar serviço");
        await syncLinks(supabase, inserted.id as string);
      }
      setSaving(false);
      onSaved();
    } catch (e) {
      setSaving(false);
      setModalError(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 border border-gray-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-gray-50 z-[1]">
          <h2 className="text-lg font-bold text-gray-900">{service ? "Editar serviço" : "Novo serviço"}</h2>
          <button type="button" onClick={onClose} className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
        {modalError && (
          <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{modalError}</div>
        )}
        <div className="p-5 space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-2">Ícone (opcional)</label>
            <p className="text-xs text-gray-500 mb-3">
              Deixe vazio para nenhum ícone, ou escolha um atalho / cole qualquer emoji (ex.: atalho de emoji do sistema).
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, emoji: null })}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  form.emoji == null || form.emoji === ""
                    ? "bg-primary/15 border-primary text-gray-900 ring-2 ring-primary/40"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
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
              placeholder="Cole ou digite qualquer emoji aqui…"
              className="w-full h-11 bg-white border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-lg mb-3"
              maxLength={32}
              autoComplete="off"
            />
            <p className="text-xs font-medium text-gray-500 mb-2">Atalhos</p>
            <div className="flex gap-2 flex-wrap">
              {emojiPresets.map((e) => (
                <button
                  key={e}
                  type="button"
                  title={e}
                  onClick={() => setForm({ ...form, emoji: e })}
                  className={`size-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    form.emoji === e ? "bg-primary/20 ring-2 ring-primary" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1.5">Nome do serviço *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Corte Masculino" className="w-full h-11 bg-white border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1.5">Duração (min)</label>
              <input type="number" min={5} max={240} step={5} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} className="w-full h-11 bg-white border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 outline-none text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1.5">Preço (R$)</label>
              <input type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full h-11 bg-white border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 outline-none text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm({ ...form, active: !form.active })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? "bg-primary" : "bg-gray-300"}`}>
              <span className={`inline-block size-4 rounded-full bg-white transition-transform ${form.active ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-sm text-gray-600">Serviço ativo (visível na página pública)</span>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <label className="text-sm font-medium text-gray-800 block">Quem faz este serviço</label>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                  Nenhum marcado = <strong>qualquer profissional ativo</strong> pode atender.
                </p>
              </div>
            </div>
            {collaborators.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">Cadastre profissionais em Colaboradores para vincular aqui.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button type="button" onClick={selectAllCollabs} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">
                    Marcar todos
                  </button>
                  <button type="button" onClick={clearCollabs} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">
                    Limpar (todos na página pública)
                  </button>
                </div>
                <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {collaborators.map((c) => {
                    const on = linkedIds.includes(c.id);
                    return (
                      <li key={c.id}>
                        <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-gray-100 hover:bg-gray-50 px-2 py-2">
                          <input type="checkbox" checked={on} onChange={() => toggleCollab(c.id)} className="size-4 rounded border-gray-300 text-primary focus:ring-primary" />
                          <span
                            className="size-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-gray-900 shrink-0"
                            style={{ backgroundColor: c.color ? `${c.color}40` : "#e5e7eb" }}
                          >
                            {c.name[0]}
                          </span>
                          <span className="text-sm text-gray-800 truncate">{c.name}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[10px] text-gray-400 mt-2">
                  {linkedIds.length === 0
                    ? "Página pública: listagem de profissionais no agendamento = todos os ativos."
                    : `Página pública: apenas ${linkedIds.length} profissional(is) marcado(s).`}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-200 sticky bottom-0 bg-gray-50 z-[1]">
          <button type="button" onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-semibold rounded-xl text-sm transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={() => void handleSubmit()} disabled={saving || !form.name.trim()} className="flex-1 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-black font-bold rounded-xl text-sm transition-colors">
            {saving ? "Salvando..." : service ? "Salvar alterações" : "Criar serviço"}
          </button>
        </div>
      </div>
    </div>
  );
}
