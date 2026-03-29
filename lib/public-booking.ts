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

/**
 * Passo da grade de encaixe público: duração do serviço + intervalo entre atendimentos (mín. 1 min).
 * Os horários de início válidos são workStart, workStart+step, workStart+2·step, …
 */
export function bookingGridStepMinutes(durationMinutes: number, bufferMinutes: number): number {
  return Math.max(1, durationMinutes + bufferMinutes);
}

/** Inícios candidatos na grade (expediente), antes de checar pausas/ocupação. */
export function listBookingGridStartMinutes(
  workStart: number,
  workEnd: number,
  durationMinutes: number,
  bufferMinutes: number
): number[] {
  const step = bookingGridStepMinutes(durationMinutes, bufferMinutes);
  const out: number[] = [];
  for (let t = workStart; t + durationMinutes + bufferMinutes <= workEnd; t += step) {
    out.push(t);
  }
  return out;
}

/** @deprecated use bookingGridStepMinutes(duration, buffer). */
export const PUBLIC_SLOT_SCAN_STEP_MINUTES = 1;

/** @deprecated grade de exibição segue o passo duração+folga. */
export const PUBLIC_SLOT_DISPLAY_GRID_MINUTES = 5;

/** @deprecated use bookingGridStepMinutes. */
export function publicBookingSlotStepMinutes(durationMinutes: number, bufferMinutes: number = 0): number {
  return bookingGridStepMinutes(durationMinutes, bufferMinutes);
}

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
  const ov = ovRows.find((r) => String(r.date ?? "").slice(0, 10) === dateStr);
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

