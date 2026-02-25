"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_SERVICES, MOCK_COLLABORATORS, MOCK_CLIENTS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

const AVAILABLE_TIMES = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

export default function NovoAgendamentoPage() {
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<typeof MOCK_CLIENTS[0] | null>(null);
  const [clientNameManual, setClientNameManual] = useState("");
  const [selectedService, setSelectedService] = useState<typeof MOCK_SERVICES[0] | null>(null);
  const [selectedCollab, setSelectedCollab] = useState<typeof MOCK_COLLABORATORS[0] | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const collabsForService = selectedService
    ? MOCK_COLLABORATORS.filter((c) => selectedService.collaborators.includes(c.id))
    : MOCK_COLLABORATORS;

  const filteredClients = MOCK_CLIENTS.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const displayName = selectedClient ? selectedClient.name : clientNameManual;

  const handleSave = () => {
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="w-full max-w-lg mx-auto text-center py-12">
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

  return (
    <div className="w-full max-w-2xl mx-auto">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MOCK_SERVICES.filter((s) => s.active).map((s) => (
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
                <span className="text-xl block mb-1">{s.emoji}</span>
                <span className="text-sm font-semibold block truncate">{s.name}</span>
                <span className="text-xs text-primary font-bold">{formatCurrency(s.price)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Profissional */}
        {selectedService && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Profissional</h2>
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
                    style={{ backgroundColor: c.color }}
                  >
                    {c.name[0]}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{c.name}</span>
                </button>
              ))}
            </div>
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
            disabled={!displayName.trim() || !selectedService || !selectedCollab || !selectedDate || !selectedTime}
            className="flex-1 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl text-sm"
          >
            Criar agendamento
          </button>
        </div>
      </div>
    </div>
  );
}
