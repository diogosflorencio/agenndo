export type PaymentPolicy = "off" | "optional" | "required_deposit" | "required_full";
export type DepositMode = "percent" | "fixed";

export type BusinessPaymentSettings = {
  payment_policy: PaymentPolicy;
  deposit_mode: DepositMode;
  deposit_percent: number | null;
  deposit_fixed_cents: number | null;
  payment_client_message: string | null;
  mp_checkout_enabled: boolean;
  mp_connected: boolean;
  public_pix_suggest_enabled?: boolean;
  public_pix_key?: string | null;
};

export function normalizePaymentPolicy(v: unknown): PaymentPolicy {
  if (v === "optional" || v === "required_deposit" || v === "required_full") return v;
  return "off";
}

export type DueAmountResult = {
  dueCents: number;
  kind: "none" | "deposit" | "full";
  remainingAtVenueCents: number;
  policy: PaymentPolicy;
};

/** Calcula quanto cobrar online neste agendamento (sempre no servidor). */
export function computeAppointmentDueCents(
  servicePriceCents: number,
  settings: Pick<
    BusinessPaymentSettings,
    | "payment_policy"
    | "deposit_mode"
    | "deposit_percent"
    | "deposit_fixed_cents"
    | "mp_checkout_enabled"
    | "mp_connected"
  >
): DueAmountResult {
  const price = Math.max(0, Math.round(servicePriceCents));
  const policy = normalizePaymentPolicy(settings.payment_policy);
  const mpReady = settings.mp_connected && settings.mp_checkout_enabled;

  if (policy === "off" || !mpReady || price === 0) {
    return { dueCents: 0, kind: "none", remainingAtVenueCents: price, policy };
  }

  if (policy === "optional") {
    return { dueCents: price, kind: "full", remainingAtVenueCents: 0, policy };
  }

  if (policy === "required_full") {
    return { dueCents: price, kind: "full", remainingAtVenueCents: 0, policy };
  }

  // required_deposit
  let deposit = 0;
  if (settings.deposit_mode === "fixed" && settings.deposit_fixed_cents != null) {
    deposit = Math.min(price, Math.max(0, Math.round(settings.deposit_fixed_cents)));
  } else {
    const pct = Math.min(100, Math.max(1, settings.deposit_percent ?? 30));
    deposit = Math.min(price, Math.max(1, Math.round((price * pct) / 100)));
  }
  return {
    dueCents: deposit,
    kind: "deposit",
    remainingAtVenueCents: Math.max(0, price - deposit),
    policy,
  };
}

export const PAYMENT_POLICY_LABELS: Record<PaymentPolicy, string> = {
  off: "Desativado",
  optional: "Opcional - cliente pode pagar antecipado",
  required_deposit: "Sinal obrigatório antes de confirmar",
  required_full: "Pagamento integral antecipado obrigatório",
};

export const DEFAULT_PAYMENT_CLIENT_MESSAGE =
  "Você pode pagar antecipadamente de forma segura abaixo. O restante, se houver, é combinado no estabelecimento.";

export const DEPOSIT_NO_SHOW_NOTE =
  "No estabelecimento você pagará ainda o valor restante do serviço. O sinal antecipado não é reembolsável em caso de falta sem cancelamento no prazo do estabelecimento.";
