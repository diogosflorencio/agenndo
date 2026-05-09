import { dateToWeekdayKey, type DaySchedule } from "@/lib/disponibilidade";
import {
  addDays,
  localISODate,
  parseTimeToMinutes,
  startOfWeekMonday,
} from "@/lib/agenda-calendar-helpers";

const FALLBACK_START_H = 7;
const FALLBACK_END_H = 22;
const PAD_MIN = 30;

type AptLike = { date: string; time_start: string; time_end: string };

function resolveDaySchedule(
  d: Date,
  weekly: Record<string, DaySchedule>,
  overrides: Record<string, DaySchedule>
): DaySchedule | null {
  const ds = localISODate(d);
  const wk = dateToWeekdayKey(d);
  return overrides[ds] ?? weekly[wk] ?? null;
}

/** Expediente do dia em minutos; null se fechado ou inválido. */
function activeDayBounds(s: DaySchedule | null): { openMin: number; closeMin: number } | null {
  if (!s || !s.active) return null;
  const openMin = parseTimeToMinutes(s.start);
  const closeMin = parseTimeToMinutes(s.end);
  if (closeMin <= openMin) return null;
  return { openMin, closeMin };
}

function aptBoundsOnDates(appointments: AptLike[], dateSet: Set<string>): { minM: number; maxM: number } | null {
  let minM = Infinity;
  let maxM = -Infinity;
  for (const a of appointments) {
    if (!dateSet.has(a.date)) continue;
    const s = parseTimeToMinutes(a.time_start);
    const e = parseTimeToMinutes(a.time_end);
    minM = Math.min(minM, s);
    maxM = Math.max(maxM, e);
  }
  if (!Number.isFinite(minM)) return null;
  return { minM, maxM };
}

function snapGrid(openMin: number, closeMin: number): { startHour: number; endHour: number } {
  let lo = Math.floor((openMin - PAD_MIN) / 30) * 30;
  let hi = Math.ceil((closeMin + PAD_MIN) / 30) * 30;
  lo = Math.max(0, lo);
  hi = Math.min(24 * 60, hi);
  if (hi <= lo) {
    return { startHour: FALLBACK_START_H, endHour: FALLBACK_END_H };
  }
  return {
    startHour: Math.floor(lo / 60),
    endHour: Math.ceil(hi / 60),
  };
}

/**
 * Faixa vertical da grade (hora cheia final exclusiva no mesmo esquema de `generateHalfHourSlots`).
 * Dia: conforme expediente daquele dia.
 * Semana: união dos expedientes dos 7 dias (cobre o “dia mais longo” e todos os outros).
 * Mês: não usa grade — retorna fallback.
 */
export function computeAgendaGridBounds(opts: {
  view: "day" | "week" | "month";
  selectedDate: string;
  weekly: Record<string, DaySchedule>;
  overrides: Record<string, DaySchedule>;
  appointments: AptLike[];
}): { startHour: number; endHour: number } {
  const { view, selectedDate, weekly, overrides, appointments } = opts;

  if (view === "month") {
    return { startHour: FALLBACK_START_H, endHour: FALLBACK_END_H };
  }

  const anchor = new Date(selectedDate + "T12:00:00");

  let openMin = Infinity;
  let closeMin = -Infinity;
  let anyActive = false;

  if (view === "day") {
    const b = activeDayBounds(resolveDaySchedule(anchor, weekly, overrides));
    if (b) {
      anyActive = true;
      openMin = b.openMin;
      closeMin = b.closeMin;
    }
  } else {
    const mon = startOfWeekMonday(anchor);
    for (let i = 0; i < 7; i++) {
      const d = addDays(mon, i);
      const b = activeDayBounds(resolveDaySchedule(d, weekly, overrides));
      if (b) {
        anyActive = true;
        openMin = Math.min(openMin, b.openMin);
        closeMin = Math.max(closeMin, b.closeMin);
      }
    }
  }

  const dateScope =
    view === "day"
      ? new Set([selectedDate])
      : (() => {
          const mon = startOfWeekMonday(anchor);
          const set = new Set<string>();
          for (let i = 0; i < 7; i++) set.add(localISODate(addDays(mon, i)));
          return set;
        })();

  const apt = aptBoundsOnDates(appointments, dateScope);

  let lo = anyActive ? openMin : Infinity;
  let hi = anyActive ? closeMin : -Infinity;
  if (apt) {
    lo = Math.min(lo, apt.minM);
    hi = Math.max(hi, apt.maxM);
  }

  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) {
    return { startHour: FALLBACK_START_H, endHour: FALLBACK_END_H };
  }

  return snapGrid(lo, hi);
}
