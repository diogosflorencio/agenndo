import { produce } from "immer";

export const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export type DaySchedule = {
  active: boolean;
  start: string;
  end: string;
  breaks: { start: string; end: string }[];
};

export const UI_DAY_ORDER: { key: WeekdayKey; label: string; short: string }[] = [
  { key: "mon", label: "Segunda", short: "Seg" },
  { key: "tue", label: "Terça", short: "Ter" },
  { key: "wed", label: "Quarta", short: "Qua" },
  { key: "thu", label: "Quinta", short: "Qui" },
  { key: "fri", label: "Sexta", short: "Sex" },
  { key: "sat", label: "Sábado", short: "Sáb" },
  { key: "sun", label: "Domingo", short: "Dom" },
];

/** JS getDay(): 0=Dom … 6=Sab → nossa chave */
export function dateToWeekdayKey(d: Date): WeekdayKey {
  return WEEKDAY_KEYS[d.getDay()];
}

const KEY_TO_DOW: Record<WeekdayKey, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const DOW_TO_KEY: Record<number, WeekdayKey> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

export function weekdayKeyToDow(key: string): number {
  return KEY_TO_DOW[key as WeekdayKey] ?? 0;
}

export function dowToWeekdayKey(dow: number): WeekdayKey {
  return DOW_TO_KEY[dow] ?? "sun";
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** HH:mm com resolução de 1 minuto (intervalos e expediente). */
export function minutesToTime(m: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(m)));
  const h = Math.floor(clamped / 60);
  const min = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function emptySchedule(): DaySchedule {
  return { active: true, start: "09:00", end: "18:00", breaks: [] };
}

/** Padrão inicial (merge com linhas do banco) */
export const DEFAULT_WEEKLY_SCHEDULE: Record<WeekdayKey, DaySchedule> = {
  mon: { active: true, start: "09:00", end: "18:00", breaks: [{ start: "12:00", end: "13:00" }] },
  tue: { active: true, start: "09:00", end: "18:00", breaks: [] },
  wed: { active: true, start: "09:00", end: "20:00", breaks: [{ start: "12:00", end: "13:00" }] },
  thu: { active: true, start: "09:00", end: "18:00", breaks: [] },
  fri: { active: true, start: "09:00", end: "20:00", breaks: [] },
  sat: { active: true, start: "08:00", end: "16:00", breaks: [] },
  sun: { active: false, start: "09:00", end: "18:00", breaks: [] },
};

/** Normaliza horários: fim ≥ início, intervalos contidos no expediente e coerentes */
export function sanitizeDaySchedule(input: DaySchedule): DaySchedule {
  return produce(input, (draft) => {
    if (!draft.active) return;
    let start = timeToMinutes(draft.start);
    let end = timeToMinutes(draft.end);
    if (end <= start) {
      end = Math.min(start + 60, 24 * 60 - 1);
      draft.end = minutesToTime(end);
    }
    draft.breaks = draft.breaks
      .map((br) => {
        let bs = timeToMinutes(br.start);
        let be = timeToMinutes(br.end);
        if (be <= bs) be = Math.min(bs + 1, end);
        bs = Math.max(start, Math.min(bs, end - 1));
        be = Math.max(bs + 1, Math.min(be, end));
        return { start: minutesToTime(bs), end: minutesToTime(be) };
      })
      .filter((br) => timeToMinutes(br.end) > timeToMinutes(br.start));
  });
}

export function scheduleRowToDaySchedule(row: {
  closed: boolean;
  open_time: string | null;
  close_time: string | null;
  breaks: unknown;
}): DaySchedule {
  const breaks = Array.isArray(row.breaks) ? row.breaks : [];
  const safeBreaks = breaks
    .filter((b): b is { start: string; end: string } => typeof b?.start === "string" && typeof b?.end === "string")
    .map((b) => ({ start: b.start.slice(0, 5), end: b.end.slice(0, 5) }));
  if (row.closed) {
    return { active: false, start: "09:00", end: "18:00", breaks: [] };
  }
  const start = row.open_time?.slice(0, 5) ?? "09:00";
  const end = row.close_time?.slice(0, 5) ?? "18:00";
  return sanitizeDaySchedule({ active: true, start, end, breaks: safeBreaks });
}

export function dayScheduleToRow(s: DaySchedule): {
  closed: boolean;
  open_time: string | null;
  close_time: string | null;
  breaks: { start: string; end: string }[];
} {
  const clean = sanitizeDaySchedule(s);
  if (!clean.active) {
    return { closed: true, open_time: null, close_time: null, breaks: [] };
  }
  return {
    closed: false,
    open_time: `${clean.start}:00`,
    close_time: `${clean.end}:00`,
    breaks: clean.breaks.map((b) => ({ start: `${b.start}:00`, end: `${b.end}:00` })),
  };
}

export type AvailabilityPageState = {
  schedule: Record<WeekdayKey, DaySchedule>;
  specificSchedules: Record<string, DaySchedule>;
  individualExceptionKeys: string[];
  buffer: number;
  minAdvance: number;
  maxFutureDays: number;
};

export function cloneAvailabilityState(s: AvailabilityPageState): AvailabilityPageState {
  return structuredClone(s);
}
