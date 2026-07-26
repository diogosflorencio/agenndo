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

type MpPaymentRow = {
  provider_payment_id?: string | null;
  status?: string | null;
  payment_kind?: string | null;
  amount_cents?: number | null;
};

function firstMpPayment(row: MpPaymentRow | MpPaymentRow[] | null | undefined): MpPaymentRow | null {
  if (!row) return null;
  return Array.isArray(row) ? (row[0] ?? null) : row;
}

export function getAppointmentPaymentBadge(apt: {
  payment_status?: unknown;
  payment_due_cents?: number | null;
  payment_collected_cents?: number | null;
  price_cents?: number;
  status?: string;
  appointment_payments?: MpPaymentRow | MpPaymentRow[] | null;
}): { label: string; hint: string | null; tone: "neutral" | "warn" | "ok" | "info" } | null {
  const ps = normalizeAppointmentPaymentStatus(apt.payment_status);
  const due = apt.payment_due_cents ?? 0;
  const collected = apt.payment_collected_cents ?? 0;
  const price = apt.price_cents ?? 0;
  const mp = firstMpPayment(apt.appointment_payments);
  const mpId = mp?.provider_payment_id?.trim();
  const mpIdHint = mpId ? `Transação MP #${mpId}` : null;

  if (ps === "none") return null;

  if (ps === "pending") {
    const reserved = apt.status === "agendado";
    return {
      label: reserved ? "Reservado - aguardando pagamento MP" : "Pagamento MP em processamento",
      hint: [due > 0 ? `Valor devido: ${formatBrl(due)}` : null, mpIdHint].filter(Boolean).join(" · ") || null,
      tone: "warn",
    };
  }
  if (ps === "optional") {
    return {
      label: "Agendado - pagamento online opcional",
      hint: due > 0 ? `Pode antecipar até ${formatBrl(due)} via Mercado Pago` : null,
      tone: "info",
    };
  }
  if (ps === "partial") {
    return {
      label: "Agendado e pago (sinal MP)",
      hint:
        [
          collected > 0 && price > collected
            ? `${formatBrl(collected)} recebido · resta ${formatBrl(price - collected)} no local`
            : collected > 0
              ? `${formatBrl(collected)} recebido`
              : null,
          mpIdHint,
          mp?.payment_kind === "deposit" ? "Sinal antecipado" : null,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      tone: "ok",
    };
  }
  if (ps === "paid") {
    return {
      label: "Agendado e pago via Mercado Pago",
      hint: [collected > 0 ? formatBrl(collected) : price > 0 ? formatBrl(price) : null, mpIdHint]
        .filter(Boolean)
        .join(" · ") || null,
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
