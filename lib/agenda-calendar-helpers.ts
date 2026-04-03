/** Datas em horário local (evita desvio UTC com toISOString). */
export function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseTimeToMinutes(t: string): number {
  const p = t.split(":");
  const h = Number(p[0]);
  const m = Number(p[1] ?? 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesBetween(start: string, end: string): number {
  return Math.max(0, parseTimeToMinutes(end) - parseTimeToMinutes(start));
}

/** Segunda-feira da semana que contém `d`. */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfWeekSundayFromMonday(monday: Date): Date {
  const e = new Date(monday);
  e.setDate(monday.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function labelWeekdayShort(d: Date): string {
  return WEEKDAYS_SHORT[d.getDay()] ?? "";
}

/** Faixa de 30 em 30 min entre startHour e endHour (ex.: 7–22). */
export function generateHalfHourSlots(startHour: number, endHour: number): { label: string; minutes: number }[] {
  const out: { label: string; minutes: number }[] = [];
  const startM = startHour * 60;
  const endM = endHour * 60;
  for (let m = startM; m < endM; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    out.push({
      minutes: m,
      label: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
    });
  }
  return out;
}

export function monthYearKey(d: Date): { month: number; year: number } {
  return { month: d.getMonth(), year: d.getFullYear() };
}
