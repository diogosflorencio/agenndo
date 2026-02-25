"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { STATUS_CONFIG, formatCurrency, type AppointmentStatus } from "@/lib/utils";

const STATUSES: AppointmentStatus[] = ["agendado", "confirmado", "compareceu", "faltou", "cancelado"];

type AptRow = {
  id: string;
  client_id: string | null;
  date: string;
  time_start: string;
  time_end: string;
  price_cents: number;
  status: string;
  client_name_snapshot: string | null;
  clients: { name: string } | null;
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
  const [appointments, setAppointments] = useState<AptRow[]>([]);
  const [collaborators, setCollaborators] = useState<CollabRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [monthYear, setMonthYear] = useState(() => {
    const n = new Date();
    return { month: n.getMonth(), year: n.getFullYear() };
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | "todos">("todos");
  const [filterCollab, setFilterCollab] = useState("todos");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!business?.id) return;
    const supabase = createClient();
    const start = new Date(monthYear.year, monthYear.month, 1);
    const end = new Date(monthYear.year, monthYear.month + 1, 0);
    const fromStr = start.toISOString().slice(0, 10);
    const toStr = end.toISOString().slice(0, 10);

    Promise.all([
      supabase
        .from("appointments")
        .select("id, client_id, date, time_start, time_end, price_cents, status, client_name_snapshot, clients(name), services(name), collaborators(id, name)")
        .eq("business_id", business.id)
        .gte("date", fromStr)
        .lte("date", toStr)
        .order("date").order("time_start"),
      supabase.from("collaborators").select("id, name").eq("business_id", business.id).eq("active", true),
    ]).then(([apts, collabs]) => {
      setAppointments((apts.data as unknown as AptRow[]) ?? []);
      setCollaborators((collabs.data as CollabRow[]) ?? []);
      setLoading(false);
    });
  }, [business?.id, monthYear.month, monthYear.year]);

  const filtered = appointments.filter((a) => {
    if (a.date !== selectedDate) return false;
    if (filterStatus !== "todos" && a.status !== filterStatus) return false;
    if (filterCollab !== "todos" && a.collaborators?.id !== filterCollab) return false;
    const name = a.clients?.name ?? a.client_name_snapshot ?? "";
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  const allSelected = filtered.length > 0 && filtered.every((a) => selected.includes(a.id));

  const firstDay = new Date(monthYear.year, monthYear.month, 1).getDay();
  const daysInMonth = new Date(monthYear.year, monthYear.month + 1, 0).getDate();
  const calDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${monthYear.year}-${String(monthYear.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const count = appointments.filter((a) => a.date === dateStr).length;
    return { day: d, date: dateStr, count };
  });

  const monthLabel = new Date(monthYear.year, monthYear.month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-gray-600 text-sm mt-1">Gerencie todos os seus agendamentos</p>
        </div>
        <Link href="/dashboard/agendamentos/novo" className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)]">
          <span className="material-symbols-outlined text-base">add</span>
          Novo
        </Link>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 p-3 mb-4 bg-primary/10 border border-primary/30 rounded-xl">
          <span className="text-primary text-sm font-bold">{selected.length} selecionado(s)</span>
          <div className="flex gap-2 ml-auto">
            <button className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold rounded-lg border border-primary/30 transition-colors">Marcar como compareceu</button>
            <button className="px-3 py-1.5 bg-red-400/10 hover:bg-red-400/20 text-red-400 text-xs font-bold rounded-lg border border-red-400/20 transition-colors">Cancelar selecionados</button>
            <button onClick={() => setSelected([])} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-600 text-xs font-bold rounded-lg border border-white/10 transition-colors">Limpar</button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 min-w-0">
        <div className="lg:col-span-1 min-w-0">
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 capitalize">{monthLabel}</h2>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setMonthYear((m) => (m.month === 0 ? { month: 11, year: m.year - 1 } : { month: m.month - 1, year: m.year }))}
                  className="size-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMonthYear((m) => (m.month === 11 ? { month: 0, year: m.year + 1 } : { month: m.month + 1, year: m.year }))}
                  className="size-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <div key={i} className="text-center text-xs text-gray-500 font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
              {calDays.map(({ day, date, count }) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-semibold transition-all relative ${
                    selectedDate === date ? "bg-primary text-black" : count > 0 ? "hover:bg-gray-100 text-gray-900" : "hover:bg-gray-50 text-gray-500"
                  }`}
                >
                  {day}
                  {count > 0 && selectedDate !== date && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 bg-white border border-gray-200 shadow-sm rounded-xl p-4">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Status</h3>
            <div className="space-y-1">
              <button type="button" onClick={() => setFilterStatus("todos")} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${filterStatus === "todos" ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50"}`}>
                <span className="size-2 rounded-full bg-gray-400" /> Todos
              </button>
              {STATUSES.map((s) => {
                const conf = STATUS_CONFIG[s];
                return (
                  <button key={s} type="button" onClick={() => setFilterStatus(s)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${filterStatus === s ? `bg-primary/10 ${conf.color}` : "text-gray-600 hover:bg-gray-50"}`}>
                    <span className={`size-2 rounded-full ${conf.dot}`} /> {conf.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 min-w-0">
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-base">search</span>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente..." className="w-full h-10 bg-white border border-gray-200 shadow-sm rounded-xl pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-primary transition-colors" />
            </div>
            <select value={filterCollab} onChange={(e) => setFilterCollab(e.target.value)} className="h-10 bg-white border border-gray-200 shadow-sm rounded-xl px-3 text-sm text-gray-900 outline-none focus:border-primary transition-colors">
              <option value="todos">Todos</option>
              {collaborators.map((c) => (
                <option key={c.id} value={c.id}>{c.name.split(" ")[0]}</option>
              ))}
            </select>
          </div>

          {filtered.length > 0 && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <input type="checkbox" id="select-all" checked={allSelected} onChange={() => (allSelected ? setSelected([]) : setSelected(filtered.map((a) => a.id)))} className="accent-primary" />
              <label htmlFor="select-all" className="text-xs text-gray-600">{filtered.length} agendamento(s)</label>
            </div>
          )}

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-gray-600 text-5xl block mb-3">calendar_today</span>
                <p className="text-gray-600 text-sm">Nenhum agendamento neste dia</p>
              </div>
            ) : (
              filtered.map((apt) => {
                const conf = STATUS_CONFIG[apt.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.agendado;
                const clientName = apt.clients?.name ?? apt.client_name_snapshot ?? "Cliente";
                const serviceName = apt.services?.name ?? "—";
                const collabName = apt.collaborators?.name ?? "—";
                const isSelected = selected.includes(apt.id);
                return (
                  <div key={apt.id} className={`bg-white border rounded-xl overflow-hidden transition-all ${isSelected ? "border-primary/60" : "border-gray-200 hover:border-gray-300"}`}>
                    <div className="p-4 flex gap-3 items-start">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(apt.id)} className="accent-primary mt-0.5" />
                      <div className="flex flex-col items-center w-14 flex-shrink-0">
                        <span className="text-gray-900 font-bold text-sm">{formatTime(apt.time_start)}</span>
                        <span className="text-gray-500 text-xs">{formatTime(apt.time_end)}</span>
                      </div>
                      <div className="size-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-primary/80">{clientName[0]?.toUpperCase() ?? "?"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="text-gray-900 font-semibold text-sm">{clientName}</p>
                            <p className="text-gray-600 text-xs mt-0.5">{serviceName} · {collabName}</p>
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
                        <Link href={`/dashboard/clientes/${apt.client_id}`} className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-600 hover:text-gray-900 text-xs rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-xs">visibility</span> Ver cliente
                        </Link>
                      ) : (
                        <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-400 text-xs rounded-lg">
                          <span className="material-symbols-outlined text-xs">visibility</span> Ver cliente
                        </span>
                      )}
                      <button type="button" className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-600 hover:text-gray-900 text-xs rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-xs">chat</span> WhatsApp
                      </button>
                      {(apt.status === "agendado" || (apt.status as AppointmentStatus) === "confirmado") && (
                        <>
                          <button type="button" className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs rounded-lg transition-colors font-semibold">
                            <span className="material-symbols-outlined text-xs">check_circle</span> Compareceu
                          </button>
                          <button type="button" className="flex items-center gap-1 px-3 py-1.5 bg-red-400/10 hover:bg-red-400/20 text-red-400 text-xs rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-xs">person_off</span> Faltou
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
