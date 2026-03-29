"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  addDays,
  eachDayOfInterval,
  parseISO,
  isSameDay,
  isSameMonth,
  isBefore,
  isToday,
  getISOWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/theme-context";
import { UnsavedChangesIndicator } from "@/components/dashboard-unsaved-indicator";
import { cn } from "@/lib/utils";
import {
  DEFAULT_WEEKLY_SCHEDULE,
  UI_DAY_ORDER,
  dateToWeekdayKey,
  emptySchedule,
  sanitizeDaySchedule,
  type DaySchedule,
  type WeekdayKey,
} from "@/lib/disponibilidade";

type WeekKey = WeekdayKey;
type Scope = "padrao" | "dia" | "semana" | "mes";

const dk = (d: Date) => format(d, "yyyy-MM-dd");
const wk = (d: Date): WeekKey => dateToWeekdayKey(d);

// ─── Interactive Timeline (0–24h, 1-min snap) ────────────────────────────────

const TL_LO = 0;    // 00:00
const TL_HI = 1440; // 24:00

function toM(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fromM(m: number) {
  const hh = Math.floor(m / 60).toString().padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}
function tlPct(m: number) {
  return Math.max(0, Math.min(100, ((m - TL_LO) / (TL_HI - TL_LO)) * 100));
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

type DragKind =
  | "start" | "end"
  | { brk: "start"; i: number } | { brk: "end"; i: number }
  | "move" | { brk: "move"; i: number };

function InteractiveTimeline({
  schedule,
  onChange,
  isDark,
}: {
  schedule: DaySchedule;
  onChange: (s: DaySchedule) => void;
  isDark: boolean;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    kind: DragKind;
    startX: number;
    origStart: number; origEnd: number;
    origBrkStart?: number; origBrkEnd?: number;
  } | null>(null);

  const pxToMin = (px: number, width: number) =>
    clamp(Math.round((px / width) * TL_HI), TL_LO, TL_HI);

  const deltaPxToMin = (dpx: number, width: number) =>
    Math.round((dpx / width) * TL_HI);

  const clientX = (e: MouseEvent | TouchEvent) =>
    "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;

  const startDrag = (e: React.MouseEvent | React.TouchEvent, kind: DragKind) => {
    e.preventDefault();
    e.stopPropagation();
    if (!barRef.current) return;
    const cx = "touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
    const brkIdx = typeof kind === "object" && "brk" in kind && "i" in kind ? kind.i : 0;
    dragRef.current = {
      kind,
      startX: cx,
      origStart: toM(schedule.start),
      origEnd: toM(schedule.end),
      origBrkStart: typeof kind === "object" && "brk" in kind
        ? toM(schedule.breaks[brkIdx]?.start ?? "12:00") : undefined,
      origBrkEnd: typeof kind === "object" && "brk" in kind
        ? toM(schedule.breaks[brkIdx]?.end ?? "13:00") : undefined,
    };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!dragRef.current || !barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const cx2 = clientX(ev);
      const absMin = pxToMin(cx2 - rect.left, rect.width);
      const dMin = deltaPxToMin(cx2 - dragRef.current.startX, rect.width);
      const { kind: k, origStart, origEnd, origBrkStart, origBrkEnd } = dragRef.current;
      const s: DaySchedule = { ...schedule, breaks: schedule.breaks.map((b) => ({ ...b })) };

      if (k === "start") {
        s.start = fromM(clamp(absMin, TL_LO, toM(s.end) - 1));
      } else if (k === "end") {
        s.end = fromM(clamp(absMin, toM(s.start) + 1, TL_HI));
      } else if (k === "move") {
        const dur = origEnd - origStart;
        const ns = clamp(origStart + dMin, TL_LO, TL_HI - dur);
        s.start = fromM(ns); s.end = fromM(ns + dur);
      } else if (typeof k === "object" && "brk" in k) {
        const i = k.i;
        if (k.brk === "start") {
          s.breaks[i].start = fromM(clamp(absMin, toM(s.start), toM(s.breaks[i].end) - 1));
        } else if (k.brk === "end") {
          s.breaks[i].end = fromM(clamp(absMin, toM(s.breaks[i].start) + 1, toM(s.end)));
        } else if (k.brk === "move") {
          const dur = (origBrkEnd ?? 0) - (origBrkStart ?? 0);
          const ns = clamp((origBrkStart ?? 0) + dMin, toM(s.start), toM(s.end) - dur);
          s.breaks[i].start = fromM(ns); s.breaks[i].end = fromM(ns + dur);
        }
      }
      onChange(sanitizeDaySchedule({ ...s, active: true }));
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  };

  // Hour marks every 4h for readability
  const hourMarks = [0, 4, 8, 12, 16, 20, 24];
  const lo = tlPct(toM(schedule.start));
  const hi = tlPct(toM(schedule.end));

  return (
    <div className="space-y-2 mb-3">
      {/* Hour labels */}
      <div className="relative h-3 select-none mx-0">
        {hourMarks.map((h) => (
          <span
            key={h}
            className={`absolute text-[9px] font-mono -translate-x-1/2 ${isDark ? "text-white/50" : "text-gray-400"}`}
            style={{ left: `${tlPct(h * 60)}%` }}
          >
            {h === 24 ? "24h" : `${h}h`}
          </span>
        ))}
      </div>

      {/* Bar */}
      <div
        ref={barRef}
        className={`relative h-7 rounded-lg select-none touch-none ${
          isDark
            ? "bg-white/[0.14] ring-1 ring-inset ring-white/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]"
            : "bg-gray-200/70"
        }`}
      >
        {/* Grid lines */}
        {hourMarks.map((h) => (
          <div
            key={h}
            className={`absolute top-0 bottom-0 w-px ${isDark ? "bg-white/25" : "bg-gray-300/60"}`}
            style={{ left: `${tlPct(h * 60)}%` }}
          />
        ))}

        {/* Active range */}
        <div
          className={`absolute top-1 bottom-1 rounded cursor-grab active:cursor-grabbing ${
            isDark ? "bg-primary/85 shadow-[0_0_12px_rgba(19,236,91,0.22)]" : "bg-primary/75"
          }`}
          style={{ left: `${lo}%`, width: `${hi - lo}%` }}
          onMouseDown={(e) => startDrag(e, "move")}
          onTouchStart={(e) => startDrag(e, "move")}
        />

        {/* Breaks */}
        {schedule.breaks.map((br, i) => {
          const blo = tlPct(toM(br.start));
          const bhi = tlPct(toM(br.end));
          return (
            <div
              key={i}
              className={`absolute top-1 bottom-1 rounded cursor-grab active:cursor-grabbing border ${
                isDark ? "bg-[#0a1510] border-white/30 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.35)]" : "bg-gray-100 border-gray-300"
              }`}
              style={{ left: `${blo}%`, width: `${bhi - blo}%` }}
              onMouseDown={(e) => startDrag(e, { brk: "move", i })}
              onTouchStart={(e) => startDrag(e, { brk: "move", i })}
            >
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 size-3 rounded-full border-2 cursor-ew-resize z-10 ${
                  isDark ? "bg-[#0a1510] border-amber-400 shadow-sm" : "bg-white border-amber-500"
                }`}
                onMouseDown={(e) => { e.stopPropagation(); startDrag(e, { brk: "start", i }); }}
                onTouchStart={(e) => { e.stopPropagation(); startDrag(e, { brk: "start", i }); }}
              />
              <div
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 size-3 rounded-full border-2 cursor-ew-resize z-10 ${
                  isDark ? "bg-[#0a1510] border-amber-400 shadow-sm" : "bg-white border-amber-500"
                }`}
                onMouseDown={(e) => { e.stopPropagation(); startDrag(e, { brk: "end", i }); }}
                onTouchStart={(e) => { e.stopPropagation(); startDrag(e, { brk: "end", i }); }}
              />
            </div>
          );
        })}

        {/* Start handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-4 rounded-full border-2 border-primary cursor-ew-resize z-20 ${
            isDark
              ? "bg-[#0a1510] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_2px_8px_rgba(19,236,91,0.25)]"
              : "bg-white shadow"
          }`}
          style={{ left: `${lo}%` }}
          onMouseDown={(e) => startDrag(e, "start")}
          onTouchStart={(e) => startDrag(e, "start")}
        />
        {/* End handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 translate-x-1/2 size-4 rounded-full border-2 border-primary cursor-ew-resize z-20 ${
            isDark
              ? "bg-[#0a1510] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_2px_8px_rgba(19,236,91,0.25)]"
              : "bg-white shadow"
          }`}
          style={{ right: `${100 - hi}%` }}
          onMouseDown={(e) => startDrag(e, "end")}
          onTouchStart={(e) => startDrag(e, "end")}
        />
      </div>
    </div>
  );
}

// ─── Mini Calendar for date/week/month selection ───────────────────────────────

function MiniCalendar({
  scope,
  selDay,
  selWeekMonday,
  selMonth,
  onSelectDay,
  onSelectWeek,
  onSelectMonth,
  isDark,
}: {
  scope: Scope;
  selDay: string;
  selWeekMonday: string;
  selMonth: string;
  onSelectDay: (d: string) => void;
  onSelectWeek: (mon: string) => void;
  onSelectMonth: (m: string) => void;
  isDark: boolean;
}) {
  const today = new Date();
  const monthFloor = startOfMonth(today);

  const [viewMonth, setViewMonth] = useState(() => {
    if (scope === "dia") return startOfMonth(parseISO(selDay));
    if (scope === "semana") return startOfMonth(parseISO(selWeekMonday));
    if (scope === "mes") {
      const [y, m] = selMonth.split("-").map(Number);
      return startOfMonth(new Date(y, m - 1, 1));
    }
    return startOfMonth(today);
  });

  const [mesNavMonth, setMesNavMonth] = useState(() => {
    const [y, m] = selMonth.split("-").map(Number);
    return startOfMonth(new Date(y, m - 1, 1));
  });

  useEffect(() => {
    if (scope !== "mes") return;
    const [y, m] = selMonth.split("-").map(Number);
    setMesNavMonth(startOfMonth(new Date(y, m - 1, 1)));
  }, [scope, selMonth]);

  if (scope === "mes") {
    const goMes = (delta: number) => {
      const next = addMonths(mesNavMonth, delta);
      if (delta < 0 && isBefore(next, monthFloor)) return;
      setMesNavMonth(next);
      onSelectMonth(format(next, "yyyy-MM"));
    };

    return (
      <div className="space-y-3">
        <p className={`text-[10px] ${isDark ? "text-white/35" : "text-gray-500"}`}>
          Avance quantos meses quiser à frente; volte até o mês atual.
        </p>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goMes(-1)}
            disabled={isSameMonth(mesNavMonth, monthFloor)}
            className={`size-9 rounded-lg flex items-center justify-center text-sm transition-colors disabled:opacity-25 disabled:pointer-events-none ${
              isDark ? "hover:bg-white/8 text-white/60" : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            ‹
          </button>
          <span className={`text-sm font-bold capitalize text-center flex-1 ${isDark ? "text-white" : "text-gray-900"}`}>
            {format(mesNavMonth, "MMMM yyyy", { locale: ptBR })}
          </span>
          <button
            type="button"
            onClick={() => goMes(1)}
            className={`size-9 rounded-lg flex items-center justify-center text-sm transition-colors ${
              isDark ? "hover:bg-white/8 text-white/60" : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            ›
          </button>
        </div>
      </div>
    );
  }

  // Calendar grid for dia/semana — semanas começam na segunda (ISO), com coluna de número da semana
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const flatDays = eachDayOfInterval({ start: calStart, end: calEnd });
  const weekRows: Date[][] = [];
  for (let i = 0; i < flatDays.length; i += 7) {
    weekRows.push(flatDays.slice(i, i + 7));
  }

  const selDayDate = scope === "dia" ? parseISO(selDay) : null;
  const selWeekMondayDate = scope === "semana" ? parseISO(selWeekMonday) : null;

  const isInSelWeek = (d: Date) => {
    if (!selWeekMondayDate) return false;
    const sun = addDays(selWeekMondayDate, 6);
    return d >= selWeekMondayDate && d <= sun;
  };

  const isWeekStart = (d: Date) => !!(selWeekMondayDate && isSameDay(d, selWeekMondayDate));
  const isWeekEnd = (d: Date) => !!(selWeekMondayDate && isSameDay(d, addDays(selWeekMondayDate, 6)));

  const weekDayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="space-y-2">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth((v) => addMonths(v, -1))}
          disabled={isSameMonth(viewMonth, today)}
          className={`size-7 rounded-lg flex items-center justify-center text-sm transition-colors disabled:opacity-25 ${
            isDark ? "hover:bg-white/8 text-white/60" : "hover:bg-gray-100 text-gray-600"
          }`}
        >
          ‹
        </button>
        <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-white/60" : "text-gray-700"}`}>
          {format(viewMonth, "MMMM yyyy", { locale: ptBR })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth((v) => addMonths(v, 1))}
          className={`size-7 rounded-lg flex items-center justify-center text-sm transition-colors ${
            isDark ? "hover:bg-white/8 text-white/60" : "hover:bg-gray-100 text-gray-600"
          }`}
        >
          ›
        </button>
      </div>

      <p className={`text-[10px] ${isDark ? "text-white/35" : "text-gray-500"}`}>Semanas com início na segunda · número da semana ISO</p>

      <div
        className="grid gap-0.5 w-full"
        style={{ gridTemplateColumns: "minmax(2rem,auto) repeat(7, minmax(0, 1fr))" }}
      >
        <div />
        {weekDayLabels.map((l) => (
          <div key={l} className={`text-center text-[9px] font-bold py-0.5 ${isDark ? "text-white/35" : "text-gray-400"}`}>
            {l}
          </div>
        ))}
        {weekRows.map((week) => {
          const wn = getISOWeek(week[0]!);
          return (
            <div key={dk(week[0]!)} className="contents">
              <div
                className={`flex items-center justify-center text-[9px] font-bold font-mono tabular-nums leading-none py-1 ${
                  isDark ? "text-white/45" : "text-gray-500"
                }`}
                title={`Semana ISO ${wn}`}
              >
                {wn}
              </div>
              {week.map((d) => {
                const inMonth = isSameMonth(d, viewMonth);
                const isPast = d < today && !isToday(d);
                const isSel = selDayDate ? isSameDay(d, selDayDate) : false;
                const inWeek = isInSelWeek(d);
                const isWS = isWeekStart(d);
                const isWE = isWeekEnd(d);
                const itIsToday = isToday(d);

                return (
                  <button
                    key={dk(d)}
                    type="button"
                    disabled={isPast && !isToday(d)}
                    onClick={() => {
                      if (scope === "dia") onSelectDay(dk(d));
                      else if (scope === "semana") onSelectWeek(dk(startOfWeek(d, { weekStartsOn: 1 })));
                    }}
                    className={`
                relative h-7 w-full flex items-center justify-center text-[11px] font-medium transition-all
                ${!inMonth ? "opacity-20" : ""}
                ${isPast ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                ${isSel ? "bg-primary text-black rounded-lg font-bold" : ""}
                ${inWeek && !isSel ? (isDark ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary") : ""}
                ${isWS && !isSel ? "rounded-l-lg" : ""}
                ${isWE && !isSel ? "rounded-r-lg" : ""}
                ${!isSel && !inWeek && inMonth ? (isDark ? "hover:bg-white/8 text-white/70" : "hover:bg-gray-100 text-gray-700") : ""}
                ${itIsToday && !isSel ? "ring-1 ring-primary/50 rounded-lg" : ""}
              `}
                  >
                    {format(d, "d")}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({ children, className = "", isDark }: { children: React.ReactNode; className?: string; isDark: boolean }) {
  return (
    <div
      className={`rounded-xl border shadow-sm overflow-hidden ${isDark ? "bg-[#080c0a] border-white/10" : "bg-white border-gray-200"} ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
  action,
  isDark,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? "border-white/10" : "border-gray-200"}`}>
      <div>
        <p className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{title}</p>
        {subtitle && <p className={`text-[11px] mt-0.5 ${isDark ? "text-white/45" : "text-gray-500"}`}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function SliderRow({
  label,
  sublabel,
  value,
  onChange,
  min,
  max,
  step,
  marks,
  unit,
  isDark,
}: {
  label: string;
  sublabel: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  marks: string[];
  unit: string;
  isDark: boolean;
}) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <div className={`py-4 border-b last:border-0 ${isDark ? "border-white/10" : "border-gray-100"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{label}</p>
          <p className={`text-[11px] mt-0.5 ${isDark ? "text-white/45" : "text-gray-500"}`}>{sublabel}</p>
        </div>
        <span className="text-sm font-bold font-mono text-primary ml-4 shrink-0">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative h-4 flex items-center">
        <div className={`absolute w-full h-1 rounded-full ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
        <div className="absolute h-1 rounded-full bg-primary" style={{ width: `${p}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full opacity-0 cursor-pointer h-4 z-[2]"
        />
        <div
          className={`absolute size-4 rounded-full pointer-events-none border-2 border-primary bg-white shadow z-[1] transition-transform`}
          style={{ left: `calc(${p}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        {marks.map((m) => (
          <span key={m} className={`text-[9px] font-mono ${isDark ? "text-white/35" : "text-gray-400"}`}>
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

function selectClass(isDark: boolean) {
  return `w-full max-w-md mt-2 rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
    isDark ? "bg-white/5 border-white/10 text-white focus:border-primary" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-primary"
  }`;
}

export default function DisponibilidadePage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Record<WeekKey, DaySchedule>>(() => ({ ...DEFAULT_WEEKLY_SCHEDULE }));
  const [buffer, setBuffer] = useState(0);
  const [minAdvance, setMinAdvance] = useState(0);
  const [maxFutureDays, setMaxFutureDays] = useState(30);
  const [publicBookingTimeUi, setPublicBookingTimeUi] = useState<"slider" | "blocks">("slider");
  const [scope, setScope] = useState<Scope>("padrao");
  const [selDay, setSelDay] = useState(() => dk(new Date()));
  const [selWeekMonday, setSelWeekMonday] = useState(() => dk(startOfWeek(new Date(), { weekStartsOn: 1 })));
  const [selMonth, setSelMonth] = useState(() => format(startOfMonth(new Date()), "yyyy-MM"));
  const [overrides, setOverrides] = useState<Record<string, DaySchedule>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set(UI_DAY_ORDER.map((o) => o.key)));
  const [saveState, setSaveState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  const buildPersistSnapshot = useCallback(() => {
    return JSON.stringify({
      weekly: schedule,
      overrides,
      booking: {
        bufferMinutes: buffer,
        minAdvanceHours: minAdvance,
        maxFutureDays: maxFutureDays,
        publicBookingTimeUi,
      },
    });
  }, [schedule, overrides, buffer, minAdvance, maxFutureDays, publicBookingTimeUi]);

  const isDirty = useMemo(() => {
    if (!hydrated || loadError || savedSnapshot === null) return false;
    return buildPersistSnapshot() !== savedSnapshot;
  }, [hydrated, loadError, savedSnapshot, buildPersistSnapshot]);

  useEffect(() => {
    if (scope === "padrao") setExpandedRows(new Set(UI_DAY_ORDER.map((o) => o.key)));
    else setExpandedRows(new Set());
  }, [scope]);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const r = await fetch("/api/dashboard/availability");
        const data = await r.json();
        if (!ok) return;
        if (!r.ok) {
          setLoadError(data.error ?? "Erro ao carregar");
          setHydrated(true);
          return;
        }
        const wkSch = { ...DEFAULT_WEEKLY_SCHEDULE, ...data.weekly } as Record<WeekKey, DaySchedule>;
        (Object.keys(wkSch) as WeekKey[]).forEach((k) => {
          wkSch[k] = sanitizeDaySchedule({ ...wkSch[k] });
        });
        setSchedule(wkSch);
        const ov = (data.overrides ?? {}) as Record<string, DaySchedule>;
        setOverrides(Object.fromEntries(Object.entries(ov).map(([k, v]) => [k, sanitizeDaySchedule({ ...v })])));
        setBuffer(data.booking?.bufferMinutes ?? 0);
        setMinAdvance(data.booking?.minAdvanceHours ?? 0);
        setMaxFutureDays(data.booking?.maxFutureDays ?? 30);
        setPublicBookingTimeUi(data.booking?.publicBookingTimeUi === "blocks" ? "blocks" : "slider");
        setSavedSnapshot(
          JSON.stringify({
            weekly: wkSch,
            overrides: Object.fromEntries(Object.entries(ov).map(([k, v]) => [k, sanitizeDaySchedule({ ...v })])),
            booking: {
              bufferMinutes: data.booking?.bufferMinutes ?? 0,
              minAdvanceHours: data.booking?.minAdvanceHours ?? 0,
              maxFutureDays: data.booking?.maxFutureDays ?? 30,
              publicBookingTimeUi: data.booking?.publicBookingTimeUi === "blocks" ? "blocks" : "slider",
            },
          })
        );
        setLoadError(null);
      } catch {
        if (ok) setLoadError("Falha de rede");
      } finally {
        if (ok) setHydrated(true);
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  const monthStartDate = useMemo(() => {
    const [y, m] = selMonth.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [selMonth]);

  const toggleExpand = (id: string) =>
    setExpandedRows((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const updateDay = (key: WeekKey, s: DaySchedule) =>
    setSchedule((p) => ({ ...p, [key]: sanitizeDaySchedule(s) }));

  const getForDate = (d: Date): DaySchedule => {
    const raw = overrides[dk(d)] ?? schedule[wk(d)] ?? emptySchedule();
    return sanitizeDaySchedule({ ...raw });
  };

  const setForDate = (d: Date, s: DaySchedule) =>
    setOverrides((p) => ({ ...p, [dk(d)]: sanitizeDaySchedule(s) }));

  // Apply a schedule to every date in a week (Mon–Sun)
  const updateWeekDates = (mondayStr: string, s: DaySchedule) => {
    const clean = sanitizeDaySchedule(s);
    const mon = parseISO(mondayStr);
    setOverrides((p) => {
      const next = { ...p };
      for (let i = 0; i < 7; i++) next[dk(addDays(mon, i))] = { ...clean };
      return next;
    });
  };

  // Apply a schedule to every date in a month
  const updateAllDatesInMonth = (monthStart: Date, s: DaySchedule) => {
    const clean = sanitizeDaySchedule(s);
    const dates = eachDayOfInterval({ start: startOfMonth(monthStart), end: endOfMonth(monthStart) });
    setOverrides((p) => {
      const next = { ...p };
      for (const d of dates) next[dk(d)] = { ...clean };
      return next;
    });
  };

  type ScheduleRow =
    | { id: string; label: string; kind: "weekly"; key: WeekKey }
    | { id: string; label: string; kind: "day"; date: Date }
    | { id: string; label: string; kind: "week"; mondayStr: string }
    | { id: string; label: string; kind: "month"; monthStart: Date };

  const scheduleRows: ScheduleRow[] = useMemo(() => {
    if (scope === "padrao") {
      return UI_DAY_ORDER.map((o) => ({ id: o.key, label: o.label, kind: "weekly" as const, key: o.key }));
    }
    if (scope === "dia") {
      const d = parseISO(selDay);
      return [{ id: selDay, label: format(d, "EEEE, d 'de' MMMM yyyy", { locale: ptBR }), kind: "day" as const, date: d }];
    }
    if (scope === "semana") {
      const mon = parseISO(selWeekMonday);
      const sun = addDays(mon, 6);
      const label = `${format(mon, "d 'de' MMM", { locale: ptBR })} – ${format(sun, "d 'de' MMM yyyy", { locale: ptBR })}`;
      return [{ id: selWeekMonday, label, kind: "week" as const, mondayStr: selWeekMonday }];
    }
    if (scope === "mes") {
      const label = format(monthStartDate, "MMMM yyyy", { locale: ptBR });
      return [{ id: selMonth, label, kind: "month" as const, monthStart: monthStartDate }];
    }
    return [];
  }, [scope, selDay, selWeekMonday, monthStartDate, selMonth]);

  // Get a representative schedule for display (first date of the period, or the weekly default)
  const resolveRowSchedule = (row: ScheduleRow): DaySchedule => {
    if (row.kind === "weekly") return sanitizeDaySchedule({ ...schedule[row.key] });
    if (row.kind === "day") return getForDate(row.date);
    if (row.kind === "week") {
      // Use Monday as representative
      return getForDate(parseISO(row.mondayStr));
    }
    if (row.kind === "month") {
      return getForDate(row.monthStart);
    }
    return emptySchedule();
  };

  const applyRowChange = (row: ScheduleRow, s: DaySchedule) => {
    if (row.kind === "weekly") updateDay(row.key, s);
    else if (row.kind === "day") setForDate(row.date, s);
    else if (row.kind === "week") updateWeekDates(row.mondayStr, s);
    else if (row.kind === "month") updateAllDatesInMonth(row.monthStart, s);
  };

  const clearOverridesForCurrentPeriod = useCallback(() => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (scope === "dia") {
        delete next[selDay];
      } else if (scope === "semana") {
        const mon = parseISO(selWeekMonday);
        for (let i = 0; i < 7; i++) delete next[dk(addDays(mon, i))];
      } else if (scope === "mes") {
        for (const d of eachDayOfInterval({ start: startOfMonth(monthStartDate), end: endOfMonth(monthStartDate) })) {
          delete next[dk(d)];
        }
      } else if (scope === "padrao") {
        return {};
      }
      return next;
    });
  }, [scope, selDay, selWeekMonday, monthStartDate]);

  const save = useCallback(async () => {
    setSaveState("loading");
    setSaveError(null);
    try {
      const r = await fetch("/api/dashboard/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekly: schedule,
          overrides,
          booking: {
            bufferMinutes: buffer,
            minAdvanceHours: minAdvance,
            maxFutureDays: maxFutureDays,
            publicBookingTimeUi,
          },
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao salvar");
      setSavedSnapshot(buildPersistSnapshot());
      setSaveState("ok");
      setTimeout(() => setSaveState("idle"), 2200);
    } catch (e) {
      setSaveState("err");
      setSaveError(e instanceof Error ? e.message : "Erro");
    }
  }, [schedule, overrides, buffer, minAdvance, maxFutureDays, publicBookingTimeUi, buildPersistSnapshot]);

  const personalizedCount = Object.keys(overrides).length;

  /** Maior janela início→fim entre dias ativos do modelo semanal (para aviso slider vs blocos). */
  const maxExpedienteMinutesWeek = useMemo(() => {
    let max = 0;
    for (const { key } of UI_DAY_ORDER) {
      const d = schedule[key];
      if (!d?.active) continue;
      max = Math.max(max, toM(d.end) - toM(d.start));
    }
    return max;
  }, [schedule]);

  const pageBg = isDark ? "bg-[#020403]" : "bg-gray-50";
  const textMuted = isDark ? "text-white/50" : "text-gray-600";

  const horariosCardTitle = useMemo(() => {
    switch (scope) {
      case "padrao":
        return "Horários de todos os dias não personalizados";
      case "dia":
        return `Horário do dia — ${format(parseISO(selDay), "d 'de' MMMM yyyy", { locale: ptBR })}`;
      case "semana":
        return "Horários da semana selecionada";
      case "mes":
        return `Horários do mês — ${format(monthStartDate, "MMMM yyyy", { locale: ptBR })}`;
      default:
        return "Horários";
    }
  }, [scope, selDay, monthStartDate]);

  const horariosSubtitle = useMemo(() => {
    switch (scope) {
      case "padrao":
        return "Modelo semanal: vale para qualquer data em que não haja personalização por dia, semana ou mês";
      case "dia":
        return "Altera só este dia; use o botão acima para voltar ao padrão semanal nesta data";
      case "semana":
        return "Um único conjunto de horários para os 7 dias desta semana";
      case "mes":
        return "Um único conjunto de horários para todos os dias deste mês";
      default:
        return "";
    }
  }, [scope]);

  const hasCurrentPeriodOverrides = useMemo(() => {
    if (scope === "padrao") return Object.keys(overrides).length > 0;
    if (scope === "dia") return Object.prototype.hasOwnProperty.call(overrides, selDay);
    if (scope === "semana") {
      const mon = parseISO(selWeekMonday);
      return Array.from({ length: 7 }, (_, i) => dk(addDays(mon, i))).some((key) => Object.prototype.hasOwnProperty.call(overrides, key));
    }
    if (scope === "mes") {
      return eachDayOfInterval({ start: startOfMonth(monthStartDate), end: endOfMonth(monthStartDate) }).some((d) =>
        Object.prototype.hasOwnProperty.call(overrides, dk(d))
      );
    }
    return false;
  }, [scope, selDay, selWeekMonday, monthStartDate, overrides]);

  // Determine selected display label for period card — must be before any conditional return
  const periodLabel = useMemo(() => {
    if (scope === "padrao") return "Todas as semanas";
    if (scope === "dia") return format(parseISO(selDay), "d 'de' MMMM yyyy", { locale: ptBR });
    if (scope === "semana") {
      const mon = parseISO(selWeekMonday);
      return `${format(mon, "d MMM", { locale: ptBR })} – ${format(addDays(mon, 6), "d MMM yyyy", { locale: ptBR })}`;
    }
    if (scope === "mes") {
      const [y, m] = selMonth.split("-").map(Number);
      return format(new Date(y, m - 1, 1), "MMMM yyyy", { locale: ptBR });
    }
    return "";
  }, [scope, selDay, selWeekMonday, selMonth]);

  if (!hydrated) {
    return (
      <div className={`w-full min-h-[40vh] flex items-center justify-center text-sm ${pageBg} ${textMuted}`}>
        Carregando disponibilidade…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`w-full p-6 rounded-xl border ${isDark ? "bg-[#080c0a] border-red-500/30 text-red-300" : "bg-white border-red-200 text-red-700"}`}>
        <p>{loadError}</p>
        <p className={`text-xs mt-2 ${isDark ? "text-white/40" : "text-gray-500"}`}>
          Se o erro citar colunas em notification_settings, aplique a migração <code className="text-xs">20250331_notification_booking_fields.sql</code>.
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full ${pageBg} min-h-full pb-8`}>
      <style>{`
        input[type="time"]::-webkit-calendar-picker-indicator { opacity: 0.6; }
      `}</style>

      <div className="w-full px-1 sm:px-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                Disponibilidade
              </h1>
              <UnsavedChangesIndicator dirty={isDirty} variant="inline" />
            </div>
            <p className={`text-sm mt-1 ${textMuted}`}>
              Horários salvos no servidor
              {personalizedCount > 0 && (
                <span className={`ml-2 text-xs ${isDark ? "text-white/40" : "text-gray-500"}`}>
                  · {personalizedCount} data{personalizedCount !== 1 ? "s" : ""} com horário próprio (o padrão semanal não se aplica a elas até você remover)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="w-full space-y-6">
          {/* ── Card 1: Período a configurar ── */}
          <Card isDark={isDark}>
            <CardHeader
              title="Período a configurar"
              subtitle="Escolha o tipo e o recorte (a partir de hoje e próximos períodos)"
              isDark={isDark}
            />
            <div className="px-5 py-4 space-y-4">
              {/* Scope tabs */}
              <div className={`inline-flex rounded-xl border p-1 gap-0.5 ${isDark ? "bg-white/5 border-white/8" : "bg-gray-100 border-gray-200"}`}>
                {(
                  [
                    { value: "padrao", label: "Padrão" },
                    { value: "dia", label: "Dia" },
                    { value: "semana", label: "Semana" },
                    { value: "mes", label: "Mês" },
                  ] as { value: Scope; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScope(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      scope === opt.value
                        ? "bg-primary text-black shadow-sm"
                        : isDark
                        ? "text-white/50 hover:text-white"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Selected period pill */}
              {scope !== "padrao" && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  isDark ? "border-primary/30 bg-primary/10 text-primary" : "border-primary/20 bg-primary/5 text-primary"
                }`}>
                  <span className="size-1.5 rounded-full bg-primary" />
                  {periodLabel}
                </div>
              )}

              {/* Calendar / picker */}
              <AnimatePresence mode="wait">
                {scope !== "padrao" && (
                  <motion.div
                    key={scope}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className={`p-4 rounded-xl border ${isDark ? "bg-white/[0.03] border-white/8" : "bg-gray-50 border-gray-200"}`}
                  >
                    <MiniCalendar
                      scope={scope}
                      selDay={selDay}
                      selWeekMonday={selWeekMonday}
                      selMonth={selMonth}
                      onSelectDay={setSelDay}
                      onSelectWeek={setSelWeekMonday}
                      onSelectMonth={setSelMonth}
                      isDark={isDark}
                    />
                  </motion.div>
                )}
                {scope === "padrao" && (
                  <motion.p
                    key="padrao-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`text-xs ${isDark ? "text-white/45" : "text-gray-500"}`}
                  >
                    O padrão vale para qualquer semana, exceto nas datas em que você personalizar por dia, semana ou mês.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {/* ── Card 2: Horários (título conforme o período) ── */}
          <Card isDark={isDark}>
            <CardHeader
              title={horariosCardTitle}
              subtitle={horariosSubtitle}
              isDark={isDark}
              action={
                hasCurrentPeriodOverrides ? (
                  <button
                    type="button"
                    onClick={() => clearOverridesForCurrentPeriod()}
                    className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                      isDark
                        ? "border-white/15 text-white/70 hover:bg-white/10 hover:text-white"
                        : "border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {scope === "padrao" ? "Limpar todas as datas personalizadas" : "Voltar ao padrão neste período"}
                  </button>
                ) : undefined
              }
            />
            <div className={`divide-y ${isDark ? "divide-white/[0.06]" : "divide-gray-100"}`}>
              {scheduleRows.map((row, idx) => {
                const day = resolveRowSchedule(row);
                const expanded = expandedRows.has(row.id);
                return (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(row.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
                    >
                      <span className={`text-sm font-semibold min-w-0 flex-1 truncate ${isDark ? "text-white" : "text-gray-900"}`}>{row.label}</span>
                      <span
                        className={`text-[10px] font-mono shrink-0 ${
                          day.active ? (isDark ? "text-white/45" : "text-gray-500") : isDark ? "text-white/35 italic" : "text-gray-400 italic"
                        }`}
                      >
                        {day.active ? `${day.start}–${day.end}` : "Não trabalho"}
                      </span>
                      <span className={`text-[10px] shrink-0 ${isDark ? "text-white/35" : "text-gray-400"}`} aria-hidden>
                        {expanded ? "▲" : "▼"}
                      </span>
                    </button>
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className={`px-4 pb-5 pt-2 ${isDark ? "bg-white/[0.02]" : "bg-gray-50/50"}`}>
                            <div className="space-y-3">
                              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={!day.active}
                                  onChange={(e) => {
                                    const noWork = e.target.checked;
                                    applyRowChange(row, sanitizeDaySchedule({ ...day, active: !noWork }));
                                  }}
                                  className={`size-3.5 rounded border shrink-0 ${isDark ? "border-white/20 bg-white/5" : "border-gray-300"}`}
                                />
                                <span className={`text-xs font-medium ${isDark ? "text-white/75" : "text-gray-800"}`}>
                                  Não trabalho — sem atendimento neste período
                                </span>
                              </label>
                              {day.active ? (
                                <>
                                  <InteractiveTimeline
                                    schedule={day}
                                    onChange={(s) => applyRowChange(row, s)}
                                    isDark={isDark}
                                  />
                                  <div className="flex items-center gap-2 flex-wrap pl-1">
                                    <div className="size-1.5 rounded-full bg-primary shrink-0" />
                                    <span className={`text-[10px] font-medium uppercase tracking-wide ${isDark ? "text-white/45" : "text-gray-500"}`}>Horário</span>
                                    <input
                                      type="time"
                                      step={60}
                                      value={day.start}
                                      onChange={(e) => applyRowChange(row, sanitizeDaySchedule({ ...day, start: e.target.value }))}
                                      className={`h-8 w-[84px] rounded-lg px-2 text-xs font-mono outline-none border transition-colors ${isDark ? "bg-white/5 border-white/10 text-white focus:border-primary" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-primary"}`}
                                    />
                                    <span className={`text-xs ${isDark ? "text-white/40" : "text-gray-500"}`}>até</span>
                                    <input
                                      type="time"
                                      step={60}
                                      value={day.end}
                                      onChange={(e) => applyRowChange(row, sanitizeDaySchedule({ ...day, end: e.target.value }))}
                                      className={`h-8 w-[84px] rounded-lg px-2 text-xs font-mono outline-none border transition-colors ${isDark ? "bg-white/5 border-white/10 text-white focus:border-primary" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-primary"}`}
                                    />
                                  </div>
                                  {day.breaks.map((br, i) => (
                                    <div key={i} className="flex items-center gap-2 flex-wrap pl-1">
                                      <div className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                                      <span className={`text-[10px] font-medium uppercase tracking-wide ${isDark ? "text-white/45" : "text-gray-500"}`}>Intervalo</span>
                                      <input
                                        type="time"
                                        step={60}
                                        value={br.start}
                                        onChange={(e) => {
                                          const n = [...day.breaks];
                                          n[i] = { ...n[i], start: e.target.value };
                                          applyRowChange(row, sanitizeDaySchedule({ ...day, breaks: n }));
                                        }}
                                        className={`h-8 w-[84px] rounded-lg px-2 text-xs font-mono outline-none border ${isDark ? "bg-white/5 border-white/10 text-white focus:border-primary" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-primary"}`}
                                      />
                                      <span className={`text-xs ${isDark ? "text-white/40" : "text-gray-500"}`}>–</span>
                                      <input
                                        type="time"
                                        step={60}
                                        value={br.end}
                                        onChange={(e) => {
                                          const n = [...day.breaks];
                                          n[i] = { ...n[i], end: e.target.value };
                                          applyRowChange(row, sanitizeDaySchedule({ ...day, breaks: n }));
                                        }}
                                        className={`h-8 w-[84px] rounded-lg px-2 text-xs font-mono outline-none border ${isDark ? "bg-white/5 border-white/10 text-white focus:border-primary" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-primary"}`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          applyRowChange(row, sanitizeDaySchedule({ ...day, breaks: day.breaks.filter((_, j) => j !== i) }))
                                        }
                                        className={`size-5 rounded flex items-center justify-center ${isDark ? "text-white/40 hover:text-red-400" : "text-gray-400 hover:text-red-600"}`}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      applyRowChange(row, sanitizeDaySchedule({ ...day, breaks: [...day.breaks, { start: "12:00", end: "13:00" }] }))
                                    }
                                    className={`flex items-center gap-1.5 text-xs pl-1 ${isDark ? "text-white/50 hover:text-primary" : "text-gray-500 hover:text-primary"}`}
                                  >
                                    + intervalo
                                  </button>
                                </>
                              ) : (
                                <p className={`text-xs pl-0.5 ${isDark ? "text-white/40" : "text-gray-500"}`}>
                                  Nenhum horário disponível para agendamento neste recorte. Desmarque a opção acima para definir expediente.
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </Card>

          {/* ── Card 3: Regras de agendamento (LAST, as requested) ── */}
          <Card isDark={isDark}>
            <CardHeader
              title="Regras de agendamento"
              subtitle="Controle como os clientes podem reservar horários com você. Valores mais restritivos reduzem opções no link público; valores mais abertos exigem mais organização no dia a dia."
              isDark={isDark}
            />
            <div className="px-5">
              <p
                className={`text-xs leading-relaxed mb-4 rounded-lg px-3 py-2.5 border ${
                  isDark ? "border-primary/25 bg-primary/5 text-gray-300" : "border-primary/20 bg-primary/5 text-gray-700"
                }`}
              >
                <span className="font-semibold text-primary">Intervalo entre atendimentos:</span> idealmente deixe em{" "}
                <strong>zero</strong>. Ao colocar um intervalo, você limita as possibilidades de encaixe no agendamento
                público além do tempo do próprio serviço: os inícios válidos passam a saltar de acordo com{" "}
                <strong>duração do serviço + esse intervalo</strong> (não há mais encaixe minuto a minuto).
              </p>
              <SliderRow
                label="Intervalo entre atendimentos"
                sublabel={
                  buffer === 0
                    ? "Sem intervalo — próximo cliente entra imediatamente"
                    : `${buffer} min de folga entre o fim de um serviço e o início do próximo`
                }
                value={buffer}
                onChange={setBuffer}
                min={0}
                max={120}
                step={1}
                marks={["0", "30", "60", "90", "120"]}
                unit=" min"
                isDark={isDark}
              />
              <SliderRow
                label="Aviso prévio mínimo"
                sublabel={
                  minAdvance === 0
                    ? "Agendamento imediato permitido — sem aviso mínimo"
                    : `Cliente precisa agendar com pelo menos ${minAdvance}h de antecedência`
                }
                value={minAdvance}
                onChange={setMinAdvance}
                min={0}
                max={48}
                step={1}
                marks={["0h", "12h", "24h", "36h", "48h"]}
                unit="h"
                isDark={isDark}
              />
              <SliderRow
                label="Horizonte de agendamento"
                sublabel={`Clientes podem reservar horários com até ${maxFutureDays} dias de antecedência`}
                value={maxFutureDays}
                onChange={setMaxFutureDays}
                min={1}
                max={365}
                step={1}
                marks={["1", "30", "90", "180", "365"]}
                unit=" dias"
                isDark={isDark}
              />
            </div>
          </Card>

          <Card isDark={isDark}>
            <CardHeader
              title="Página pública: escolha do horário"
              subtitle="Define como aparece o passo de horários no link do seu negócio (mesma opção no celular e no computador)."
              isDark={isDark}
            />
            <div className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={cn(
                    "relative flex cursor-pointer rounded-xl border p-4 transition-all",
                    publicBookingTimeUi === "slider"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/35 shadow-[0_0_0_1px_rgba(19,236,91,0.2)]"
                      : isDark
                        ? "border-white/10 bg-white/[0.03] hover:border-white/20"
                        : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <input
                    type="radio"
                    name="publicBookingTimeUi"
                    className="sr-only"
                    checked={publicBookingTimeUi === "slider"}
                    onChange={() => setPublicBookingTimeUi("slider")}
                  />
                  <div className="flex gap-3 min-w-0">
                    <span className="material-symbols-outlined text-primary text-2xl shrink-0" aria-hidden>
                      view_timeline
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Linha do tempo</p>
                      <p className={`text-xs mt-1 leading-relaxed ${isDark ? "text-white/50" : "text-gray-500"}`}>
                        Arrastar o bloco no expediente para escolher o início do atendimento.
                      </p>
                    </div>
                  </div>
                </label>
                <label
                  className={cn(
                    "relative flex cursor-pointer rounded-xl border p-4 transition-all",
                    publicBookingTimeUi === "blocks"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/35 shadow-[0_0_0_1px_rgba(19,236,91,0.2)]"
                      : isDark
                        ? "border-white/10 bg-white/[0.03] hover:border-white/20"
                        : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <input
                    type="radio"
                    name="publicBookingTimeUi"
                    className="sr-only"
                    checked={publicBookingTimeUi === "blocks"}
                    onChange={() => setPublicBookingTimeUi("blocks")}
                  />
                  <div className="flex gap-3 min-w-0">
                    <span className="material-symbols-outlined text-primary text-2xl shrink-0" aria-hidden>
                      grid_view
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                        Blocos de horários
                      </p>
                      <p className={`text-xs mt-1 leading-relaxed ${isDark ? "text-white/50" : "text-gray-500"}`}>
                        Grade com botões (manhã, tarde, noite) — toque no horário livre.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {maxExpedienteMinutesWeek > 600 && (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 flex gap-3 text-sm leading-relaxed",
                    isDark
                      ? "border-amber-400/35 bg-amber-500/10 text-amber-100/95"
                      : "border-amber-200 bg-amber-50 text-amber-950"
                  )}
                >
                  <span className="material-symbols-outlined text-xl shrink-0 text-amber-500">info</span>
                  <p>
                    <span className="font-semibold">Expediente longo (mais de 10h entre abertura e fechamento no modelo semanal).</span>{" "}
                    Nesse caso a <strong>linha do tempo</strong> (slider) na página pública tende a ficar muito comprimida e difícil de usar no celular.
                    O mais indicado é <strong>Blocos de horários</strong>.
                    {publicBookingTimeUi === "slider" ? (
                      <span className="block mt-1.5 font-medium text-amber-700 dark:text-amber-200/95">
                        Você está com a linha do tempo ativa — considere mudar para blocos e salvar.
                      </span>
                    ) : null}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <UnsavedChangesIndicator dirty={isDirty} className="w-full" />

          {saveError && <p className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>{saveError}</p>}
          <button
            type="button"
            disabled={saveState === "loading"}
            onClick={() => void save()}
            className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              saveState === "ok"
                ? "bg-primary/15 text-primary border border-primary/30"
                : isDirty
                  ? "bg-primary text-black hover:opacity-90 ring-2 ring-amber-500/50 ring-offset-2 ring-offset-transparent"
                  : "bg-primary text-black hover:opacity-90"
            } disabled:opacity-50`}
          >
            {saveState === "loading" ? "Salvando…" : saveState === "ok" ? "Salvo no servidor" : "Salvar no servidor"}
          </button>
        </div>
      </div>
    </div>
  );
}