"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addMonths,
  addDays,
  eachDayOfInterval,
  startOfYear,
  endOfYear,
  getYear,
  parseISO,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/theme-context";
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
type Scope = "padrao" | "dia" | "semana" | "mes" | "ano";

const dk = (d: Date) => format(d, "yyyy-MM-dd");
const wk = (d: Date): WeekKey => dateToWeekdayKey(d);
const toM = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fromM = (m: number) => {
  const hh = Math.floor(m / 60).toString().padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
};
const pct = (m: number, lo = 480, hi = 1320) => Math.max(0, Math.min(100, ((m - lo) / (hi - lo)) * 100));
const TIMELINE_LO = 480; // 08:00
const TIMELINE_HI = 1320; // 22:00

function firstDateForWeekdayInMonth(monthStart: Date, key: WeekKey): Date {
  const start = startOfMonth(monthStart);
  const end = endOfMonth(monthStart);
  const hit = eachDayOfInterval({ start, end }).find((d) => dateToWeekdayKey(d) === key);
  return hit ?? start;
}

function firstDateForWeekdayInYear(year: number, key: WeekKey): Date {
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(start);
  const hit = eachDayOfInterval({ start, end }).find((d) => dateToWeekdayKey(d) === key);
  return hit ?? start;
}

function allDatesInMonthForWeekday(monthStart: Date, key: WeekKey): Date[] {
  return eachDayOfInterval({ start: startOfMonth(monthStart), end: endOfMonth(monthStart) }).filter(
    (d) => dateToWeekdayKey(d) === key
  );
}

function allDatesInYearForWeekday(year: number, key: WeekKey): Date[] {
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(start);
  return eachDayOfInterval({ start, end }).filter((d) => dateToWeekdayKey(d) === key);
}

// ─── Interactive Timeline Component ──────────────────────────────────────────
const SNAP = 15; // snap to 15min