/** Dia com atendimento (não fechado na semana nem por exceção). */
export function isDateOpenForPublicBooking(
  dateStr: string,
  avRows: AvailabilityDbRow[],
  ovRows: OverrideDbRow[]
): boolean {
  return effectiveDaySchedule(dateStr, avRows, ovRows).active;
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

export type PublicSlotReason = "livre" | "ocupado" | "intervalo" | "antecedencia" | "indisponivel";

export type PublicSlotCell = {
  start: string;
  available: boolean;
  reason: PublicSlotReason;
};

export function publicSlotReasonLabel(reason: PublicSlotReason): string {
  switch (reason) {
    case "ocupado":
      return "Horário já ocupado ou ainda em folga após outro atendimento.";
    case "intervalo":
      return "Intervalo ou pausa do expediente.";
    case "indisponivel":
      return "Indisponível para agendar neste horário.";
    default:
      return "";
  }
}

function slotInstantOnDay(dateStr: string, tMinutes: number): Date {
  const slotWall = `${dateStr} ${minutesToTime(tMinutes)}:00`;
  return toDate(slotWall.replace(" ", "T").slice(0, 19), { timeZone: BOOKING_TZ });
}

/** Por que o início `t` não é válido (ou livre). Reserva [t, t+duração+buffer) como no painel de disponibilidade. */
function classifyStartMinutes(params: {
  t: number;
  durationMinutes: number;
  bufferMinutes: number;
  workStart: number;
  workEnd: number;
  breakIntervals: { lo: number; hi: number }[];
  blocked: { lo: number; hi: number }[];
  minStart: Date;
  dateStr: string;
}): PublicSlotReason {
  const { t, durationMinutes, bufferMinutes, workStart, workEnd, breakIntervals, blocked, minStart, dateStr } =
    params;
  const tendFull = t + durationMinutes + bufferMinutes;
  if (t < workStart || tendFull > workEnd) return "indisponivel";

  const slotInstant = slotInstantOnDay(dateStr, t);
  if (slotInstant.getTime() < minStart.getTime()) return "antecedencia";

  if (breakIntervals.some((br) => overlaps(t, tendFull, br.lo, br.hi))) return "intervalo";
  if (blocked.some((b) => overlaps(t, tendFull, b.lo, b.hi))) return "ocupado";
  return "livre";
}

/** Todos os inícios válidos na grade (duração + folga), respeitando pausas, ocupação e antecedência. */
export function collectAvailableStartMinutes(params: {
  dateStr: string;
  schedule: DaySchedule;
  durationMinutes: number;
  bufferMinutes: number;
  collaboratorId: string;
  appointments: AppointmentBlockRow[];
  blocks: BlockDbRow[];
  minAdvanceHours: number;
  now: Date;
}): Set<number> {
  const {
    dateStr,
    schedule,
    durationMinutes,
    bufferMinutes,
    collaboratorId,
    appointments,
    blocks,
    minAdvanceHours,
    now,
  } = params;

  const out = new Set<number>();
  if (!schedule.active) return out;

  const workStart = timeToMinutes(schedule.start);
  const workEnd = timeToMinutes(schedule.end);
  const breakIntervals = schedule.breaks.map((b) => ({
    lo: timeToMinutes(b.start),
    hi: timeToMinutes(b.end),
  }));

  const blocked = buildBlockedIntervals(dateStr, collaboratorId, bufferMinutes, appointments, blocks);
  const minStart = addMinutes(now, Math.max(0, minAdvanceHours * 60));
  const step = bookingGridStepMinutes(durationMinutes, bufferMinutes);

  for (let t = workStart; t + durationMinutes + bufferMinutes <= workEnd; t += step) {
    const r = classifyStartMinutes({
      t,
      durationMinutes,
      bufferMinutes,
      workStart,
      workEnd,
      breakIntervals,
      blocked,
      minStart,
      dateStr,
    });
    if (r === "livre") out.add(t);
  }
  return out;
}

export type CollectAvailableStartParams = Parameters<typeof collectAvailableStartMinutes>[0];

/** Encaixe mais próximo ao minuto desejado (entre os livres da grade). */
export function nearestBookableStartMinute(params: CollectAvailableStartParams, desiredMinute: number): number | null {
  const set = collectAvailableStartMinutes(params);
  if (set.size === 0) return null;
  let best: number | null = null;
  let bestDist = Infinity;
  set.forEach((t) => {
    const d = Math.abs(t - desiredMinute);
    if (d < bestDist || (d === bestDist && best !== null && t < best)) {
      bestDist = d;
      best = t;
    }
  });
  return best;
}

/** Próximo ou anterior início livre na grade (setas no slider). */
export function stepBookableStartMinute(
  params: CollectAvailableStartParams,
  current: number,
  direction: -1 | 1
): number | null {
  const arr = Array.from(collectAvailableStartMinutes(params)).sort((a, b) => a - b);
  if (arr.length === 0) return null;
  let idx = arr.indexOf(current);
  if (idx < 0) {
    let bestI = 0;
    for (let i = 1; i < arr.length; i++) {
      if (Math.abs(arr[i]! - current) < Math.abs(arr[bestI]! - current)) bestI = i;
    }
    idx = bestI;
  }
  const n = idx + direction;
  if (n < 0 || n >= arr.length) return null;
  return arr[n]!;
}

/** Linha do tempo para UI (um profissional). */
export function buildPublicSlotTimelineForCollaborator(params: {
  dateStr: string;
  schedule: DaySchedule;
  durationMinutes: number;
  bufferMinutes: number;
  minAdvanceHours: number;
  collaboratorId: string;
  appointments: AppointmentBlockRow[];
  blocks: BlockDbRow[];
  now: Date;
}): PublicSlotCell[] {
  const { collaboratorId, ...rest } = params;
  return buildPublicSlotTimelineForPool({ ...rest, pool: [collaboratorId] });
}

/**
 * Grade única para o dia: mesma malha duração+folga; “qualquer profissional”: livre se alguém puder.
 */
export function buildPublicSlotTimelineForPool(params: {
  pool: string[];
  dateStr: string;
  schedule: DaySchedule;
  durationMinutes: number;
  bufferMinutes: number;
  minAdvanceHours: number;
  appointments: AppointmentBlockRow[];
  blocks: BlockDbRow[];
  now: Date;
}): PublicSlotCell[] {
  const { pool, dateStr, schedule, durationMinutes, bufferMinutes, minAdvanceHours, appointments, blocks, now } =
    params;

  if (!schedule.active || pool.length === 0) return [];

  const workStart = timeToMinutes(schedule.start);
  const workEnd = timeToMinutes(schedule.end);
  const breakIntervals = schedule.breaks.map((b) => ({
    lo: timeToMinutes(b.start),
    hi: timeToMinutes(b.end),
  }));
  const minStart = addMinutes(now, Math.max(0, minAdvanceHours * 60));

  const blockedCache = new Map<string, { lo: number; hi: number }[]>();
  for (const cid of pool) {
    blockedCache.set(cid, buildBlockedIntervals(dateStr, cid, bufferMinutes, appointments, blocks));
  }

  const displayMinutes = listBookingGridStartMinutes(workStart, workEnd, durationMinutes, bufferMinutes);
  const cells: PublicSlotCell[] = [];

  for (const t of displayMinutes) {
    const reasons = pool.map((cid) =>
      classifyStartMinutes({
        t,
        durationMinutes,
        bufferMinutes,
        workStart,
        workEnd,
        breakIntervals,
        blocked: blockedCache.get(cid)!,
        minStart,
        dateStr,
      })
    );

    if (reasons.every((r) => r === "antecedencia")) continue;

    if (reasons.some((r) => r === "livre")) {
      cells.push({ start: minutesToTime(t), available: true, reason: "livre" });
      continue;
    }

    const nonAnt = reasons.filter((r) => r !== "antecedencia");
    if (nonAnt.length === 0) continue;

    let reason: PublicSlotReason = "indisponivel";
    if (nonAnt.some((r) => r === "ocupado")) reason = "ocupado";
    else if (nonAnt.some((r) => r === "intervalo")) reason = "intervalo";

    cells.push({ start: minutesToTime(t), available: false, reason });
  }

  return cells;
}

/**
 * Agendamentos que ainda ocupam o profissional para novos encaixes no link público.
 * Cancelado e compareceu não bloqueiam; horário aparece livre na UI e na validação.
 */
export function appointmentBlocksPublicCalendar(status: string | null | undefined): boolean {
  const s = String(status ?? "")
    .toLowerCase()
    .trim();
  if (s === "cancelado" || s === "compareceu") return false;
  return true;
}

function sameCollaboratorId(a: string | null | undefined, b: string): boolean {
  return String(a ?? "").trim() === String(b).trim();
}

/** Intervalos bloqueados em minutos desde meia-noite (início inclusivo, fim exclusivo na prática de overlap). */
export function buildBlockedIntervals(
  dateStr: string,
  collaboratorId: string,
  bufferMin: number,
  appointments: AppointmentBlockRow[],
  blocks: BlockDbRow[]
): { lo: number; hi: number }[] {
  const intervals: { lo: number; hi: number }[] = [];
  for (const apt of appointments) {
    if (!sameCollaboratorId(apt.collaborator_id, collaboratorId)) continue;
    if (!appointmentBlocksPublicCalendar(apt.status)) continue;
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

/** Lista de inícios livres na grade (duração+folga), para API book / compat. */
export function computeSlotsForCollaborator(params: {
  dateStr: string;
  schedule: DaySchedule;
  durationMinutes: number;
  bufferMinutes: number;
  minAdvanceHours: number;
  collaboratorId: string;
  appointments: AppointmentBlockRow[];
  blocks: BlockDbRow[];
  now: Date;
}): string[] {
  const set = collectAvailableStartMinutes(params);
  return Array.from(set)
    .sort((a, b) => a - b)
    .map(minutesToTime);
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
  const tendFull = t + params.durationMinutes + params.bufferMinutes;
  const blocked = buildBlockedIntervals(
    params.dateStr,
    params.collaboratorId,
    params.bufferMinutes,
    params.appointments,
    params.blocks
  );
  return !blocked.some((b) => overlaps(t, tendFull, b.lo, b.hi));
}

export function isPublicStartMinuteBookable(params: {
  startMinute: number;
  dateStr: string;
  schedule: DaySchedule;
  durationMinutes: number;
  bufferMinutes: number;
  collaboratorId: string;
  appointments: AppointmentBlockRow[];
  blocks: BlockDbRow[];
  minAdvanceHours: number;
  now: Date;
}): boolean {
  return collectAvailableStartMinutes({
    dateStr: params.dateStr,
    schedule: params.schedule,
    durationMinutes: params.durationMinutes,
    bufferMinutes: params.bufferMinutes,
    collaboratorId: params.collaboratorId,
    appointments: params.appointments,
    blocks: params.blocks,
    minAdvanceHours: params.minAdvanceHours,
    now: params.now,
  }).has(params.startMinute);
}

/** Só bloqueios de calendário (sem agendamentos), para desenhar camada separada na linha do tempo. */
export function buildCalendarOnlyIntervals(
  dateStr: string,
  collaboratorId: string,
  blocks: BlockDbRow[]
): { lo: number; hi: number }[] {
  const out: { lo: number; hi: number }[] = [];
  for (const bl of blocks) {
    if (bl.collaborator_id != null && bl.collaborator_id !== collaboratorId) continue;
    const bs = new Date(bl.starts_at);
    const be = new Date(bl.ends_at);
    const part = intervalMinutesOnDay(dateStr, bs, be);
    if (part) out.push(part);
  }
  return out;
}

/** Bloqueios de calendário para qualquer profissional do pool (ou global `collaborator_id` null). */
export function buildCalendarOnlyIntervalsForPool(
  dateStr: string,
  poolCollaboratorIds: string[],
  blocks: BlockDbRow[]
): { lo: number; hi: number }[] {
  const pool = new Set(poolCollaboratorIds);
  const out: { lo: number; hi: number }[] = [];
  for (const bl of blocks) {
    if (bl.collaborator_id != null && !pool.has(bl.collaborator_id)) continue;
    const bs = new Date(bl.starts_at);
    const be = new Date(bl.ends_at);
    const part = intervalMinutesOnDay(dateStr, bs, be);
    if (part) out.push(part);
  }
  return out;
}

export function listAppointmentsForCollaboratorDay(
  appointments: AppointmentBlockRow[],
  collaboratorId: string
): { timeStart: string; timeEnd: string }[] {
  return appointments
    .filter((a) => sameCollaboratorId(a.collaborator_id, collaboratorId) && appointmentBlocksPublicCalendar(a.status))
    .map((a) => ({
      timeStart: String(a.time_start).slice(0, 5),
      timeEnd: String(a.time_end).slice(0, 5),
    }));
}

/** Agendamentos de terceiros para todos os profissionais do pool (link “qualquer profissional”). */
export function listAppointmentsForPoolDay(
  appointments: AppointmentBlockRow[],
  poolCollaboratorIds: string[]
): { timeStart: string; timeEnd: string }[] {
  const pool = new Set(poolCollaboratorIds.map((id) => String(id).trim()));
  return appointments
    .filter(
      (a) =>
        appointmentBlocksPublicCalendar(a.status) &&
        a.collaborator_id != null &&
        pool.has(String(a.collaborator_id).trim())
    )
    .map((a) => ({
      timeStart: String(a.time_start).slice(0, 5),
      timeEnd: String(a.time_end).slice(0, 5),
    }))
    .sort((x, y) => timeToMinutes(x.timeStart) - timeToMinutes(y.timeStart));
}
