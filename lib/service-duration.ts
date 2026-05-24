/** Campos de duração do serviço no banco (`duration_minutes` = total). */
export type ServiceDurationFields = {
  duration_minutes: number | null | undefined;
  real_duration_minutes?: number | null | undefined;
};

const DEFAULT_MINUTES = 30;

/** Duração exibida ao cliente (permanência no estabelecimento). */
export function getServiceTotalDurationMinutes(service: ServiceDurationFields): number {
  const total = Number(service.duration_minutes);
  return Number.isFinite(total) && total > 0 ? total : DEFAULT_MINUTES;
}

/** Duração usada para bloquear a agenda e calcular horários disponíveis. */
export function getServiceBlockingDurationMinutes(service: ServiceDurationFields): number {
  const total = getServiceTotalDurationMinutes(service);
  const raw = service.real_duration_minutes;
  if (raw == null) return total;
  const real = Number(raw);
  if (!Number.isFinite(real) || real <= 0) return total;
  return Math.min(real, total);
}

export function validateServiceDurations(
  totalMinutes: number,
  realMinutes: number | null | undefined
): string | null {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 5) {
    return "A duração total deve ser de pelo menos 5 minutos.";
  }
  if (totalMinutes > 480) {
    return "A duração total não pode passar de 480 minutos.";
  }
  if (realMinutes == null || realMinutes === 0) return null;
  if (!Number.isFinite(realMinutes) || realMinutes < 5) {
    return "O tempo de ocupação deve ser de pelo menos 5 minutos.";
  }
  if (realMinutes > totalMinutes) {
    return "O tempo de ocupação não pode ser maior que a duração total.";
  }
  if (realMinutes > 480) {
    return "O tempo de ocupação não pode passar de 480 minutos.";
  }
  return null;
}

/** Valor para persistir em `real_duration_minutes` (null = fallback para total). */
export function normalizeRealDurationForSave(
  totalMinutes: number,
  realMinutes: number | null | undefined
): number | null {
  if (realMinutes == null) return null;
  const real = Number(realMinutes);
  if (!Number.isFinite(real) || real <= 0) return null;
  if (real >= totalMinutes) return null;
  return Math.round(real);
}
