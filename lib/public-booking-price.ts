import type { SupabaseClient } from "@supabase/supabase-js";
import { computeAppointmentDueCents, type BusinessPaymentSettings } from "@/lib/business-payment-policy";
import { normalizeVariantGallery, variantEffectivePriceCents } from "@/lib/service-variants";
import { toPublicPaymentSettings } from "@/lib/public-payment-display";

/** Teto de sanidade (~R$ 500.000) — evita overflow / valores absurdos. */
export const MAX_BOOKING_PRICE_CENTS = 50_000_000;

const FORBIDDEN_BOOKING_BODY_KEYS = new Set([
  "price",
  "pricecents",
  "price_cents",
  "amount",
  "amountcents",
  "amount_cents",
  "total",
  "totalcents",
  "total_cents",
  "value",
  "valor",
  "payment_due_cents",
  "paymentduecents",
  "payment_collected_cents",
  "unit_price",
  "unitprice",
  "transaction_amount",
]);

export function sanitizePriceCents(raw: unknown): number {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n);
  if (rounded < 0) return 0;
  if (rounded > MAX_BOOKING_PRICE_CENTS) return MAX_BOOKING_PRICE_CENTS;
  return rounded;
}

/** Rejeita tentativa de enviar preço no body do cliente (preço vem só do catálogo no servidor). */
export function findForbiddenBookingPriceField(body: Record<string, unknown>): string | null {
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_BOOKING_BODY_KEYS.has(key.replace(/_/g, "").toLowerCase())) {
      return key;
    }
  }
  return null;
}

export type ResolvedBookingPrice = {
  priceCents: number;
  serviceVariantIndex: number | null;
  serviceVariantLabel: string | null;
};

export function resolveBookingPriceCents(input: {
  servicePriceCents: unknown;
  variantGallery: unknown;
  serviceVariantIndexRaw: unknown;
}):
  | { ok: true; value: ResolvedBookingPrice }
  | { ok: false; error: string } {
  const base = sanitizePriceCents(input.servicePriceCents);
  const variantOptions = normalizeVariantGallery(input.variantGallery);

  if (variantOptions.length > 0) {
    const idx =
      typeof input.serviceVariantIndexRaw === "number" && Number.isInteger(input.serviceVariantIndexRaw)
        ? input.serviceVariantIndexRaw
        : null;
    if (idx === null) {
      return { ok: false, error: "Selecione uma opção do serviço antes de agendar" };
    }
    if (idx < 0 || idx >= variantOptions.length) {
      return { ok: false, error: "Variação inválida para este serviço" };
    }
    const picked = variantOptions[idx]!;
    const t = picked.title?.trim();
    return {
      ok: true,
      value: {
        priceCents: variantEffectivePriceCents(picked, base),
        serviceVariantIndex: idx,
        serviceVariantLabel: t && t.length > 0 ? t.slice(0, 120) : `Opção ${idx + 1}`,
      },
    };
  }

  if (input.serviceVariantIndexRaw !== undefined && input.serviceVariantIndexRaw !== null) {
    return { ok: false, error: "Variação inválida para este serviço" };
  }

  return {
    ok: true,
    value: {
      priceCents: base,
      serviceVariantIndex: null,
      serviceVariantLabel: null,
    },
  };
}

export function pricesMatchCents(a: unknown, b: unknown): boolean {
  return sanitizePriceCents(a) === sanitizePriceCents(b);
}

export type VerifiedAppointmentPricing = {
  priceCents: number;
  paymentDueCents: number;
  due: ReturnType<typeof computeAppointmentDueCents>;
  paymentSettings: BusinessPaymentSettings;
};

type ServiceRow = {
  price_cents: unknown;
  variant_gallery: unknown;
};

type AppointmentPricingRow = {
  id: string;
  business_id: string;
  status?: string;
  price_cents: unknown;
  payment_due_cents: number | null;
  service_variant_index: number | null;
  services: ServiceRow | ServiceRow[] | null;
  businesses: Record<string, unknown> | Record<string, unknown>[] | null;
};

function firstRow<T>(row: T | T[] | null | undefined): T | null {
  if (row == null) return null;
  return Array.isArray(row) ? (row[0] ?? null) : row;
}

/**
 * Recalcula preço/due a partir do serviço no banco e confere com o agendamento salvo.
 */
export function verifyAppointmentPricingRow(
  apt: AppointmentPricingRow
): { ok: true; value: VerifiedAppointmentPricing } | { ok: false; error: string } {
  const svc = firstRow(apt.services);
  const biz = firstRow(apt.businesses);
  if (!svc || !biz) {
    return { ok: false, error: "Dados do serviço indisponíveis para validar valor" };
  }

  const resolved = resolveBookingPriceCents({
    servicePriceCents: svc.price_cents,
    variantGallery: svc.variant_gallery,
    serviceVariantIndexRaw: apt.service_variant_index,
  });
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const canonicalPrice = resolved.value.priceCents;
  if (!pricesMatchCents(apt.price_cents, canonicalPrice)) {
    return { ok: false, error: "Valor do agendamento não confere com o serviço" };
  }

  const paymentSettings = toPublicPaymentSettings(biz);
  const due = computeAppointmentDueCents(canonicalPrice, paymentSettings);
  const storedDue = apt.payment_due_cents;
  const canonicalDue = due.dueCents > 0 ? due.dueCents : null;

  if (storedDue != null && canonicalDue != null && !pricesMatchCents(storedDue, canonicalDue)) {
    return { ok: false, error: "Valor de pagamento não confere com a política do negócio" };
  }
  if (storedDue != null && canonicalDue == null && sanitizePriceCents(storedDue) > 0) {
    return { ok: false, error: "Valor de pagamento inválido para este agendamento" };
  }
  if ((storedDue == null || sanitizePriceCents(storedDue) === 0) && canonicalDue != null && canonicalDue > 0) {
    return { ok: false, error: "Pagamento pendente não registrado corretamente" };
  }

  return {
    ok: true,
    value: {
      priceCents: canonicalPrice,
      paymentDueCents: canonicalDue ?? 0,
      due,
      paymentSettings,
    },
  };
}

const APPOINTMENT_PRICING_SELECT = `
  id,
  business_id,
  status,
  price_cents,
  payment_due_cents,
  payment_status,
  service_variant_index,
  services ( price_cents, variant_gallery ),
  businesses (
    name,
    payment_policy,
    deposit_mode,
    deposit_percent,
    deposit_fixed_cents,
    payment_client_message,
    mp_checkout_enabled,
    mp_user_id,
    mp_connected_at,
    mp_access_token_enc
  )
`;

/** Carrega agendamento + serviço e valida preço/due contra o catálogo (anti-tamper). */
export async function loadAndVerifyAppointmentPricing(
  admin: SupabaseClient,
  appointmentId: string
): Promise<
  | ({ ok: true; appointment: AppointmentPricingRow } & { value: VerifiedAppointmentPricing })
  | { ok: false; error: string; status: number }
> {
  const { data: apt, error } = await admin
    .from("appointments")
    .select(APPOINTMENT_PRICING_SELECT)
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !apt?.id) {
    return { ok: false, error: "Agendamento não encontrado", status: 404 };
  }

  const verified = verifyAppointmentPricingRow(apt as AppointmentPricingRow);
  if (!verified.ok) {
    return { ok: false, error: verified.error, status: 409 };
  }

  return { ok: true, appointment: apt as AppointmentPricingRow, value: verified.value };
}
