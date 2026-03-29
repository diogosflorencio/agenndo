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
  mon: { active: true, start: "07:00", end: "16:00", breaks: [{ start: "12:00", end: "13:00" }] },
  tue: { active: true, start: "07:00", end: "16:00", breaks: [{ start: "12:00", end: "13:00" }] },
  wed: { active: true, start: "07:00", end: "16:00", breaks: [{ start: "12:00", end: "13:00" }] },
  thu: { active: true, start: "07:00", end: "16:00", breaks: [{ start: "12:00", end: "13:00" }] },
  fri: { active: true, start: "07:00", end: "16:00", breaks: [{ start: "12:00", end: "13:00" }] },
  sat: { active: true, start: "07:00", end: "16:00", breaks: [{ start: "12:00", end: "13:00" }] },
  sun: { active: false, start: "07:00", end: "16:00", breaks: [{ start: "12:00", end: "13:00" }] },
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

/**
 * Lê `breaks` do JSONB do Postgres: pode vir como array, string JSON, ou itens com hora em formato TIME ("HH:MM:SS").
 */
function normalizeBreaksFromDb(raw: unknown): { start: string; end: string }[] {
  let arr: unknown[] = [];
  if (raw == null) return [];
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t || t === "[]") return [];
    try {
      const p = JSON.parse(t) as unknown;
      if (Array.isArray(p)) arr = p;
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    arr = raw;
  } else {
    return [];
  }

  const toHHMM = (v: unknown): string | null => {
    if (v == null) return null;
    if (typeof v === "number" && Number.isFinite(v)) {
      const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(v)));
      return minutesToTime(m);
    }
    const s = String(v).trim();
    if (!s) return null;
    return s.slice(0, 5);
  };

  const out: { start: string; end: string }[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const a = toHHMM(o.start ?? o.open);
    const b = toHHMM(o.end ?? o.close);
    if (a && b) out.push({ start: a, end: b });
  }
  return out;
}

export function scheduleRowToDaySchedule(row: {
  closed: boolean;
  open_time: string | null;
  close_time: string | null;
  breaks: unknown;
}): DaySchedule {
  const safeBreaks = normalizeBreaksFromDb(row.breaks);
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
  const toPgTime = (hhmm: string) => {
    const h = hhmm.trim().slice(0, 5);
    return `${h}:00`;
  };
  return {
    closed: false,
    open_time: toPgTime(clean.start),
    close_time: toPgTime(clean.end),
    breaks: clean.breaks.map((b) => ({ start: toPgTime(b.start), end: toPgTime(b.end) })),
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
