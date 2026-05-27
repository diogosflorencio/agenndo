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

/** Política MP visível na vitrine (política ativa + checkout ou conta conectada). */
export function isPublicMpPolicyVisible(settings: PublicBusinessPaymentFields): boolean {
  return (
    settings.payment_policy !== "off" &&
    (settings.mp_checkout_enabled || settings.mp_connected)
  );
}

export type PublicMercadoPagoCard = {
  policyLabel: string;
  clientMessage: string;
  dueLabel: string | null;
  serviceTotalLabel: string;
  paymentRequired: boolean;
  depositNote: string | null;
  canPayOnline: boolean;
  dueCents: number;
};

/** Card Mercado Pago na confirmação — não depende só de dueCents (evita sumir por mp_connected no cliente). */
export function buildPublicMercadoPagoCard(
  priceCents: number,
  settings: PublicBusinessPaymentFields
): PublicMercadoPagoCard | null {
  if (!isPublicMpPolicyVisible(settings)) return null;

  const due = computeAppointmentDueCents(priceCents, settings);
  const paymentRequired =
    settings.payment_policy === "required_deposit" || settings.payment_policy === "required_full";
  const canPayOnline = settings.mp_connected && settings.mp_checkout_enabled;

  let dueLabel: string | null = null;
  if (priceCents > 0 && canPayOnline && due.dueCents > 0) {
    dueLabel =
      due.kind === "deposit"
        ? `Sinal online: ${formatBrl(due.dueCents)} · no local: ${formatBrl(due.remainingAtVenueCents)}`
        : `Pagamento online: ${formatBrl(due.dueCents)}`;
  } else if (priceCents > 0) {
    dueLabel = `Valor do serviço: ${formatBrl(priceCents)}`;
  }

  return {
    policyLabel: PAYMENT_POLICY_LABELS[settings.payment_policy],
    clientMessage: settings.payment_client_message?.trim() || DEFAULT_PAYMENT_CLIENT_MESSAGE,
    dueLabel,
    serviceTotalLabel: formatBrl(priceCents),
    paymentRequired,
    depositNote:
      settings.payment_policy === "required_deposit" && canPayOnline ? DEPOSIT_NO_SHOW_NOTE : null,
    canPayOnline,
    dueCents: due.dueCents,
  };
}

/** @deprecated use buildPublicMercadoPagoCard */
export function buildPublicPaymentHint(
  priceCents: number,
  settings: PublicBusinessPaymentFields
) {
  return buildPublicMercadoPagoCard(priceCents, settings);
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
