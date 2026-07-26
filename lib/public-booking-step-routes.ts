/** Etapas do agendamento público - segmentos estáveis na URL (`/[slug]/agendar/...`). */

export const PUBLIC_BOOKING_STEP_SEGMENTS = [
  "servico",
  "profissional",
  "data",
  "horario",
  "confirmar",
] as const;

export type PublicBookingStepSegment = (typeof PUBLIC_BOOKING_STEP_SEGMENTS)[number];

const STEP_TO_SEGMENT: Record<number, PublicBookingStepSegment> = {
  1: "servico",
  2: "profissional",
  3: "data",
  4: "horario",
  5: "confirmar",
};

export function bookingStepToSegment(step: number): PublicBookingStepSegment {
  const s = STEP_TO_SEGMENT[step];
  return s ?? "servico";
}

export function segmentToBookingStep(raw: string | undefined | null): 1 | 2 | 3 | 4 | 5 | null {
  if (raw == null || raw === "") return null;
  const s = raw.trim().toLowerCase();
  const n = Number(s);
  if (n >= 1 && n <= 5) return n as 1 | 2 | 3 | 4 | 5;
  if ((PUBLIC_BOOKING_STEP_SEGMENTS as readonly string[]).includes(s)) {
    const idx = PUBLIC_BOOKING_STEP_SEGMENTS.indexOf(s as PublicBookingStepSegment);
    return (idx + 1) as 1 | 2 | 3 | 4 | 5;
  }
  return null;
}

export function isPublicBookingStepSegment(s: string): s is PublicBookingStepSegment {
  return (PUBLIC_BOOKING_STEP_SEGMENTS as readonly string[]).includes(s as PublicBookingStepSegment);
}
