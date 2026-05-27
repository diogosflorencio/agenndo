import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMercadoPagoConfig } from "@/lib/mercadopago/config";
import { mpCreatePreference, mercadoPagoWebhookUrl } from "@/lib/mercadopago/api";
import { getBusinessMpAccessToken } from "@/lib/mercadopago/business-mp";
import {
  computeAppointmentDueCents,
  normalizePaymentPolicy,
  type DepositMode,
} from "@/lib/business-payment-policy";

function firstJoinedBusiness<T>(row: T | T[] | null | undefined): T | null {
  if (row == null) return null;
  return Array.isArray(row) ? (row[0] ?? null) : row;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cria preferência para Payment Brick (pagamento na própria página, sem Checkout Pro redirect).
 */
export async function POST(req: Request) {
  const cfg = getMercadoPagoConfig();
  if (!cfg?.publicKey) {
    return NextResponse.json({ error: "Mercado Pago não configurado." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const appointmentId =
    body && typeof body === "object" && typeof (body as { appointmentId?: string }).appointmentId === "string"
      ? (body as { appointmentId: string }).appointmentId.trim()
      : "";
  const successUrl =
    body && typeof body === "object" && typeof (body as { successUrl?: string }).successUrl === "string"
      ? (body as { successUrl: string }).successUrl.trim()
      : "";

  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId obrigatório" }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Servidor indisponível" }, { status: 503 });
  }

  const { data: apt } = await admin
    .from("appointments")
    .select(
      "id, business_id, price_cents, payment_status, payment_due_cents, service_id, client_name_snapshot, businesses(name, payment_policy, deposit_mode, deposit_percent, deposit_fixed_cents, payment_client_message, mp_checkout_enabled, mp_user_id, mp_access_token_enc)"
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (!apt?.id || !apt.business_id) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const biz = firstJoinedBusiness(apt.businesses);
  if (!biz) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const mp = await getBusinessMpAccessToken(admin, apt.business_id);
  if (!mp) {
    return NextResponse.json({ error: "Mercado Pago não conectado para este negócio." }, { status: 400 });
  }

  const depositMode: DepositMode = biz.deposit_mode === "fixed" ? "fixed" : "percent";
  const due = computeAppointmentDueCents(apt.price_cents, {
    payment_policy: normalizePaymentPolicy(biz.payment_policy),
    deposit_mode: depositMode,
    deposit_percent: typeof biz.deposit_percent === "number" ? biz.deposit_percent : null,
    deposit_fixed_cents: typeof biz.deposit_fixed_cents === "number" ? biz.deposit_fixed_cents : null,
    mp_checkout_enabled: Boolean(biz.mp_checkout_enabled),
    mp_connected: true,
  });

  const dueCents = apt.payment_due_cents ?? due.dueCents;
  if (dueCents <= 0) {
    return NextResponse.json({ error: "Nenhum pagamento exigido para este agendamento." }, { status: 400 });
  }

  const amount = dueCents / 100;
  const bizName = biz.name?.trim() || "Serviço";

  const preference = await mpCreatePreference(mp.accessToken, {
    externalReference: apt.id,
    notificationUrl: mercadoPagoWebhookUrl(),
    items: [{ title: `Agendamento — ${bizName}`, quantity: 1, unit_price: amount }],
    backUrls: successUrl
      ? { success: successUrl, pending: successUrl, failure: successUrl }
      : undefined,
  });

  await admin.from("appointment_payments").insert({
    appointment_id: apt.id,
    business_id: apt.business_id,
    preference_id: preference.id,
    amount_cents: dueCents,
    expected_amount_cents: dueCents,
    status: "pending",
    payment_kind: due.kind === "full" ? "full" : "deposit",
  });

  return NextResponse.json({
    preferenceId: preference.id,
    publicKey: cfg.publicKey,
    amountCents: dueCents,
    paymentKind: due.kind,
    remainingAtVenueCents: due.remainingAtVenueCents,
  });
}
