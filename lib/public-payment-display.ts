import {
  computeAppointmentDueCents,
  DEFAULT_PAYMENT_CLIENT_MESSAGE,
  DEPOSIT_NO_SHOW_NOTE,
  PAYMENT_POLICY_LABELS,
  type BusinessPaymentSettings,
  type PaymentPolicy,
} from "@/lib/business-payment-policy";

export type PublicBusinessPaymentFields = {
  payment_policy: PaymentPolicy;
  deposit_mode: "percent" | "fixed";
  deposit_percent: number | null;
  deposit_fixed_cents: number | null;
  payment_client_message: string | null;
  mp_checkout_enabled: boolean;
  mp_connected: boolean;
};

export function buildPublicPaymentHint(
  priceCents: number,
  settings: PublicBusinessPaymentFields
): {
  policyLabel: string;
  clientMessage: string;
  dueLabel: string;
  paymentRequired: boolean;
  depositNote: string | null;
} | null {
  const due = computeAppointmentDueCents(priceCents, settings);
  if (due.dueCents <= 0) return null;

  const paymentRequired = due.policy === "required_deposit" || due.policy === "required_full";
  const dueLabel =
    due.kind === "deposit"
      ? `Sinal: ${formatBrl(due.dueCents)} (resta ${formatBrl(due.remainingAtVenueCents)} no local)`
      : `Total online: ${formatBrl(due.dueCents)}`;

  return {
    policyLabel: PAYMENT_POLICY_LABELS[due.policy],
    clientMessage: settings.payment_client_message?.trim() || DEFAULT_PAYMENT_CLIENT_MESSAGE,
    dueLabel,
    paymentRequired,
    depositNote: due.kind === "deposit" ? DEPOSIT_NO_SHOW_NOTE : null,
  };
}

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

/** Alinhado ao dashboard (mp_user_id + mp_connected_at); token como fallback. */
export function isPublicMpConnected(row: Record<string, unknown>): boolean {
  return Boolean(
    row.mp_user_id &&
      (row.mp_connected_at || row.mp_access_token_enc)
  );
}

export function toPublicPaymentSettings(
  row: Record<string, unknown>
): PublicBusinessPaymentFields {
  const mpConnected = isPublicMpConnected(row);
  return {
    payment_policy:
      row.payment_policy === "optional" ||
      row.payment_policy === "required_deposit" ||
      row.payment_policy === "required_full"
        ? row.payment_policy
        : "off",
    deposit_mode: row.deposit_mode === "fixed" ? "fixed" : "percent",
    deposit_percent: typeof row.deposit_percent === "number" ? row.deposit_percent : null,
    deposit_fixed_cents: typeof row.deposit_fixed_cents === "number" ? row.deposit_fixed_cents : null,
    payment_client_message:
      typeof row.payment_client_message === "string" ? row.payment_client_message : null,
    mp_checkout_enabled: Boolean(row.mp_checkout_enabled),
    mp_connected: mpConnected,
  };
}
