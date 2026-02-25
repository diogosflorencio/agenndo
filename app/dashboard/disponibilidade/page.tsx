"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  addDays,
  getDay,
  isBefore,
  getDaysInMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DAYS = [
  { key: "mon", label: "Segunda-feira" },
  { key: "tue", label: "Terça-feira" },
  { key: "wed", label: "Quarta-feira" },
  { key: "thu", label: "Quinta-feira" },
  { key: "fri", label: "Sexta-feira" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

type DaySchedule = {
  active: boolean;
  start: string;
  end: string;
  breaks: { start: string; end: string }[];
};

const DEFAULT_SCHEDULE: Record<string, DaySchedule> = {
  mon: { active: true, start: "09:00", end: "18:00", breaks: [{ start: "12:00", end: "13:00" }] },
  tue: { active: true, start: "09:00", end: "18:00", breaks: [] },
  wed: { active: true, start: "09:00", end: "20:00", breaks: [{ start: "12:00", end: "13:00" }] },
  thu: { active: true, start: "09:00", end: "18:00", breaks: [] },
  fri: { active: true, start: "09:00", end: "20:00", breaks: [] },
  sat: { active: true, start: "08:00", end: "16:00", breaks: [] },
  sun: { active: false, start: "09:00", end: "18:00", breaks: [] },
};

const emptySchedule = (): DaySchedule => ({
  active: true,
  start: "09:00",
  end: "18:00",
  breaks: [],
});

function SingleDayForm({
  schedule,
  onChange,
  compact = false,
}: {
  schedule: DaySchedule;
  onChange: (s: DaySchedule) => void;
  compact?: boolean;
}) {
  const update = (field: keyof DaySchedule, value: unknown) => {
    onChange({ ...schedule, [field]: value });
  };
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => update("active", !schedule.active)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
            schedule.active ? "bg-primary" : "bg-gray-200"
          }`}
        >
          <span
            className="inline-block size-3.5 rounded-full bg-white transition-transform"
            style={{ transform: schedule.active ? "translateX(18px)" : "translateX(2px)" }}
          />
        </button>
        <span className="text-xs text-gray-600">{schedule.active ? "Aberto" : "Fechado"}</span>
      </div>
      {schedule.active && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="time"
              value={schedule.start}
              onChange={(e) => update("start", e.target.value)}
              className="h-8 bg-white border border-gray-200 focus:border-primary rounded-lg px-2 text-gray-900 text-xs outline-none w-20"
            />
            <span className="text-gray-400">–</span>
            <input
              type="time"
              value={schedule.end}
              onChange={(e) => update("end", e.target.value)}
              className="h-8 bg-white border border-gray-200 focus:border-primary rounded-lg px-2 text-gray-900 text-xs outline-none w-20"
            />
          </div>
          {schedule.breaks.map((br, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-wrap">
              <span className="material-symbols-outlined text-yellow-500 text-sm">coffee</span>
              <input
                type="time"
                value={br.start}
                onChange={(e) => {
                  const next = [...schedule.breaks];
                  next[i] = { ...next[i], start: e.target.value };
                  update("breaks", next);
                }}
                className="h-7 w-20 rounded border border-gray-200 px-1.5 text-xs"
              />
              <span className="text-gray-400">–</span>
              <input
                type="time"
                value={br.end}
                onChange={(e) => {
                  const next = [...schedule.breaks];
                  next[i] = { ...next[i], end: e.target.value };
                  update("breaks", next);
                }}
                className="h-7 w-20 rounded border border-gray-200 px-1.5 text-xs"
              />
              <button
                type="button"
                onClick={() => update("breaks", schedule.breaks.filter((_, j) => j !== i))}
                className="text-gray-400 hover:text-red-500"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update("breaks", [...schedule.breaks, { start: "12:00", end: "13:00" }])}
            className="text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined text-xs">add</span>
            Intervalo
          </button>
        </>
      )}
    </div>
  );
}

function MonthScheduleForm({
  calendarMonth,
  onApplyToMonth,
}: {
  calendarMonth: Date;
  onApplyToMonth: (s: DaySchedule) => void;
}) {
  const [tempSchedule, setTempSchedule] = useState<DaySchedule>(emptySchedule());
  return (
    <div className="space-y-3">
      <SingleDayForm schedule={tempSchedule} onChange={setTempSchedule} />
      <button
        type="button"
        onClick={() => onApplyToMonth(tempSchedule)}
        className="w-full py-2.5 bg-primary hover:bg-primary/90 text-black font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-lg">event_available</span>
        Aplicar a todo o mês de {format(calendarMonth, "MMMM", { locale: ptBR })}
      </button>
    </div>
  );
}

function dateToKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function getWeekdayKey(d: Date): string {
  return DAY_KEYS[getDay(d)];
}

export default function DisponibilidadePage() {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [buffer, setBuffer] = useState(15);
  const [minAdvance, setMinAdvance] = useState(2);
  const [maxFutureDays, setMaxFutureDays] = useState(60);
  const [activeTab, setActiveTab] = useState<"padrao" | "excecoes" | "bloqueios">("padrao");

  // Calendário: escopo (padrão = só semanal, dia/semana/mês = período específico)
  const [scope, setScope] = useState<"padrao" | "dia" | "semana" | "mes">("padrao");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [specificSchedules, setSpecificSchedules] = useState<Record<string, DaySchedule>>({});

  const updateDay = (key: string, field: keyof DaySchedule, value: unknown) => {
    setSchedule((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const getScheduleForDate = (d: Date): DaySchedule => {
    const key = dateToKey(d);
    if (specificSchedules[key]) return specificSchedules[key];
    const weekdayKey = getWeekdayKey(d);
    return schedule[weekdayKey] ?? emptySchedule();
  };

  const setScheduleForDate = (d: Date, s: DaySchedule) => {
    setSpecificSchedules((prev) => ({ ...prev, [dateToKey(d)]: s }));
  };

  const calendarWeeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });
    const weeks: Date[][] = [];
    let d = start;
    while (isBefore(d, end) || isSameDay(d, end)) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(d);
        d = addDays(d, 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [calendarMonth]);

  const selectedWeekDates = useMemo(() => {
    if (!selectedDate || scope !== "semana") return [];
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate, scope]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Disponibilidade</h1>
        <p className="text-gray-600 text-sm mt-1">Configure seus horários de atendimento</p>
      </div>

      {/* Calendário + escopo (dia / semana / mês) */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Período a configurar</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "padrao" as const, label: "Padrão semanal" },
              { key: "dia" as const, label: "Um dia" },
              { key: "semana" as const, label: "Uma semana" },
              { key: "mes" as const, label: "Um mês" },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  setScope(s.key);
                  if (s.key === "padrao") setSelectedDate(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  scope === s.key ? "bg-primary text-black" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {scope !== "padrao" && (
          <>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                  className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>
                <span className="text-sm font-bold text-gray-900 capitalize">
                  {format(calendarMonth, "MMMM yyyy", { locale: ptBR })}
                </span>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                  className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((w) => (
                  <div key={w} className="text-[10px] font-semibold text-gray-500 py-1">
                    {w}
                  </div>
                ))}
                {calendarWeeks.flat().map((d) => {
                  const key = dateToKey(d);
                  const isCurrentMonth = isSameMonth(d, calendarMonth);
                  const isSelected =
                    selectedDate &&
                    (scope === "dia" ? isSameDay(d, selectedDate) : scope === "semana" ? selectedWeekDates.some((x) => isSameDay(x, d)) : scope === "mes" && isSameDay(d, selectedDate));
                  const hasOverride = !!specificSchedules[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (!isCurrentMonth) return;
                        setSelectedDate(d);
                      }}
                      className={`min-h-9 rounded-lg text-xs font-medium transition-colors ${
                        !isCurrentMonth ? "text-gray-300" : "text-gray-900 hover:bg-gray-100"
                      } ${isSelected ? "bg-primary text-black" : ""} ${hasOverride ? "ring-1 ring-primary/50" : ""}`}
                    >
                      {format(d, "d")}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {scope === "dia" && "Clique em um dia para definir o horário só daquele dia (ex.: feriado, folga)."}
                {scope === "semana" && "Clique em um dia para configurar a semana inteira (seg a dom)."}
                {scope === "mes" && "Use o botão abaixo para aplicar um horário a todo o mês, ou clique em um dia para alterar só aquele dia."}
              </p>
            </div>

            {/* Mensal: horário único para todo o mês */}
            {scope === "mes" && (
              <div className="p-4 border-b border-gray-100 bg-amber-50/50">
                <h3 className="text-sm font-bold text-gray-900 mb-1">Horário único para todo o mês</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Defina um mesmo horário para todos os dias de {format(calendarMonth, "MMMM 'de' yyyy", { locale: ptBR })} (ex.: horário de férias ou mês especial).
                </p>
                <MonthScheduleForm
                  calendarMonth={calendarMonth}
                  onApplyToMonth={(s) => {
                    const start = startOfMonth(calendarMonth);
                    const n = getDaysInMonth(calendarMonth);
                    setSpecificSchedules((prev) => {
                      const next = { ...prev };
                      for (let i = 0; i < n; i++) {
                        next[dateToKey(addDays(start, i))] = { ...s };
                      }
                      return next;
                    });
                  }}
                />
              </div>
            )}

            {/* Formulário: um dia */}
            {scope === "dia" && selectedDate && (
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-3">
                  Horário para {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h3>
                <SingleDayForm
                  schedule={getScheduleForDate(selectedDate)}
                  onChange={(s) => setScheduleForDate(selectedDate, s)}
                />
              </div>
            )}

            {/* Formulário: semana */}
            {scope === "semana" && selectedWeekDates.length === 7 && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">
                  Semana de {format(selectedWeekDates[0], "d/M")} a {format(selectedWeekDates[6], "d/M/yyyy")}
                </h3>
                {selectedWeekDates.map((d) => (
                  <div key={dateToKey(d)} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-600 w-24 shrink-0">
                      {format(d, "EEE d/M", { locale: ptBR })}
                    </span>
                    <div className="flex-1 min-w-0">
                      <SingleDayForm
                        schedule={getScheduleForDate(d)}
                        onChange={(s) => setScheduleForDate(d, s)}
                        compact
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mês: editar um dia específico (exceção dentro do mês) */}
            {scope === "mes" && selectedDate && (
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-1">Exceção para um dia</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Horário só para {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })} (o restante do mês mantém o que você definiu acima ou o padrão semanal).
                </p>
                <SingleDayForm
                  schedule={getScheduleForDate(selectedDate)}
                  onChange={(s) => setScheduleForDate(selectedDate, s)}
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="space-y-4">
        {/* Hours by day */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-900">Horários por dia da semana</h2>
            <span className="text-xs text-gray-500">Padrão para toda semana</span>
          </div>

          <div className="divide-y divide-gray-200">
            {DAYS.map(({ key, label }) => {
              const day = schedule[key];
              return (
                <div key={key} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={() => updateDay(key, "active", !day.active)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                        day.active ? "bg-primary" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block size-3.5 rounded-full bg-white transition-transform ${
                          day.active ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                        style={{ transform: day.active ? "translateX(18px)" : "translateX(2px)" }}
                      />
                    </button>
                    <span className={`text-sm font-semibold ${day.active ? "text-gray-900" : "text-gray-500"}`}>
                      {label}
                    </span>
                    {!day.active && (
                      <span className="text-xs text-gray-600">Fechado</span>
                    )}
                  </div>

                  {day.active && (
                    <div className="ml-12 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Início</label>
                          <input
                            type="time"
                            value={day.start}
                            onChange={(e) => updateDay(key, "start", e.target.value)}
                            className="h-8 bg-gray-50 border border-gray-200 focus:border-primary rounded-lg px-2 text-gray-900 text-xs outline-none transition-colors"
                          />
                        </div>
                        <span className="text-gray-500">—</span>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-400">Fim</label>
                          <input
                            type="time"
                            value={day.end}
                            onChange={(e) => updateDay(key, "end", e.target.value)}
                            className="h-8 bg-gray-50 border border-gray-200 focus:border-primary rounded-lg px-2 text-gray-900 text-xs outline-none transition-colors"
                          />
                        </div>
                      </div>

                      {day.breaks.map((br, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-yellow-400 text-sm">coffee</span>
                          <span className="text-xs text-gray-400">Intervalo:</span>
                          <input
                            type="time"
                            value={br.start}
                            className="h-7 bg-gray-50 rounded-lg px-2 text-gray-900 text-xs outline-none border border-gray-200 focus:border-primary"
                          />
                          <span className="text-gray-500 text-xs">–</span>
                          <input
                            type="time"
                            value={br.end}
                            className="h-7 bg-gray-50 rounded-lg px-2 text-gray-900 text-xs outline-none border border-gray-200 focus:border-primary"
                          />
                          <button className="text-gray-500 hover:text-red-400 transition-colors">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() =>
                          updateDay(key, "breaks", [
                            ...day.breaks,
                            { start: "12:00", end: "13:00" },
                          ])
                        }
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">add</span>
                        Adicionar intervalo
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Configurações avançadas</h2>

          {[
            {
              label: "Buffer entre atendimentos",
              sublabel: `${buffer}min de folga após cada serviço`,
              value: buffer,
              onChange: setBuffer,
              min: 0,
              max: 60,
              step: 5,
              marks: ["0", "15", "30", "45", "60"],
              unit: "min",
            },
            {
              label: "Antecedência mínima para agendar",
              sublabel: `Clientes só podem agendar com ${minAdvance}h de antecedência`,
              value: minAdvance,
              onChange: setMinAdvance,
              min: 0,
              max: 48,
              step: 1,
              marks: ["0h", "12h", "24h", "48h"],
              unit: "h",
            },
            {
              label: "Máximo de dias futuros",
              sublabel: `Agenda disponível para os próximos ${maxFutureDays} dias`,
              value: maxFutureDays,
              onChange: setMaxFutureDays,
              min: 7,
              max: 365,
              step: 7,
              marks: ["7", "30", "90", "180", "365"],
              unit: " dias",
            },
          ].map((setting) => (
            <div key={setting.label}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">{setting.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{setting.sublabel}</p>
                </div>
                <span className="text-primary font-bold text-sm">
                  {setting.value}{setting.unit}
                </span>
              </div>
              <input
                type="range"
                min={setting.min}
                max={setting.max}
                step={setting.step}
                value={setting.value}
                onChange={(e) => setting.onChange(Number(e.target.value))}
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                {setting.marks.map((m) => <span key={m}>{m}</span>)}
              </div>
            </div>
          ))}
        </div>

        {/* Save button */}
        <button className="w-full py-4 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)] flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-base">save</span>
          Salvar alterações
        </button>
      </div>
    </div>
  );
}
