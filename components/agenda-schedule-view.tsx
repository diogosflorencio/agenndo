"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  localISODate,
  parseTimeToMinutes,
  generateHalfHourSlots,
  startOfWeekMonday,
  addDays,
  labelWeekdayShort,
} from "@/lib/agenda-calendar-helpers";
import { STATUS_CONFIG, formatCurrency, type AppointmentStatus } from "@/lib/utils";

export type AgendaApt = {
  id: string;
  collaborator_id?: string | null;
  date: string;
  time_start: string;
  time_end: string;
  price_cents: number;
  status: string;
  client_name_snapshot: string | null;
  clients: { name: string; phone?: string | null } | null;
  services: { name: string } | null;
  collaborators: { id: string; name: string } | null;
};

export type AgendaCollab = { id: string; name: string };

export type AgendaViewMode = "day" | "week" | "month";

const GRID_START_H = 7;
const GRID_END_H = 22;

function assignColumns<T extends { id: string; startM: number; endM: number }>(events: T[]) {
  const sorted = [...events].sort((a, b) => a.startM - b.startM || a.endM - b.endM);
  const colEnds: number[] = [];
  const placed = sorted.map((e) => {
    let c = colEnds.findIndex((end) => end <= e.startM);
    if (c === -1) {
      c = colEnds.length;
      colEnds.push(e.endM);
    } else {
      colEnds[c] = e.endM;
    }
    return { ...e, col: c };
  });
  const nCol = Math.max(1, colEnds.length);
  return placed.map((r) => ({
    ...r,
    nCol,
    widthPct: 100 / nCol,
    leftPct: (r.col * 100) / nCol,
  }));
}

function formatTimeShort(t: string) {
  const [h, m] = t.split(":");
  return `${h}:${m ?? "00"}`;
}

type Props = {
  appointments: AgendaApt[];
  collaborators: AgendaCollab[];
  selectedDate: string;
  onDateChange: (d: string) => void;
  view: AgendaViewMode;
  onViewChange: (v: AgendaViewMode) => void;
  filterCollab: string;
  onFilterCollab: (id: string) => void;
  showCancelled: boolean;
  onShowCancelled: (v: boolean) => void;
  canCreate: boolean;
  onAppointmentClick?: (id: string) => void;
};

