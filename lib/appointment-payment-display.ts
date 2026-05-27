/** Rótulos de cobrança online (Mercado Pago) para agenda do prestador. */

export type AppointmentPaymentStatus =
  | "none"
  | "optional"
  | "pending"
  | "partial"
  | "paid"
  | "waived";

export function normalizeAppointmentPaymentStatus(v: unknown): AppointmentPaymentStatus {
  if (
    v === "optional" ||
    v === "pending" ||
    v === "partial" ||
    v === "paid" ||
    v === "waived"
  ) {
    return v;
  }
  return "none";
}

export function getAppointmentPaymentBadge(apt: {
  payment_status?: unknown;
  payment_due_cents?: number | null;
  payment_collected_cents?: number | null;
  price_cents?: number;
  status?: string;
}): { label: string; hint: string | null; tone: "neutral" | "warn" | "ok" | "info" } | null {
  const ps = normalizeAppointmentPaymentStatus(apt.payment_status);
  const due = apt.payment_due_cents ?? 0;
  const collected = apt.payment_collected_cents ?? 0;
  const price = apt.price_cents ?? 0;

  if (ps === "none") return null;

  if (ps === "pending") {
    return {
      label: "Aguardando pagamento online",
      hint: due > 0 ? `Valor devido: ${formatBrl(due)}` : null,
      tone: "warn",
    };
  }
  if (ps === "optional") {
    return {
      label: "Pode pagar online (opcional)",
      hint: due > 0 ? `Até ${formatBrl(due)} antecipado` : null,
      tone: "info",
    };
  }
  if (ps === "partial") {
    return {
      label: "Sinal recebido online",
      hint:
        collected > 0 && price > collected
          ? `Pago ${formatBrl(collected)} · resta ${formatBrl(price - collected)} no local`
          : collected > 0
            ? `Pago ${formatBrl(collected)}`
            : null,
      tone: "ok",
    };
  }
  if (ps === "paid") {
    return {
      label: "Pago online (integral)",
      hint: collected > 0 ? formatBrl(collected) : price > 0 ? formatBrl(price) : null,
      tone: "ok",
    };
  }
  if (ps === "waived") {
    return { label: "Cobrança online dispensada", hint: null, tone: "neutral" };
  }
  return null;
}

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
