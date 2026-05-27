import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMercadoPagoConfig } from "@/lib/mercadopago/config";
import { mpCreatePreference, mercadoPagoWebhookUrl } from "@/lib/mercadopago/api";
import { getBusinessMpAccessToken } from "@/lib/mercadopago/business-mp";
import { loadAndVerifyAppointmentPricing } from "@/lib/public-booking-price";

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

  const verified = await loadAndVerifyAppointmentPricing(admin, appointmentId);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const apt = verified.appointment;
  const { paymentDueCents: dueCents, due } = verified.value;

  if (dueCents <= 0) {
    return NextResponse.json({ error: "Nenhum pagamento exigido para este agendamento." }, { status: 400 });
  }

  const mp = await getBusinessMpAccessToken(admin, apt.business_id);
  if (!mp) {
    return NextResponse.json({ error: "Mercado Pago não conectado para este negócio." }, { status: 400 });
  }

  const amount = dueCents / 100;
  const bizRow = Array.isArray(apt.businesses) ? apt.businesses[0] : apt.businesses;
  const bizName =
    bizRow && typeof bizRow === "object" && typeof (bizRow as { name?: string }).name === "string"
      ? (bizRow as { name: string }).name.trim()
      : "Serviço";

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
