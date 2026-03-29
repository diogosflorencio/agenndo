"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { MOCK_CLIENTS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

const AVAILABLE_TIMES = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

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

type CollabRow = { id: string; name: string; color: string | null };

function collaboratorsForService(service: ServiceRow | null, allActive: CollabRow[]): CollabRow[] {
  if (!service) return [];
  const linked = (service.collaborator_services ?? [])
    .map((cs) => cs.collaborators)
    .filter(Boolean) as CollabRow[];
  if (linked.length > 0) return linked;
  return allActive;
}

export default function NovoAgendamentoPage() {
  const { business } = useDashboard();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [collaborators, setCollaborators] = useState<CollabRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<typeof MOCK_CLIENTS[0] | null>(null);
  const [clientNameManual, setClientNameManual] = useState("");
  const [selectedService, setSelectedService] = useState<ServiceRow | null>(null);
  const [selectedCollab, setSelectedCollab] = useState<CollabRow | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    if (!business?.id) return;
    setDataLoading(true);
    setListError(null);
    const supabase = createClient();
    Promise.all([
      supabase
        .from("services")
        .select(
          "id, name, duration_minutes, price_cents, emoji, active, collaborator_services(collaborator_id, collaborators(id, name, color))"
        )
        .eq("business_id", business.id)
        .order("name"),
      supabase
        .from("collaborators")
        .select("id, name, color")
        .eq("business_id", business.id)
        .eq("active", true)
        .order("name"),
    ]).then(([svcRes, colRes]) => {
      if (svcRes.error) {
        setListError(svcRes.error.message);
        setServices([]);
      } else {
        setServices((svcRes.data as unknown as ServiceRow[]) ?? []);
      }
      if (colRes.error) {
        setListError((e) => e ?? colRes.error!.message);
        setCollaborators([]);
      } else {
        setCollaborators((colRes.data as CollabRow[]) ?? []);
      }
      setDataLoading(false);
    });
  }, [business?.id]);

  useEffect(() => {
    if (!business?.id) return;
    load();
  }, [business?.id, load]);

  useEffect(() => {
    if (!selectedService) {
      setSelectedCollab(null);
      return;
    }
    const list = collaboratorsForService(selectedService, collaborators);
    setSelectedCollab((prev) => (prev && list.some((c) => c.id === prev.id) ? prev : null));
  }, [selectedService, collaborators]);

  const today = new Date().toISOString().slice(0, 10);
  const collabsForService = collaboratorsForService(selectedService, collaborators);

  const filteredClients = MOCK_CLIENTS.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const displayName = selectedClient ? selectedClient.name : clientNameManual;

  const handleSave = () => {
    setSaved(true);
  };

  const activeServices = services.filter((s) => s.active);

  if (saved) {
    return (
      <div className="w-full text-center py-12">
        <div className="size-16 rounded-2xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-primary text-4xl filled">check_circle</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Agendamento criado</h1>
        <p className="text-gray-600 text-sm mb-6">
          {displayName} · {selectedService?.name} · {selectedDate} às {selectedTime}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard/agendamentos/novo"
            className="px-4 py-2.5 bg-white border border-gray-200 hover:border-primary/40 text-gray-700 font-semibold rounded-xl text-sm"
          >
            Novo agendamento
          </Link>
          <Link
            href="/dashboard/agendamentos"
            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm"
          >
            Ver agenda
          </Link>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard/agendamentos"
          className="size-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo agendamento</h1>
          <p className="text-gray-600 text-sm mt-0.5">Preencha os dados abaixo</p>
        </div>
      </div>

      {listError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {listError}
        </div>
      )}

      <div className="space-y-6">
        {/* Cliente */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Cliente</h2>
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-base">person_search</span>
            <input
              type="text"
              value={selectedClient ? "" : clientSearch}
              onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); }}
              placeholder="Buscar cliente ou deixe em branco"
              className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-primary"
            />
          </div>
          {!selectedClient && (
            <input
              type="text"
              value={clientNameManual}
              onChange={(e) => setClientNameManual(e.target.value)}
              placeholder="Ou digite o nome do cliente"
              className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-primary"
            />
          )}
          {clientSearch && filteredClients.length > 0 && (
            <ul className="mt-2 border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-40 overflow-y-auto">
              {filteredClients.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => { setSelectedClient(c); setClientSearch(""); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-900 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-gray-500 text-xs">{c.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedClient && (
            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl mt-2">
              <span className="text-sm font-semibold text-gray-900">{selectedClient.name}</span>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Trocar
              </button>
            </div>
          )}
        </div>

        {/* Serviço */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Serviço</h2>
          {activeServices.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhum serviço ativo.{" "}
              <Link href="/dashboard/servicos" className="text-primary font-semibold hover:underline">
                Cadastre serviços
              </Link>{" "}
              para agendar.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activeServices.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedService(s)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedService?.id === s.id
                      ? "border-primary bg-primary/10 text-gray-900"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <span className="text-xl mb-1 min-h-[1.25rem] flex items-center justify-start">
                    {s.emoji ? (
                      <span className="leading-none select-none" aria-hidden>
                        {s.emoji}
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-gray-400 text-xl">category</span>
                    )}
                  </span>
                  <span className="text-sm font-semibold block truncate">{s.name}</span>
                  <span className="text-[11px] text-gray-500 block">{s.duration_minutes} min</span>
                  <span className="text-xs text-primary font-bold">{formatCurrency(s.price_cents / 100)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Profissional */}
        {selectedService && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Profissional</h2>
            {collabsForService.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhum profissional disponível. Ative um colaborador ou vincule-o ao serviço em{" "}
                <Link href="/dashboard/servicos" className="text-primary font-semibold hover:underline">
                  Serviços
                </Link>
                .
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {collabsForService.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCollab(c)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                      selectedCollab?.id === c.id
                        ? "border-primary bg-primary/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className="size-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: c.color ?? "#94a3b8" }}
                    >
                      {c.name[0]}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Data e horário */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Data e horário</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Data</label>
              <input
                type="date"
                value={selectedDate}
                min={today}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm text-gray-900 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Horário</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm text-gray-900 outline-none focus:border-primary appearance-none"
              >
                <option value="">Selecionar</option>
                {AVAILABLE_TIMES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <label className="text-sm font-bold text-gray-900 block mb-2">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opcional"
            rows={2}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-primary resize-none"
          />
        </div>

        <div className="flex gap-3">
          <Link
            href="/dashboard/agendamentos"
            className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm text-center"
          >
            Cancelar
          </Link>
          <button
            onClick={handleSave}
            disabled={
              !displayName.trim() ||
              !selectedService ||
              !selectedCollab ||
              collabsForService.length === 0 ||
              !selectedDate ||
              !selectedTime
            }
            className="flex-1 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl text-sm"
          >
            Criar agendamento
          </button>
        </div>
      </div>
    </div>
  );
}
