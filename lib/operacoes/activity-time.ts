/**
 * Timestamps na UI Operações: strings `YYYY-MM-DD` (coluna `date` do Postgres)
 * não podem ir direto para `new Date()` (vira meia-noite UTC → 21h no BR).
 */
export function operacoesActivityMs(iso: string): number {
  const t = iso.trim();
  if (!t) return NaN;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [y, m, d] = t.split("-").map(Number);
    return new Date(y, m - 1, d, 12, 0, 0).getTime();
  }
  return new Date(t).getTime();
}

/** “Instante” de atividade do agendamento: maior entre dia do atendimento e criação do registo. */
export function appointmentActivityInstant(date: string | null | undefined, createdAt: string | null | undefined): number {
  const c = createdAt && createdAt.trim() ? operacoesActivityMs(createdAt) : 0;
  if (!date?.trim()) return c;
  const t = date.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [y, m, d] = t.split("-").map(Number);
    const dAt = new Date(y, m - 1, d, 12, 0, 0).getTime();
    return Math.max(dAt, c);
  }
  return Math.max(operacoesActivityMs(date), c);
}
