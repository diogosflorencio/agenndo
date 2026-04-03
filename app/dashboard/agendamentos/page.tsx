"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { STATUS_CONFIG, formatCurrency, phoneToWhatsAppHref, type AppointmentStatus } from "@/lib/utils";
import { hasFullServiceAccess } from "@/lib/billing-access";
import {
  setAppointmentAttendance,
  updateCompareceuPaidAmount,
  centsToMoneyInput,
} from "@/lib/appointment-finance";
import { AppointmentValueModal } from "@/components/appointment-value-modal";
import { useAppAlert } from "@/components/app-alert-provider";
import { AgendaScheduleView, type AgendaViewMode } from "@/components/agenda-schedule-view";
import { localISODate } from "@/lib/agenda-calendar-helpers";

const STATUSES: AppointmentStatus[] = ["agendado", "confirmado", "compareceu", "faltou", "cancelado"];

type AptRow = {
  id: string;
  collaborator_id?: string | null;
  client_id: string | null;
  date: string;
  time_start: string;
  time_end: string;
  price_cents: number;
  status: string;
  client_name_snapshot: string | null;
  clients: { name: string; phone: string | null } | null;
  services: { name: string } | null;
  collaborators: { id: string; name: string } | null;
};

type CollabRow = { id: string; name: string };

function formatTime(t: string) {
  const [h, m] = t.split(":");
  return `${h}:${m ?? "00"}`;
}

