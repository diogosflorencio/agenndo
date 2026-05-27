/** Curva compartilhada — página pública e fluxo de agendamento. */
export const PUBLIC_PAGE_EASE = [0.32, 0.72, 0, 1] as const;

export function publicPageMotionDuration(reduced: boolean | null, ms = 320) {
  return reduced ? 0.01 : ms / 1000;
}
