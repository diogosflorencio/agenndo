import { toZonedTime } from "date-fns-tz";

const TZ = "America/Sao_Paulo";
/** Contagem base em 2026-01-01 (cresce ao longo dos dias + curva horária). */
const PRO_EPOCH = new Date("2026-01-01T12:00:00Z").getTime();
const BASE_PROFESSIONALS = 2000;
const DAILY_PRO_GROWTH = 2.37;

/** Reservas simuladas “hoje”: sobe ao longo do dia (fuso SP). */
const APPOINTMENTS_DAY_PEAK = 920;

function dayIndexInTz(now: Date): number {
  const z = toZonedTime(now, TZ);
  return Math.floor(Date.UTC(z.getFullYear(), z.getMonth(), z.getDate()) / 86_400_000);
}

function minutesSinceMidnightInTz(now: Date): number {
  const z = toZonedTime(now, TZ);
  return z.getHours() * 60 + z.getMinutes();
}

/** Evita números “redondos” demais (ex.: 2500, 2600). */
function avoidRound(n: number): number {
  const v = Math.floor(n);
  if (v <= 0) return v;
  if (v % 100 === 0) return v + 23;
  if (v % 50 === 0) return v + 17;
  if (v % 10 === 0) return v + 7;
  return v;
}

/**
 * Profissionais ativos: sobe por data (desde a epoch) e por hora (curva do dia).
 * Sempre retorna um inteiro “quebrado”, determinístico para o instante.
 */
export function computeActiveProfessionals(now: Date): number {
  const days = Math.max(0, Math.floor((now.getTime() - PRO_EPOCH) / 86_400_000));
  const dayBase = BASE_PROFESSIONALS + days * DAILY_PRO_GROWTH;

  const mins = minutesSinceMidnightInTz(now);
  const progress = Math.min(1, Math.max(0, mins / (24 * 60)));
  const daySeed = dayIndexInTz(now);

  // Novos cadastros simulados ao longo do dia (varia levemente por data).
  const hourlyGain = Math.pow(progress, 1.12) * ((daySeed % 9) + 5.3);

  // Offset diário quebrado (estável no dia, diferente a cada data).
  const dailyBroken = (daySeed * 43 + days * 19) % 97;

  // Micro incremento por minuto (atualiza a cada tick do componente).
  const minuteBump = (mins % 60) * 0.031 + (daySeed % 5) * 0.07;

  return avoidRound(dayBase + hourlyGain + dailyBroken + minuteBump);
}

/** Agendamentos “hoje”: curva suave da madrugada até o fim do dia. */
export function computeAppointmentsToday(now: Date): number {
  const mins = minutesSinceMidnightInTz(now);
  const progress = Math.min(1, Math.max(0, mins / (24 * 60)));
  const curve = Math.pow(progress, 1.35);
  const dayVariation = (dayIndexInTz(now) % 5) * 18;
  const peak = APPOINTMENTS_DAY_PEAK + dayVariation;
  const base = progress < 0.04 ? 8 : peak * curve;
  const minuteNoise = (mins % 60) * 0.18 + (dayIndexInTz(now) % 7);
  return avoidRound(Math.max(8, base + minuteNoise));
}

/** Exibe o número inteiro com separador de milhar (sem arredondar para “2k”). */
export function formatLandingStatExact(n: number, locale = "pt-BR"): string {
  return Math.floor(n).toLocaleString(locale);
}

/** Legado: compactação para valores muito altos (não usado nos stats ao vivo). */
export function formatLandingStat(n: number): string {
  if (n >= 10_000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(".0", "")}k+`;
  }
  if (n >= 1000) {
    const whole = Math.floor(n / 1000);
    const rest = n % 1000;
    if (rest >= 100) return `${whole}.${Math.floor(rest / 100)}k+`;
    return `${whole}k+`;
  }
  return n.toLocaleString("pt-BR");
}

export function localeToNumberFormat(locale: "pt" | "en" | "es"): string {
  if (locale === "pt") return "pt-BR";
  if (locale === "es") return "es";
  return "en-US";
}