export default function AgendamentosPage() {
  const { business } = useDashboard();
  const { showConfirm } = useAppAlert();
  const [appointments, setAppointments] = useState<AptRow[]>([]);
  const [collaborators, setCollaborators] = useState<CollabRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => localISODate(new Date()));
  const [viewMode, setViewMode] = useState<AgendaViewMode>("day");
  const [showCancelled, setShowCancelled] = useState(false);
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | "todos">("todos");
  const [filterCollab, setFilterCollab] = useState("todos");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [moneyModal, setMoneyModal] = useState<{
    apt: AptRow;
    mode: "compareceu" | "edit_paid";
  } | null>(null);

  const fetchRange = useMemo(() => {
    const d = new Date(selectedDate + "T12:00:00");
    const from = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const to = new Date(d.getFullYear(), d.getMonth() + 2, 0);
    return { from: localISODate(from), to: localISODate(to) };
  }, [selectedDate]);

  const showActionMessage = (text: string, kind: "info" | "error" = "info") => {
    setActionMessage({ kind, text });
    window.setTimeout(() => setActionMessage(null), 5000);
  };

  useEffect(() => {
    if (!business?.id) return;
    setLoading(true);
    const supabase = createClient();
    Promise.all([
      supabase
        .from("appointments")
        .select(
          "id, collaborator_id, client_id, date, time_start, time_end, price_cents, status, client_name_snapshot, clients(name, phone), services(name), collaborators(id, name)"
        )
        .eq("business_id", business.id)
        .gte("date", fetchRange.from)
        .lte("date", fetchRange.to)
        .order("date")
        .order("time_start"),
      supabase.from("collaborators").select("id, name").eq("business_id", business.id).eq("active", true),
    ]).then(([apts, collabs]) => {
      setAppointments((apts.data as unknown as AptRow[]) ?? []);
      setCollaborators((collabs.data as CollabRow[]) ?? []);
      setLoading(false);
    });
  }, [business?.id, fetchRange.from, fetchRange.to]);

  const filtered = appointments.filter((a) => {
    if (a.date !== selectedDate) return false;
    if (!showCancelled && a.status === "cancelado") return false;
    if (filterStatus !== "todos" && a.status !== filterStatus) return false;
    if (filterCollab !== "todos" && a.collaborators?.id !== filterCollab) return false;
    const name = a.clients?.name ?? a.client_name_snapshot ?? "";
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  const allSelected = filtered.length > 0 && filtered.every((a) => selected.includes(a.id));

  const openClientWhatsApp = (apt: AptRow) => {
    if (!apt.client_id) {
      showActionMessage(
        "Este agendamento não está vinculado a um cliente com cadastro (apenas nome no agendamento). Não há telefone para abrir o WhatsApp.",
        "error",
      );
      return;
    }
    const phone = apt.clients?.phone ?? null;
    const href = phoneToWhatsAppHref(phone);
    if (!href) {
      showActionMessage("Este cliente não tem telefone cadastrado. Abra o cadastro do cliente e adicione o número para usar o WhatsApp.", "error");
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const patchAptLocal = (aptId: string, patch: Partial<AptRow>) => {
    setAppointments((prev) => prev.map((a) => (a.id === aptId ? { ...a, ...patch } : a)));
  };

  const runMarkFaltou = async (apt: AptRow) => {
    if (!business?.id) return;
    setBusyId(apt.id);
    const supabase = createClient();
    const res = await setAppointmentAttendance({
      supabase,
      businessId: business.id,
      appointment: {
        id: apt.id,
        client_id: apt.client_id,
        date: apt.date,
        price_cents: apt.price_cents,
        status: apt.status,
      },
      clientName: apt.clients?.name ?? apt.client_name_snapshot,
      serviceName: apt.services?.name ?? null,
      collaboratorName: apt.collaborators?.name ?? null,
      nextStatus: "faltou",
    });
    setBusyId(null);
    if ("error" in res) {
      showActionMessage(res.error, "error");
      return;
    }
    patchAptLocal(apt.id, { status: "faltou" });
  };

  const runMarkCompareceu = async (apt: AptRow, paidCents: number) => {
    if (!business?.id) return;
    setBusyId(apt.id);
    const supabase = createClient();
    const res = await setAppointmentAttendance({
      supabase,
      businessId: business.id,
      appointment: {
        id: apt.id,
        client_id: apt.client_id,
        date: apt.date,
        price_cents: apt.price_cents,
        status: apt.status,
      },
      clientName: apt.clients?.name ?? apt.client_name_snapshot,
      serviceName: apt.services?.name ?? null,
      collaboratorName: apt.collaborators?.name ?? null,
      nextStatus: "compareceu",
      paidCents,
    });
    setBusyId(null);
    if ("error" in res) {
      showActionMessage(res.error, "error");
      return;
    }
    patchAptLocal(apt.id, { status: "compareceu", price_cents: paidCents });
    setMoneyModal(null);
  };

  const runUpdatePaidOnly = async (apt: AptRow, paidCents: number) => {
    if (!business?.id) return;
    setBusyId(apt.id);
    const supabase = createClient();
    const res = await updateCompareceuPaidAmount({
      supabase,
      businessId: business.id,
      appointmentId: apt.id,
      clientId: apt.client_id,
      paidCents,
      createIfMissing: {
        date: apt.date,
        clientName: apt.clients?.name ?? apt.client_name_snapshot,
        serviceName: apt.services?.name ?? null,
        collaboratorName: apt.collaborators?.name ?? null,
      },
    });
    setBusyId(null);
    if ("error" in res) {
      showActionMessage(res.error, "error");
      return;
    }
    patchAptLocal(apt.id, { price_cents: paidCents });
    setMoneyModal(null);
  };

  const bulkMarkCompareceu = async () => {
    if (!business?.id || selected.length === 0) return;
    setBusyId("__bulk__");
    const supabase = createClient();
    let err: string | null = null;
    for (const id of selected) {
      const apt = appointments.find((a) => a.id === id);
      if (!apt || (apt.status !== "agendado" && apt.status !== "confirmado")) continue;
      const res = await setAppointmentAttendance({
        supabase,
        businessId: business.id,
        appointment: {
          id: apt.id,
          client_id: apt.client_id,
          date: apt.date,
          price_cents: apt.price_cents,
          status: apt.status,
        },
        clientName: apt.clients?.name ?? apt.client_name_snapshot,
        serviceName: apt.services?.name ?? null,
        collaboratorName: apt.collaborators?.name ?? null,
        nextStatus: "compareceu",
        paidCents: apt.price_cents,
      });
      if ("error" in res) {
        err = res.error;
        break;
      }
      patchAptLocal(apt.id, { status: "compareceu", price_cents: apt.price_cents });
    }
    setBusyId(null);
    if (err) showActionMessage(err, "error");
    setSelected([]);
  };

  const bulkCancel = async () => {
    if (!business?.id || selected.length === 0) return;
    const ok = await showConfirm({
      title: "Cancelar agendamentos",
      message: `Cancelar ${selected.length} agendamento(s)?`,
      confirmLabel: "Cancelar agendamentos",
      cancelLabel: "Voltar",
      variant: "danger",
    });
    if (!ok) return;
    setBusyId("__bulk__");
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelado" })
      .in("id", selected)
      .eq("business_id", business.id);
    setBusyId(null);
    if (error) {
      showActionMessage(error.message || "Não foi possível cancelar.", "error");
      return;
    }
    setAppointments((prev) => prev.map((a) => (selected.includes(a.id) ? { ...a, status: "cancelado" } : a)));
    setSelected([]);
  };

  const canCreateAppointments = business ? hasFullServiceAccess(business) : true;

  const listTitle = useMemo(() => {
    const d = new Date(selectedDate + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-gray-600 text-sm mt-1">Gerencie todos os seus agendamentos</p>
        </div>
        {canCreateAppointments ? (
          <Link
            href="/dashboard/agendamentos/novo"
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)]"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Novo
          </Link>
        ) : (
          <Link
            href="/dashboard/conta"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-xl text-sm transition-all border border-amber-300"
          >
            <span className="material-symbols-outlined text-base">gpp_maybe</span>
            Regularizar plano
          </Link>
        )}
      </div>

      {actionMessage && (
        <div
          role="alert"
          className={`mb-4 px-4 py-3 rounded-xl text-sm border ${
            actionMessage.kind === "error"
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-primary/10 border-primary/30 text-gray-900"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex items-center gap-3 p-3 mb-4 bg-primary/10 border border-primary/30 rounded-xl">
          <span className="text-primary text-sm font-bold">{selected.length} selecionado(s)</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => void bulkMarkCompareceu()}
              className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 disabled:opacity-50 text-primary text-xs font-bold rounded-lg border border-primary/30 transition-colors"
            >
              Marcar como compareceu
            </button>
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => void bulkCancel()}
              className="px-3 py-1.5 bg-red-400/10 hover:bg-red-400/20 disabled:opacity-50 text-red-400 text-xs font-bold rounded-lg border border-red-400/20 transition-colors"
            >
              Cancelar selecionados
            </button>
            <button type="button" onClick={() => setSelected([])} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-600 text-xs font-bold rounded-lg border border-white/10 transition-colors">
              Limpar
            </button>
          </div>
        </div>
      )}

      <AgendaScheduleView
        appointments={appointments}
        collaborators={collaborators}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        view={viewMode}
        onViewChange={setViewMode}
        filterCollab={filterCollab}
        onFilterCollab={setFilterCollab}
        showCancelled={showCancelled}
        onShowCancelled={setShowCancelled}
        canCreate={canCreateAppointments}
        onAppointmentClick={(id) => {
          document.getElementById(`apt-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />

      <section className="mt-10 border-t border-gray-200 pt-8">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Lista do dia</h2>
          <p className="text-sm text-gray-500 capitalize">{listTitle}</p>
          <p className="text-xs text-gray-500 mt-1">
            Use a grade acima para ver o dia na vertical; aqui você filtra por status e aplica ações em lote.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 min-w-0">
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Status (lista)</h3>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setFilterStatus("todos")}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    filterStatus === "todos" ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="size-2 rounded-full bg-gray-400" /> Todos
                </button>
                {STATUSES.map((s) => {
                  const conf = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFilterStatus(s)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        filterStatus === s ? `bg-primary/10 ${conf.color}` : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <span className={`size-2 rounded-full ${conf.dot}`} /> {conf.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 min-w-0">
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-base">search</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full h-10 bg-white border border-gray-200 shadow-sm rounded-xl pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {filtered.length > 0 && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={allSelected}
                  onChange={() => (allSelected ? setSelected([]) : setSelected(filtered.map((a) => a.id)))}
                  className="accent-primary"
                />
                <label htmlFor="select-all" className="text-xs text-gray-600">
                  {filtered.length} agendamento(s)
                </label>
              </div>
            )}

            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <span className="material-symbols-outlined text-gray-600 text-5xl block mb-3">calendar_today</span>
                  <p className="text-gray-600 text-sm">Nenhum agendamento neste dia com os filtros atuais</p>
                </div>
              ) : (
                filtered.map((apt) => {
                  const conf = STATUS_CONFIG[apt.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.agendado;
                  const clientName = apt.clients?.name ?? apt.client_name_snapshot ?? "Cliente";
                  const serviceName = apt.services?.name ?? "—";
                  const collabName = apt.collaborators?.name ?? "—";
                  const isSelected = selected.includes(apt.id);
                  return (
                    <div
                      key={apt.id}
                      id={`apt-row-${apt.id}`}
                      className={`bg-white border rounded-xl overflow-hidden transition-all scroll-mt-24 ${
                        isSelected ? "border-primary/60" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="p-4 flex gap-3 items-start">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(apt.id)} className="accent-primary mt-0.5" />
                        <div className="flex flex-col items-center w-14 flex-shrink-0">
                          <span className="text-gray-900 font-bold text-sm">{formatTime(apt.time_start)}</span>
                          <span className="text-gray-500 text-xs">{formatTime(apt.time_end)}</span>
                        </div>
                        <div className="size-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-primary/80">
                          {clientName[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="text-gray-900 font-semibold text-sm">{clientName}</p>
                              <p className="text-gray-600 text-xs mt-0.5">
                                {serviceName} · {collabName}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${conf.bg} ${conf.color}`}>
                                <span className={`size-1.5 rounded-full ${conf.dot}`} /> {conf.label}
                              </span>
                              <span className="text-primary text-xs font-bold">{formatCurrency(apt.price_cents / 100)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 pb-3 flex flex-wrap gap-2">
                        {apt.client_id ? (
                          <Link
                            href={`/dashboard/clientes/${apt.client_id}`}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-600 hover:text-gray-900 text-xs rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-xs">visibility</span> Ver cliente
                          </Link>
                        ) : (
                          <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-400 text-xs rounded-lg">
                            <span className="material-symbols-outlined text-xs">visibility</span> Ver cliente
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => openClientWhatsApp(apt)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-600 hover:text-gray-900 text-xs rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs">chat</span> WhatsApp
                        </button>
                        {(apt.status === "agendado" || (apt.status as AppointmentStatus) === "confirmado") && (
                          <>
                            <button
                              type="button"
                              disabled={busyId === "__bulk__" || busyId === apt.id}
                              onClick={() => setMoneyModal({ apt, mode: "compareceu" })}
                              className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 disabled:opacity-50 text-primary text-xs rounded-lg transition-colors font-semibold"
                            >
                              <span className="material-symbols-outlined text-xs">check_circle</span> Compareceu
                            </button>
                            <button
                              type="button"
                              disabled={busyId === "__bulk__" || busyId === apt.id}
                              onClick={() => void runMarkFaltou(apt)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-400/10 hover:bg-red-400/20 disabled:opacity-50 text-red-400 text-xs rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-xs">person_off</span> Faltou
                            </button>
                          </>
                        )}
                        {apt.status === "compareceu" && (
                          <button
                            type="button"
                            disabled={busyId === "__bulk__" || busyId === apt.id}
                            onClick={() => setMoneyModal({ apt, mode: "edit_paid" })}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition-colors font-medium"
                          >
                            <span className="material-symbols-outlined text-xs">edit</span> Valor cobrado
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <AppointmentValueModal
        open={moneyModal != null}
        title={moneyModal?.mode === "edit_paid" ? "Editar valor cobrado" : "Cliente compareceu"}
        subtitle={moneyModal ? `${moneyModal.apt.clients?.name ?? moneyModal.apt.client_name_snapshot ?? "Cliente"} · ${moneyModal.apt.services?.name ?? "Serviço"}` : undefined}
        initialValueReais={moneyModal ? centsToMoneyInput(moneyModal.apt.price_cents) : "0,00"}
        confirmLabel={moneyModal?.mode === "edit_paid" ? "Salvar" : "Confirmar comparecimento"}
        loading={moneyModal != null && busyId === moneyModal.apt.id}
        onClose={() => busyId !== "__bulk__" && busyId !== moneyModal?.apt.id && setMoneyModal(null)}
        onConfirm={(cents) => {
          if (!moneyModal) return;
          if (moneyModal.mode === "edit_paid") void runUpdatePaidOnly(moneyModal.apt, cents);
          else void runMarkCompareceu(moneyModal.apt, cents);
        }}
      />
    </div>
  );
}
