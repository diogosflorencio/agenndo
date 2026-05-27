import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mpCreatePayment, mercadoPagoWebhookUrl } from "@/lib/mercadopago/api";
import { getBusinessMpAccessToken } from "@/lib/mercadopago/business-mp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/**
 * Envia pagamento ao MP. Confirmação do agendamento só no webhook (applyMercadoPagoPaymentApproved).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const b = asRecord(body);
  const appointmentId = typeof b?.appointmentId === "string" ? b.appointmentId.trim() : "";
  const formData = asRecord(b?.formData);

  if (!appointmentId || !formData) {
    return NextResponse.json({ error: "appointmentId e formData são obrigatórios" }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Servidor indisponível" }, { status: 503 });
  }

  const { data: apt } = await admin
    .from("appointments")
    .select("id, business_id, price_cents, payment_status, payment_due_cents, status")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!apt?.id || !apt.business_id) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const expectedCents = apt.payment_due_cents ?? 0;
  if (expectedCents <= 0) {
    return NextResponse.json({ error: "Nenhum pagamento pendente para este agendamento." }, { status: 400 });
  }

  const mp = await getBusinessMpAccessToken(admin, apt.business_id);
  if (!mp) {
    return NextResponse.json({ error: "Mercado Pago não conectado." }, { status: 400 });
  }

  const txAmount = Number(formData.transaction_amount);
  const expectedAmount = expectedCents / 100;
  if (!Number.isFinite(txAmount) || Math.abs(txAmount - expectedAmount) > 0.02) {
    return NextResponse.json({ error: "Valor do pagamento não confere com o agendamento." }, { status: 422 });
  }

  const paymentPayload: Record<string, unknown> = {
    ...formData,
    transaction_amount: txAmount,
    external_reference: appointmentId,
    notification_url: mercadoPagoWebhookUrl(),
    description: typeof formData.description === "string" ? formData.description : "Agendamento Agenndo",
  };

  try {
    const payment = await mpCreatePayment(mp.accessToken, paymentPayload, randomUUID());
    const paidCents = Math.round(Number(payment.transaction_amount) * 100);
    const mpStatus =
      payment.status === "approved"
        ? "approved"
        : payment.status === "pending" || payment.status === "in_process"
          ? "pending"
          : "rejected";

    await admin
      .from("appointment_payments")
      .update({
        provider_payment_id: String(payment.id),
        status: mpStatus,
        amount_cents: paidCents,
        raw: payment as unknown as Record<string, unknown>,
      })
      .eq("appointment_id", appointmentId)
      .eq("business_id", apt.business_id);

    await admin
      .from("appointments")
      .update({
        payment_status: "pending",
        ...(apt.status === "confirmado" ? {} : { status: "agendado" }),
      })
      .eq("id", appointmentId);

    return NextResponse.json({
      ok: true,
      status: payment.status,
      paymentId: payment.id,
      awaitingWebhook: true,
      message:
        "Pagamento enviado. O agendamento será confirmado assim que o Mercado Pago notificar o pagamento.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao processar pagamento";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