function snapMin(m: number) {
  return Math.round(m / SNAP) * SNAP;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

type DragTarget =
  | { kind: "start" }
  | { kind: "end" }
  | { kind: "breakStart"; i: number }
  | { kind: "breakEnd"; i: number }
  | { kind: "move" }
  | { kind: "breakMove"; i: number }
  | null;

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
    target: DragTarget;
    startX: number;
    startMin: number;
    startEnd: number;
    breakStart?: number;
    breakEnd?: number;
  } | null>(null);

  const pctOf = (m: number) => pct(m, TIMELINE_LO, TIMELINE_HI);
  const minFromPct = (p: number) => snapMin(clamp(TIMELINE_LO + p * (TIMELINE_HI - TIMELINE_LO), TIMELINE_LO, TIMELINE_HI));

  const getClientX = (e: MouseEvent | TouchEvent) =>
    "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;

  const startDrag = (e: React.MouseEvent | React.TouchEvent, target: DragTarget) => {
    e.preventDefault();
    e.stopPropagation();
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const breakIdx = target && "i" in target ? target.i : 0;
    dragRef.current = {
      target,
      startX: clientX,
      startMin: toM(schedule.start),
      startEnd: toM(schedule.end),
      breakStart: target && "i" in target ? toM(schedule.breaks[breakIdx]?.start ?? "12:00") : undefined,
      breakEnd: target && "i" in target ? toM(schedule.breaks[breakIdx]?.end ?? "13:00") : undefined,
    };

    const move = (ev: MouseEvent | TouchEvent) => {
      if (!dragRef.current || !barRef.current) return;
      const r = barRef.current.getBoundingClientRect();
      const cx = getClientX(ev);
      const p = clamp((cx - r.left) / r.width, 0, 1);
      const newMin = minFromPct(p);
      const drag = dragRef.current;
      const t = drag.target;
      if (!t) return;

      const s = { ...schedule, breaks: schedule.breaks.map((b) => ({ ...b })) };

      if (t.kind === "start") {
        s.start = fromM(clamp(newMin, TIMELINE_LO, toM(s.end) - SNAP));
      } else if (t.kind === "end") {
        s.end = fromM(clamp(newMin, toM(s.start) + SNAP, TIMELINE_HI));
      } else if (t.kind === "breakStart" && s.breaks[t.i]) {
        s.breaks[t.i].start = fromM(clamp(newMin, toM(s.start), toM(s.breaks[t.i].end) - SNAP));
      } else if (t.kind === "breakEnd" && s.breaks[t.i]) {
        s.breaks[t.i].end = fromM(clamp(newMin, toM(s.breaks[t.i].start) + SNAP, toM(s.end)));
      } else if (t.kind === "move") {
        const delta = snapMin((cx - drag.startX) / r.width * (TIMELINE_HI - TIMELINE_LO));
        const dur = drag.startEnd - drag.startMin;
        const ns = clamp(drag.startMin + delta, TIMELINE_LO, TIMELINE_HI - dur);
        s.start = fromM(ns);
        s.end = fromM(ns + dur);
      } else if (t.kind === "breakMove" && s.breaks[t.i]) {
        const delta = snapMin((cx - drag.startX) / r.width * (TIMELINE_HI - TIMELINE_LO));
        const dur = (drag.breakEnd ?? 0) - (drag.breakStart ?? 0);
        const ns = clamp((drag.breakStart ?? 0) + delta, toM(s.start), toM(s.end) - dur);
        s.breaks[t.i].start = fromM(ns);
        s.breaks[t.i].end = fromM(ns + dur);
      }

      onChange(sanitizeDaySchedule({ ...s, active: true }));
    };

    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  };

  const hourMarks = useMemo(() => {
    const marks = [];
    for (let h = 8; h <= 22; h += 2) {
      marks.push({ m: h * 60, label: `${h}h` });
    }
    return marks;
  }, []);

  const lo = pctOf(toM(schedule.start));
  const hi = pctOf(toM(schedule.end));

  const handleRadius = 7;

  return (
    <div className="space-y-3">
      {/* Hour labels */}
      <div className="relative h-4 select-none">
        {hourMarks.map((hm) => (
          <span
            key={hm.m}
            className={`absolute text-[9px] font-mono -translate-x-1/2 ${isDark ? "text-white/30" : "text-gray-400"}`}
            style={{ left: `${pctOf(hm.m)}%` }}
          >
            {hm.label}
          </span>
        ))}
      </div>

      {/* Main timeline bar */}
      <div
        ref={barRef}
        className={`relative h-8 rounded-lg select-none touch-none ${isDark ? "bg-white/8" : "bg-gray-100"}`}
        style={{ cursor: "default" }}
      >
        {/* Grid lines */}
        {hourMarks.map((hm) => (
          <div
            key={hm.m}
            className={`absolute top-0 bottom-0 w-px ${isDark ? "bg-white/8" : "bg-gray-200"}`}
            style={{ left: `${pctOf(hm.m)}%` }}
          />
        ))}

        {/* Active range */}
        <div
          className="absolute top-1 bottom-1 rounded cursor-grab active:cursor-grabbing bg-primary/80"
          style={{ left: `${lo}%`, width: `${hi - lo}%` }}
          onMouseDown={(e) => startDrag(e, { kind: "move" })}
          onTouchStart={(e) => startDrag(e, { kind: "move" })}
          title="Arrastar para mover"
        />

        {/* Break cutouts */}
        {schedule.breaks.map((br, i) => {
          const blo = pctOf(toM(br.start));
          const bhi = pctOf(toM(br.end));
          return (
            <div
              key={i}
              className={`absolute top-1 bottom-1 rounded cursor-grab active:cursor-grabbing border ${
                isDark ? "bg-[#020403] border-white/10" : "bg-gray-100 border-gray-200"
              }`}
              style={{ left: `${blo}%`, width: `${bhi - blo}%` }}
              onMouseDown={(e) => startDrag(e, { kind: "breakMove", i })}
              onTouchStart={(e) => startDrag(e, { kind: "breakMove", i })}
              title="Arrastar intervalo"
            >
              {/* break handles */}
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 size-3 rounded-full border-2 cursor-ew-resize z-10 ${
                  isDark ? "bg-[#020403] border-amber-400" : "bg-white border-amber-500"
                }`}
                onMouseDown={(e) => { e.stopPropagation(); startDrag(e, { kind: "breakStart", i }); }}
                onTouchStart={(e) => { e.stopPropagation(); startDrag(e, { kind: "breakStart", i }); }}
              />
              <div
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 size-3 rounded-full border-2 cursor-ew-resize z-10 ${
                  isDark ? "bg-[#020403] border-amber-400" : "bg-white border-amber-500"
                }`}
                onMouseDown={(e) => { e.stopPropagation(); startDrag(e, { kind: "breakEnd", i }); }}
                onTouchStart={(e) => { e.stopPropagation(); startDrag(e, { kind: "breakEnd", i }); }}
              />
            </div>
          );
        })}

        {/* Start handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-4 rounded-full border-2 border-primary cursor-ew-resize z-20 shadow ${
            isDark ? "bg-[#020403]" : "bg-white"
          }`}
          style={{ left: `${lo}%` }}
          onMouseDown={(e) => startDrag(e, { kind: "start" })}
          onTouchStart={(e) => startDrag(e, { kind: "start" })}
          title="Arrastar início"
        />

        {/* End handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 translate-x-1/2 size-4 rounded-full border-2 border-primary cursor-ew-resize z-20 shadow ${
            isDark ? "bg-[#020403]" : "bg-white"
          }`}
          style={{ right: `${100 - hi}%` }}
          onMouseDown={(e) => startDrag(e, { kind: "end" })}
          onTouchStart={(e) => startDrag(e, { kind: "end" })}
          title="Arrastar fim"
        />
      </div>

      {/* Time labels + controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-primary" />
          <span className={`text-xs font-mono font-semibold tabular-nums ${isDark ? "text-white/70" : "text-gray-700"}`}>
            {schedule.start}
          </span>
          <span className={`text-xs ${isDark ? "text-white/30" : "text-gray-400"}`}>→</span>
          <span className={`text-xs font-mono font-semibold tabular-nums ${isDark ? "text-white/70" : "text-gray-700"}`}>
            {schedule.end}
          </span>
          {schedule.breaks.map((br, i) => (
            <span key={i} className={`text-[10px] font-mono ml-2 ${isDark ? "text-amber-400/70" : "text-amber-600"}`}>
              pausa {br.start}–{br.end}
              <button
                type="button"
                className="ml-1 opacity-50 hover:opacity-100"
                onClick={() =>
                  onChange(sanitizeDaySchedule({ ...schedule, breaks: schedule.breaks.filter((_, j) => j !== i), active: true }))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            onChange(sanitizeDaySchedule({ ...schedule, breaks: [...schedule.breaks, { start: "12:00", end: "13:00" }], active: true }))
          }
          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
            isDark
              ? "border-white/10 text-white/45 hover:text-amber-400 hover:border-amber-400/30"
              : "border-gray-200 text-gray-500 hover:text-amber-600 hover:border-amber-300"
          }`}
        >
          + pausa
        </button>
      </div>
    </div>
  );
}

// ─── Mini Calendar for date/week/month/year selection ─────────────────────────

function MiniCalendar({
  scope,
  selDay,
  selWeekMonday,
  selMonth,
  selYear,
  onSelectDay,
  onSelectWeek,
  onSelectMonth,
  onSelectYear,
  isDark,
}: {
  scope: Scope;
  selDay: string;
  selWeekMonday: string;
  selMonth: string;
  selYear: string;
  onSelectDay: (d: string) => void;
  onSelectWeek: (mon: string) => void;
  onSelectMonth: (m: string) => void;
  onSelectYear: (y: string) => void;
  isDark: boolean;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(() => {
    if (scope === "dia") return startOfMonth(parseISO(selDay));
    if (scope === "semana") return startOfMonth(parseISO(selWeekMonday));
    if (scope === "mes") {
      const [y, m] = selMonth.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    return startOfMonth(today);
  });

  const yearNum = Number(selYear) || getYear(today);

  if (scope === "ano") {
    const years = [0, 1, 2].map((i) => getYear(today) + i);
    return (
      <div className="flex gap-2 flex-wrap">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => onSelectYear(String(y))}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${
              yearNum === y
                ? "bg-primary text-black border-primary"
                : isDark
                ? "border-white/10 text-white/60 hover:border-primary/40 hover:text-white"
                : "border-gray-200 text-gray-600 hover:border-primary/40 hover:text-gray-900"
            }`}
          >
            {y}
          </button>
        ))}
      </div>
    );
  }

  if (scope === "mes") {
    const months = Array.from({ length: 14 }, (_, i) => addMonths(startOfMonth(today), i));
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
        {months.map((m) => {
          const val = format(m, "yyyy-MM");
          const active = val === selMonth;
          return (
            <button
              key={val}
              type="button"
              onClick={() => onSelectMonth(val)}
              className={`px-2 py-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                active
                  ? "bg-primary text-black border-primary"
                  : isDark
                  ? "border-white/10 text-white/55 hover:border-primary/40 hover:text-white"
                  : "border-gray-200 text-gray-500 hover:border-primary/40 hover:text-gray-900"
              }`}
            >
              {format(m, "MMM yyyy", { locale: ptBR })}
            </button>
          );
        })}
      </div>
    );
  }

  // Calendar grid for dia/semana
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: addDays(monthEnd, (6 - monthEnd.getDay() + 7) % 7) });
  const selDayDate = scope === "dia" ? parseISO(selDay) : null;
  const selWeekMondayDate = scope === "semana" ? parseISO(selWeekMonday) : null;

  const isInSelWeek = (d: Date) => {
    if (!selWeekMondayDate) return false;
    const sun = addDays(selWeekMondayDate, 6);
    return d >= selWeekMondayDate && d <= sun;
  };

  const isWeekStart = (d: Date) => selWeekMondayDate && isSameDay(d, selWeekMondayDate);
  const isWeekEnd = (d: Date) => selWeekMondayDate && isSameDay(d, addDays(selWeekMondayDate, 6));

  const weekDayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];

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

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-0.5">
        {weekDayLabels.map((l, i) => (
          <div key={i} className={`text-center text-[9px] font-bold py-0.5 ${isDark ? "text-white/30" : "text-gray-400"}`}>
            {l}
          </div>
        ))}
        {days.map((d) => {
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
                if (scope === "dia") {
                  onSelectDay(dk(d));
                } else if (scope === "semana") {
                  const mon = addDays(d, -d.getDay() + 1 < 0 ? -d.getDay() + 1 : -(d.getDay() - 1));
                  // Get monday of that week
                  const dow = d.getDay(); // 0=sun,1=mon...
                  const toMon = dow === 0 ? -6 : 1 - dow;
                  onSelectWeek(dk(addDays(d, toMon)));
                }
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
  const [buffer, setBuffer] = useState(15);
  const [minAdvance, setMinAdvance] = useState(2);
  const [maxFutureDays, setMaxFutureDays] = useState(60);
  const [scope, setScope] = useState<Scope>("padrao");
  const [selDay, setSelDay] = useState(() => dk(new Date()));
  const [selWeekMonday, setSelWeekMonday] = useState(() => dk(startOfWeek(new Date(), { weekStartsOn: 1 })));
  const [selMonth, setSelMonth] = useState(() => format(startOfMonth(new Date()), "yyyy-MM"));
  const [selYear, setSelYear] = useState(() => String(getYear(new Date())));
  const [overrides, setOverrides] = useState<Record<string, DaySchedule>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set(UI_DAY_ORDER.map((o) => o.key)));
  const [saveState, setSaveState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

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
          wkSch[k] = { ...wkSch[k], active: true };
        });
        setSchedule(wkSch);
        const ov = (data.overrides ?? {}) as Record<string, DaySchedule>;
        setOverrides(Object.fromEntries(Object.entries(ov).map(([k, v]) => [k, { ...v, active: true }])));
        setBuffer(data.booking?.bufferMinutes ?? 15);
        setMinAdvance(data.booking?.minAdvanceHours ?? 2);
        setMaxFutureDays(data.booking?.maxFutureDays ?? 60);
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

  const yearNum = Number(selYear) || getYear(new Date());

  const toggleExpand = (id: string) =>
    setExpandedRows((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const updateDay = (key: WeekKey, s: DaySchedule) =>
    setSchedule((p) => ({ ...p, [key]: sanitizeDaySchedule({ ...s, active: true }) }));

  const getForDate = (d: Date): DaySchedule => {
    const raw = overrides[dk(d)] ?? schedule[wk(d)] ?? emptySchedule();
    return { ...raw, active: true };
  };

  const setForDate = (d: Date, s: DaySchedule) =>
    setOverrides((p) => ({ ...p, [dk(d)]: sanitizeDaySchedule({ ...s, active: true }) }));

  const updateMonthWeekday = (key: WeekKey, s: DaySchedule) => {
    const clean = sanitizeDaySchedule({ ...s, active: true });
    const dates = allDatesInMonthForWeekday(monthStartDate, key);
    setOverrides((p) => {
      const next = { ...p };
      for (const d of dates) next[dk(d)] = { ...clean };
      return next;
    });
  };

  const updateYearWeekday = (key: WeekKey, s: DaySchedule) => {
    const clean = sanitizeDaySchedule({ ...s, active: true });
    const dates = allDatesInYearForWeekday(yearNum, key);
    setOverrides((p) => {
      const next = { ...p };
      for (const d of dates) next[dk(d)] = { ...clean };
      return next;
    });
  };

  type ScheduleRow =
    | { id: string; label: string; kind: "weekly"; key: WeekKey }
    | { id: string; label: string; kind: "day"; date: Date }
    | { id: string; label: string; kind: "week"; date: Date }
    | { id: string; label: string; kind: "month"; key: WeekKey }
    | { id: string; label: string; kind: "year"; key: WeekKey };

  const scheduleRows: ScheduleRow[] = useMemo(() => {
    if (scope === "padrao") {
      return UI_DAY_ORDER.map((o) => ({ id: o.key, label: o.label, kind: "weekly" as const, key: o.key }));
    }
    if (scope === "dia") {
      const d = parseISO(selDay);
      return [
        {
          id: selDay,
          label: format(d, "EEEE, d 'de' MMMM yyyy", { locale: ptBR }),
          kind: "day" as const,
          date: d,
        },
      ];
    }
    if (scope === "semana") {
      const mon = parseISO(selWeekMonday);
      return UI_DAY_ORDER.map((o, i) => {
        const d = addDays(mon, i);
        return {
          id: dk(d),
          label: `${o.label} · ${format(d, "d/M", { locale: ptBR })}`,
          kind: "week" as const,
          date: d,
        };
      });
    }
    if (scope === "mes") {
      const mLabel = format(monthStartDate, "MMMM yyyy", { locale: ptBR });
      return UI_DAY_ORDER.map((o) => ({
        id: o.key,
        label: `${o.label} (${mLabel})`,
        kind: "month" as const,
        key: o.key,
      }));
    }
    return UI_DAY_ORDER.map((o) => ({
      id: o.key,
      label: `${o.label} (${selYear})`,
      kind: "year" as const,
      key: o.key,
    }));
  }, [scope, selDay, selWeekMonday, monthStartDate, selYear]);

  const horariosSubtitle = useMemo(() => {
    switch (scope) {
      case "padrao":
        return "Padrão para todas as semanas: um dia da semana por linha";
      case "dia":
        return "Horário apenas para o dia escolhido";
      case "semana":
        return "Cada linha é um dia da semana selecionada acima";
      case "mes":
        return "Cada linha vale para todas as ocorrências desse dia da semana no mês";
      case "ano":
        return "Cada linha vale para todas as ocorrências desse dia da semana no ano";
      default:
        return "";
    }
  }, [scope]);

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
          booking: { bufferMinutes: buffer, minAdvanceHours: minAdvance, maxFutureDays: maxFutureDays },
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao salvar");
      setSaveState("ok");
      setTimeout(() => setSaveState("idle"), 2200);
    } catch (e) {
      setSaveState("err");
      setSaveError(e instanceof Error ? e.message : "Erro");
    }
  }, [schedule, overrides, buffer, minAdvance, maxFutureDays]);

  const personalizedCount = Object.keys(overrides).length;

  const pageBg = isDark ? "bg-[#020403]" : "bg-gray-50";
  const textMuted = isDark ? "text-white/50" : "text-gray-600";

  const resolveRowSchedule = (row: ScheduleRow): DaySchedule => {
    if (row.kind === "weekly") return { ...schedule[row.key], active: true };
    if (row.kind === "day") return getForDate(row.date);
    if (row.kind === "week") return getForDate(row.date);
    if (row.kind === "month") return getForDate(firstDateForWeekdayInMonth(monthStartDate, row.key));
    return getForDate(firstDateForWeekdayInYear(yearNum, row.key));
  };

  const applyRowChange = (row: ScheduleRow, s: DaySchedule) => {
    if (row.kind === "weekly") updateDay(row.key, s);
    else if (row.kind === "day") setForDate(row.date, s);
    else if (row.kind === "week") setForDate(row.date, s);
    else if (row.kind === "month") updateMonthWeekday(row.key, s);
    else updateYearWeekday(row.key, s);
  };

  // Label do período selecionado (antes de qualquer return condicional)
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
    return selYear;
  }, [scope, selDay, selWeekMonday, selMonth, selYear]);

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
            <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>Disponibilidade</h1>
            <p className={`text-sm mt-1 ${textMuted}`}>
              Horários salvos no servidor
              {personalizedCount > 0 && (
                <span className={`ml-2 text-xs ${isDark ? "text-white/40" : "text-gray-500"}`}>
                  · {personalizedCount} data{personalizedCount !== 1 ? "s" : ""} com horário próprio
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
                    { value: "ano", label: "Ano" },
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
                      selYear={selYear}
                      onSelectDay={setSelDay}
                      onSelectWeek={setSelWeekMonday}
                      onSelectMonth={setSelMonth}
                      onSelectYear={setSelYear}
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
                    O padrão vale para qualquer semana, exceto onde você definir dia, semana, mês ou ano.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {/* ── Card 2: Horários por dia da semana ── */}
          <Card isDark={isDark}>
            <CardHeader title="Horários por dia da semana" subtitle={horariosSubtitle} isDark={isDark} />
            <div className={`divide-y ${isDark ? "divide-white/10" : "divide-gray-100"}`}>
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
                      <span className={`text-[10px] font-mono shrink-0 ${isDark ? "text-white/45" : "text-gray-500"}`}>
                        {day.start}–{day.end}
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
                            {/* Interactive timeline on desktop, hidden on mobile */}
                            <div className="hidden sm:block">
                              <InteractiveTimeline
                                schedule={day}
                                onChange={(s) => applyRowChange(row, s)}
                                isDark={isDark}
                              />
                            </div>
                            {/* Fallback time inputs on mobile */}
                            <div className="sm:hidden space-y-3">
                              <div className="flex items-center gap-2 flex-wrap pl-1">
                                <div className="size-1.5 rounded-full bg-primary shrink-0" />
                                <span className={`text-[10px] font-medium uppercase tracking-wide ${isDark ? "text-white/45" : "text-gray-500"}`}>Horário</span>
                                <input
                                  type="time"
                                  value={day.start}
                                  onChange={(e) => applyRowChange(row, sanitizeDaySchedule({ ...day, start: e.target.value, active: true }))}
                                  className={`h-8 w-[84px] rounded-lg px-2 text-xs font-mono outline-none border transition-colors ${isDark ? "bg-white/5 border-white/10 text-white focus:border-primary" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-primary"}`}
                                />
                                <span className={`text-xs ${isDark ? "text-white/40" : "text-gray-500"}`}>até</span>
                                <input
                                  type="time"
                                  value={day.end}
                                  onChange={(e) => applyRowChange(row, sanitizeDaySchedule({ ...day, end: e.target.value, active: true }))}
                                  className={`h-8 w-[84px] rounded-lg px-2 text-xs font-mono outline-none border transition-colors ${isDark ? "bg-white/5 border-white/10 text-white focus:border-primary" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-primary"}`}
                                />
                              </div>
                              {day.breaks.map((br, i) => (
                                <div key={i} className="flex items-center gap-2 flex-wrap pl-1">
                                  <div className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                                  <span className={`text-[10px] font-medium uppercase tracking-wide ${isDark ? "text-white/45" : "text-gray-500"}`}>Pausa</span>
                                  <input type="time" value={br.start}
                                    onChange={(e) => {
                                      const n = [...day.breaks]; n[i] = { ...n[i], start: e.target.value };
                                      applyRowChange(row, sanitizeDaySchedule({ ...day, breaks: n, active: true }));
                                    }}
                                    className={`h-8 w-[84px] rounded-lg px-2 text-xs font-mono outline-none border ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                                  />
                                  <span className={`text-xs ${isDark ? "text-white/40" : "text-gray-500"}`}>–</span>
                                  <input type="time" value={br.end}
                                    onChange={(e) => {
                                      const n = [...day.breaks]; n[i] = { ...n[i], end: e.target.value };
                                      applyRowChange(row, sanitizeDaySchedule({ ...day, breaks: n, active: true }));
                                    }}
                                    className={`h-8 w-[84px] rounded-lg px-2 text-xs font-mono outline-none border ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                                  />
                                  <button type="button" onClick={() => applyRowChange(row, sanitizeDaySchedule({ ...day, breaks: day.breaks.filter((_, j) => j !== i), active: true }))}
                                    className={`size-5 rounded flex items-center justify-center ${isDark ? "text-white/40 hover:text-red-400" : "text-gray-400 hover:text-red-600"}`}>×</button>
                                </div>
                              ))}
                              <button type="button"
                                onClick={() => applyRowChange(row, sanitizeDaySchedule({ ...day, breaks: [...day.breaks, { start: "12:00", end: "13:00" }], active: true }))}
                                className={`flex items-center gap-1.5 text-xs pl-1 ${isDark ? "text-white/50 hover:text-primary" : "text-gray-500 hover:text-primary"}`}>
                                + pausa
                              </button>
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
            <CardHeader title="Regras de agendamento" subtitle="Buffer, antecedência e janela futura (notification_settings)" isDark={isDark} />
            <div className="px-5">
              <SliderRow
                label="Buffer entre atendimentos"
                sublabel={`${buffer} min após cada serviço`}
                value={buffer}
                onChange={setBuffer}
                min={0}
                max={60}
                step={5}
                marks={["0", "15", "30", "45", "60"]}
                unit=" min"
                isDark={isDark}
              />
              <SliderRow
                label="Antecedência mínima"
                sublabel={`Mínimo de ${minAdvance}h para agendar`}
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
                label="Janela no futuro"
                sublabel={`Até ${maxFutureDays} dias à frente`}
                value={maxFutureDays}
                onChange={setMaxFutureDays}
                min={7}
                max={365}
                step={7}
                marks={["7", "30", "90", "180", "365"]}
                unit=" dias"
                isDark={isDark}
              />
            </div>
          </Card>

          {saveError && <p className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>{saveError}</p>}
          <button
            type="button"
            disabled={saveState === "loading"}
            onClick={() => void save()}
            className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              saveState === "ok"
                ? "bg-primary/15 text-primary border border-primary/30"
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