export function AgendaScheduleView({
  appointments,
  collaborators,
  selectedDate,
  onDateChange,
  view,
  onViewChange,
  filterCollab,
  onFilterCollab,
  showCancelled,
  onShowCancelled,
  canCreate,
  onAppointmentClick,
}: Props) {
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [stripScroll, setStripScroll] = useState<HTMLDivElement | null>(null);

  const gridStartMin = GRID_START_H * 60;
  const gridEndMin = GRID_END_H * 60;
  const totalMin = gridEndMin - gridStartMin;
  const slots = useMemo(() => generateHalfHourSlots(GRID_START_H, GRID_END_H), []);

  const selectedD = useMemo(() => new Date(selectedDate + "T12:00:00"), [selectedDate]);

  const collabCols = useMemo(() => {
    if (filterCollab !== "todos") {
      const c = collaborators.find((x) => x.id === filterCollab);
      return c ? [c] : [];
    }
    return collaborators.length ? collaborators : [{ id: "__solo", name: "Agenda" }];
  }, [collaborators, filterCollab]);

  const filteredApts = useMemo(() => {
    return appointments.filter((a) => {
      if (!showCancelled && a.status === "cancelado") return false;
      if (filterCollab !== "todos" && a.collaborators?.id !== filterCollab) return false;
      return true;
    });
  }, [appointments, showCancelled, filterCollab]);

  const dayApts = useMemo(
    () => filteredApts.filter((a) => a.date === selectedDate),
    [filteredApts, selectedDate]
  );

  const weekStart = useMemo(() => startOfWeekMonday(selectedD), [selectedD]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      const ds = localISODate(d);
      const n = filteredApts.filter((a) => a.date === ds).length;
      return { dateStr: ds, d, label: labelWeekdayShort(d), dayNum: d.getDate(), count: n };
    });
  }, [weekStart, filteredApts]);

  const dayStrip = useMemo(() => {
    const center = new Date(selectedDate + "T12:00:00");
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(center, i - 3);
      const ds = localISODate(d);
      const n = filteredApts.filter((a) => a.date === ds).length;
      return {
        dateStr: ds,
        d,
        wk: labelWeekdayShort(d),
        dayNum: d.getDate(),
        count: n,
        isSel: ds === selectedDate,
      };
    });
  }, [selectedDate, filteredApts]);

  const monthCarousel = useMemo(() => {
    const y = selectedD.getFullYear();
    const m = selectedD.getMonth();
    return Array.from({ length: 7 }, (_, i) => {
      const mm = m - 3 + i;
      const dt = new Date(y, mm, 1);
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      const count = filteredApts.filter((a) => {
        const [yy, mo] = a.date.split("-").map(Number);
        return yy === dt.getFullYear() && mo - 1 === dt.getMonth();
      }).length;
      return {
        month: dt.getMonth(),
        year: dt.getFullYear(),
        label: dt.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        isSel: dt.getMonth() === selectedD.getMonth() && dt.getFullYear() === selectedD.getFullYear(),
        key,
        count,
      };
    });
  }, [selectedD, filteredApts]);

  const monthGrid = useMemo(() => {
    const y = selectedD.getFullYear();
    const m = selectedD.getMonth();
    const first = new Date(y, m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: { day: number | null; dateStr: string | null; count: number; inMonth: boolean }[] = [];
    for (let i = 0; i < startPad; i++) {
      const pd = new Date(y, m, -(startPad - i - 1));
      const ds = localISODate(pd);
      cells.push({
        day: pd.getDate(),
        dateStr: ds,
        count: filteredApts.filter((a) => a.date === ds).length,
        inMonth: false,
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        dateStr: ds,
        count: filteredApts.filter((a) => a.date === ds).length,
        inMonth: true,
      });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1]!;
      const nd = new Date(last.dateStr! + "T12:00:00");
      nd.setDate(nd.getDate() + 1);
      const ds = localISODate(nd);
      cells.push({
        day: nd.getDate(),
        dateStr: ds,
        count: filteredApts.filter((a) => a.date === ds).length,
        inMonth: false,
      });
    }
    return cells;
  }, [selectedD, filteredApts]);

  const metrics = useMemo(() => {
    const apts = appointments.filter((a) => a.date === selectedDate);
    const byStatus: Record<string, number> = {};
    for (const a of apts) {
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    }
    const receita = apts.filter((a) => a.status === "compareceu").reduce((s, a) => s + a.price_cents, 0);
    return { total: apts.length, byStatus, receita };
  }, [appointments, selectedDate]);

  const placeEvents = useCallback((apts: AgendaApt[]) => {
    const events = apts.map((a) => ({
      id: a.id,
      startM: parseTimeToMinutes(a.time_start),
      endM: parseTimeToMinutes(a.time_end),
      apt: a,
    }));
    return assignColumns(events);
  }, []);

  const headerTitle = selectedD.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const viewLabel =
    view === "day" ? "Visão diária" : view === "week" ? "Visão semanal" : "Visão mensal";

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Data
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm outline-none focus:border-primary"
            />
          </label>
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onViewChange(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  view === v ? "bg-primary text-black shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => setMetricsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100"
          >
            <span className="material-symbols-outlined text-base">bar_chart</span>
            Métricas do dia
          </button>
          <Link
            href="/dashboard/disponibilidade"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-200"
          >
            <span className="material-symbols-outlined text-base">block</span>
            Bloquear horário
          </Link>
          {canCreate ? (
            <Link
              href="/dashboard/agendamentos/novo"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-black shadow-sm hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Novo agendamento
            </Link>
          ) : (
            <Link
              href="/dashboard/conta"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950"
            >
              Plano / assinatura
            </Link>
          )}
        </div>
      </div>

      {/* Day strip (day view) */}
      {view === "day" && (
        <div className="relative flex items-center gap-1">
          <button
            type="button"
            aria-label="Rolar datas"
            onClick={() => stripScroll?.scrollBy({ left: -160, behavior: "smooth" })}
            className="hidden sm:flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <div
            ref={setStripScroll}
            className="flex flex-1 gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth"
          >
            {dayStrip.map((x) => (
              <button
                key={x.dateStr}
                type="button"
                onClick={() => onDateChange(x.dateStr)}
                className={`flex min-w-[72px] flex-col items-center rounded-xl border px-2 py-2 text-center transition-all shrink-0 ${
                  x.isSel
                    ? "border-primary bg-primary text-black shadow-md"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="text-[10px] font-bold uppercase opacity-80">{x.wk}</span>
                <span className="text-lg font-extrabold leading-tight">{x.dayNum}</span>
                <span
                  className={`mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    x.isSel ? "bg-black/10 text-black" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {x.count}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Rolar datas"
            onClick={() => stripScroll?.scrollBy({ left: 160, behavior: "smooth" })}
            className="hidden sm:flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      )}

      {/* Month carousel */}
      {view === "month" && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => {
              const d = addDays(selectedD, -30);
              onDateChange(localISODate(d));
            }}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-black"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="flex flex-1 gap-2 min-w-0">
            {monthCarousel.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => onDateChange(localISODate(new Date(m.year, m.month, 1)))}
                className={`min-w-[100px] flex-1 rounded-xl border px-3 py-2 text-center transition-all ${
                  m.isSel
                    ? "border-primary bg-primary text-black shadow-md"
                    : "border-gray-200 bg-white text-gray-800 hover:border-gray-300"
                }`}
              >
                <span className="block text-xs font-bold capitalize">{m.label}</span>
                <span className="text-[10px] opacity-80">{m.count} agend.</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const d = addDays(selectedD, 30);
              onDateChange(localISODate(d));
            }}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-black"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Profissionais:</span>
          <button
            type="button"
            onClick={() => onFilterCollab("todos")}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
              filterCollab === "todos" ? "bg-primary text-black" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Todos
          </button>
          {collaborators.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onFilterCollab(c.id)}
              className={`max-w-[200px] truncate rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filterCollab === c.id ? "bg-primary text-black" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              title={c.name}
            >
              {c.name}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => onShowCancelled(e.target.checked)}
            className="accent-primary rounded"
          />
          Mostrar agendamentos cancelados
        </label>
      </div>

      {/* Subheader */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-3">
        <div>
          <p className="text-sm font-bold text-gray-900 capitalize">{headerTitle}</p>
          <p className="text-xs text-gray-500">{viewLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">
            {dayApts.length === 0 ? "Sem atendimentos" : `${dayApts.length} agendamento(s)`}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">
            {String(GRID_START_H).padStart(2, "0")}:00 — {String(GRID_END_H).padStart(2, "0")}:00
          </span>
        </div>
      </div>

      {/* Week timeline */}
      {view === "week" && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="min-w-[720px] flex">
            <div className="w-14 shrink-0 border-r border-gray-100 pt-10">
              {slots.map((s) => (
                <div key={s.label} className="h-10 text-[10px] text-gray-400 pr-1 text-right leading-10">
                  {s.label}
                </div>
              ))}
            </div>
            <div className="flex flex-1 border-l border-gray-100">
              {weekDays.map((wd) => (
                <div
                  key={wd.dateStr}
                  className={`flex-1 min-w-[90px] border-r border-gray-100 last:border-r-0 ${
                    wd.dateStr === selectedDate ? "bg-primary/5" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onDateChange(wd.dateStr)}
                    className={`w-full border-b border-gray-100 py-2 text-center ${
                      wd.dateStr === selectedDate ? "bg-primary/15" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-[10px] font-bold text-gray-500">{wd.label}</div>
                    <div className="text-sm font-extrabold text-gray-900">{wd.dayNum}</div>
                    <div className="text-[10px] text-gray-500">{wd.count}</div>
                  </button>
                  <div className="relative" style={{ height: slots.length * 40 }}>
                    {placeEvents(filteredApts.filter((a) => a.date === wd.dateStr)).map((ev) => {
                      const s = Math.max(ev.startM, gridStartMin);
                      const e = Math.min(ev.endM, gridEndMin);
                      const top = ((s - gridStartMin) / totalMin) * 100;
                      const h = Math.max(4, ((e - s) / totalMin) * 100);
                      const conf =
                        STATUS_CONFIG[ev.apt.status as AppointmentStatus] ?? STATUS_CONFIG.agendado;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => onAppointmentClick?.(ev.apt.id)}
                          className={`absolute overflow-hidden rounded-md border text-left text-[10px] leading-tight shadow-sm ${conf.bg} ${conf.color} border-gray-200/80`}
                          style={{
                            top: `${top}%`,
                            height: `${h}%`,
                            left: `${ev.leftPct}%`,
                            width: `${ev.widthPct}%`,
                          }}
                        >
                          <span className="block font-bold truncate px-0.5">
                            {ev.apt.clients?.name ?? ev.apt.client_name_snapshot ?? "Cliente"}
                          </span>
                          <span className="block truncate px-0.5 opacity-90">
                            {formatTimeShort(ev.apt.time_start)} — {formatTimeShort(ev.apt.time_end)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Day timeline — colunas por profissional */}
      {view === "day" && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="min-w-[640px] flex">
            <div className="w-14 shrink-0 border-r border-gray-100 pt-12">
              {slots.map((s) => (
                <div key={s.label} className="h-10 text-[10px] text-gray-400 pr-1 text-right leading-10">
                  {s.label}
                </div>
              ))}
            </div>
            <div className="flex flex-1">
              {collabCols.map((col) => {
                const colApts = dayApts.filter((a) =>
                  col.id === "__solo" ? true : a.collaborators?.id === col.id
                );
                return (
                  <div key={col.id} className="flex-1 min-w-[140px] border-r border-gray-100 last:border-r-0">
                    <div className="h-12 border-b border-gray-100 px-2 py-1 flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-400 text-lg">person</span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-gray-900 truncate">{col.name}</p>
                        <p className="text-[10px] text-gray-500">({colApts.length})</p>
                      </div>
                    </div>
                    <div className="relative" style={{ height: slots.length * 40 }}>
                      {placeEvents(colApts).map((ev) => {
                        const s = Math.max(ev.startM, gridStartMin);
                        const e = Math.min(ev.endM, gridEndMin);
                        const top = ((s - gridStartMin) / totalMin) * 100;
                        const h = Math.max(5, ((e - s) / totalMin) * 100);
                        const conf =
                          STATUS_CONFIG[ev.apt.status as AppointmentStatus] ?? STATUS_CONFIG.agendado;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => onAppointmentClick?.(ev.apt.id)}
                            className={`absolute overflow-hidden rounded-md border px-1 py-0.5 text-left text-[10px] leading-tight shadow-sm ${conf.bg} ${conf.color} border-gray-200/80`}
                            style={{
                              top: `${top}%`,
                              height: `${h}%`,
                              left: `${ev.leftPct}%`,
                              width: `${ev.widthPct}%`,
                            }}
                          >
                            <span className="block font-bold truncate">
                              {ev.apt.clients?.name ?? ev.apt.client_name_snapshot ?? "Cliente"}
                            </span>
                            <span className="block truncate text-[9px] opacity-90">
                              {ev.apt.services?.name ?? "—"}
                            </span>
                            <span className="block text-[9px] opacity-80">
                              {formatTimeShort(ev.apt.time_start)} – {formatTimeShort(ev.apt.time_end)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Month grid */}
      {view === "month" && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-7 mb-1">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-bold text-gray-500">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-100">
            {monthGrid.map((cell, idx) => (
              <button
                key={`${cell.dateStr}-${idx}`}
                type="button"
                onClick={() => cell.dateStr && onDateChange(cell.dateStr)}
                disabled={!cell.dateStr}
                className={`min-h-[72px] bg-white p-1.5 text-left transition-colors ${
                  !cell.inMonth ? "bg-gray-50/80 text-gray-400" : "text-gray-900"
                } ${cell.dateStr === selectedDate ? "ring-2 ring-primary ring-inset" : "hover:bg-gray-50"}`}
              >
                <span className="block text-sm font-bold">{cell.day}</span>
                {cell.count > 0 && (
                  <span className="mt-1 inline-block rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-gray-800">
                    {cell.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Métricas modal */}
      {metricsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={() => setMetricsOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Métricas do dia</h3>
              <button type="button" onClick={() => setMetricsOpen(false)} className="text-gray-500 hover:text-gray-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="text-2xl font-extrabold text-gray-900 mb-1">{metrics.total}</p>
            <p className="text-xs text-gray-500 mb-4">agendamentos totais</p>
            <p className="text-sm font-semibold text-primary">
              Receita (compareceu): {formatCurrency(metrics.receita / 100)}
            </p>
            <div className="mt-4 space-y-1 text-xs">
              {Object.entries(metrics.byStatus).map(([st, n]) => (
                <div key={st} className="flex justify-between text-gray-700">
                  <span>{STATUS_CONFIG[st as AppointmentStatus]?.label ?? st}</span>
                  <span className="font-bold">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Link
        href="/dashboard/clientes"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 shadow-lg hover:bg-gray-50"
      >
        <span className="material-symbols-outlined text-primary">search</span>
        Buscar cliente
      </Link>
    </div>
  );
}
