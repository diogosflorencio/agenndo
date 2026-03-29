import { addDays, addMinutes, differenceInMinutes } from "date-fns";
import { toDate } from "date-fns-tz";
import {
  type DaySchedule,
  scheduleRowToDaySchedule,
  timeToMinutes,
  minutesToTime,
  DEFAULT_WEEKLY_SCHEDULE,
  dowToWeekdayKey,
} from "@/lib/disponibilidade";

export const BOOKING_TZ = "America/Sao_Paulo";

export type AvailabilityDbRow = {
  day_of_week: number;
  closed: boolean;
  open_time: string | null;
  close_time: string | null;
  breaks: unknown;
};

export type OverrideDbRow = {
  date: string;
  closed: boolean;
  open_time: string | null;
  close_time: string | null;
  breaks: unknown;
};

export type AppointmentBlockRow = {
  time_start: string;
  time_end: string;
  status: string;
  collaborator_id: string;
};

export type BlockDbRow = {
  collaborator_id: string | null;
  starts_at: string;
  ends_at: string;
};

export function effectiveDaySchedule(
  dateStr: string,
  avRows: AvailabilityDbRow[],
  ovRows: OverrideDbRow[]
): DaySchedule {
  const ov = ovRows.find((r) => r.date === dateStr);
  if (ov) return scheduleRowToDaySchedule(ov);
  const d = new Date(dateStr + "T12:00:00");
  const dow = d.getDay();
  const row = avRows.find((r) => r.day_of_week === dow);
  if (!row) {
    const key = dowToWeekdayKey(dow);
    return DEFAULT_WEEKLY_SCHEDULE[key];
  }
  return scheduleRowToDaySchedule(row);
}

function intervalMinutesOnDay(
  dateStr: string,
  blockStart: Date,
  blockEnd: Date
): { lo: number; hi: number } | null {
  const dayStart = toDate(`${dateStr} 00:00:00`, { timeZone: BOOKING_TZ });
  const dayEnd = addDays(dayStart, 1);
  const s = blockStart.getTime() > dayStart.getTime() ? blockStart : dayStart;
  const e = blockEnd.getTime() < dayEnd.getTime() ? blockEnd : dayEnd;
  if (s.getTime() >= e.getTime()) return null;
  const lo = Math.max(0, Math.floor(differenceInMinutes(s, dayStart)));
  const hi = Math.min(24 * 60, Math.ceil(differenceInMinutes(e, dayStart)));
  if (hi <= lo) return null;
  return { lo, hi };
}

function overlaps(aLo: number, aHi: number, bLo: number, bHi: number) {
  return aLo < bHi && aHi > bLo;
}

/** Intervalos bloqueados em minutos desde meia-noite (início inclusivo, fim exclusivo na prática de overlap). */
function buildBlockedIntervals(
  dateStr: string,
  collaboratorId: string,
  bufferMin: number,
  appointments: AppointmentBlockRow[],
  blocks: BlockDbRow[]
): { lo: number; hi: number }[] {
  const intervals: { lo: number; hi: number }[] = [];
  for (const apt of appointments) {
    if (apt.collaborator_id !== collaboratorId) continue;
    if (apt.status === "cancelado") continue;
    const s = timeToMinutes(String(apt.time_start).slice(0, 5));
    const e = timeToMinutes(String(apt.time_end).slice(0, 5));
    intervals.push({ lo: s, hi: e + bufferMin });
  }
  for (const bl of blocks) {
    if (bl.collaborator_id != null && bl.collaborator_id !== collaboratorId) continue;
    const bs = new Date(bl.starts_at);
    const be = new Date(bl.ends_at);
    const part = intervalMinutesOnDay(dateStr, bs, be);
    if (part) intervals.push(part);
  }
  return intervals;
}

export function computeSlotsForCollaborator(params: {
  dateStr: string;
  schedule: DaySchedule;
  durationMinutes: number;
  bufferMinutes: number;
  slotStepMinutes: number;
  minAdvanceHours: number;
  collaboratorId: string;
  appointments: AppointmentBlockRow[];
  blocks: BlockDbRow[];
  now: Date;
}): string[] {
  const {
    dateStr,
    schedule,
    durationMinutes,
    bufferMinutes,
    slotStepMinutes,
    minAdvanceHours,
    collaboratorId,
    appointments,
    blocks,
    now,
  } = params;

  if (!schedule.active) return [];

  const workStart = timeToMinutes(schedule.start);
  const workEnd = timeToMinutes(schedule.end);
  const breakIntervals = schedule.breaks.map((b) => ({
    lo: timeToMinutes(b.start),
    hi: timeToMinutes(b.end),
  }));

  const blocked = buildBlockedIntervals(
    dateStr,
    collaboratorId,
    bufferMinutes,
    appointments,
    blocks
  );

  const minStart = addMinutes(now, Math.max(0, minAdvanceHours * 60));

  const out: string[] = [];
  for (let t = workStart; t + durationMinutes <= workEnd; t += slotStepMinutes) {
    const tend = t + durationMinutes;
    if (breakIntervals.some((br) => overlaps(t, tend, br.lo, br.hi))) continue;
    if (blocked.some((b) => overlaps(t, tend, b.lo, b.hi))) continue;

    const slotWall = `${dateStr} ${minutesToTime(t)}:00`;
    const slotInstant = toDate(slotWall.replace(" ", "T").slice(0, 19), { timeZone: BOOKING_TZ });
    if (slotInstant.getTime() < minStart.getTime()) continue;

    out.push(minutesToTime(t));
  }
  return out;
}

export function unionSortedSlots(perCollab: Map<string, string[]>): string[] {
  const set = new Set<string>();
  for (const arr of Array.from(perCollab.values())) {
    for (const s of arr) set.add(s);
  }
  return Array.from(set).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

export function pickCollaboratorForTime(
  timeHHmm: string,
  collaboratorIds: string[],
  perCollab: Map<string, string[]>
): string | null {
  const sorted = [...collaboratorIds].sort((a, b) => a.localeCompare(b));
  for (const id of sorted) {
    const slots = perCollab.get(id);
    if (slots?.includes(timeHHmm)) return id;
  }
  return null;
}

export function isSlotStillFree(params: {
  dateStr: string;
  timeStart: string;
  durationMinutes: number;
  bufferMinutes: number;
  collaboratorId: string;
  appointments: AppointmentBlockRow[];
  blocks: BlockDbRow[];
}): boolean {
  const t = timeToMinutes(params.timeStart.slice(0, 5));
  const tend = t + params.durationMinutes;
  const blocked = buildBlockedIntervals(
    params.dateStr,
    params.collaboratorId,
    params.bufferMinutes,
    params.appointments,
    params.blocks
  );
  return !blocked.some((b) => overlaps(t, tend, b.lo, b.hi));
}
