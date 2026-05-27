import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mpGetPayment } from "@/lib/mercadopago/api";
import { applyMercadoPagoPaymentApproved } from "@/lib/mercadopago/apply-payment-approved";
import { getBusinessMpAccessToken } from "@/lib/mercadopago/business-mp";
import { verifyMercadoPagoWebhookSignature } from "@/lib/mercadopago/webhook-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapMpStatus(status: string): "approved" | "pending" | "rejected" | "cancelled" {
  if (status === "approved") return "approved";
  if (status === "pending" || status === "in_process") return "pending";
  if (status === "cancelled") return "cancelled";
  return "rejected";
}

async function resolvePaymentContext(
  admin: ReturnType<typeof createAdminClient>,
  paymentId: string
): Promise<{ mpPayment: Awaited<ReturnType<typeof mpGetPayment>>; businessId: string; appointmentId: string } | null> {
  const { data: byProvider } = await admin
    .from("appointment_payments")
    .select("appointment_id, business_id")
    .eq("provider", "mercadopago")
    .eq("provider_payment_id", paymentId)
    .maybeSingle();

  if (byProvider?.appointment_id && byProvider.business_id) {
    const creds = await getBusinessMpAccessToken(admin, byProvider.business_id);
    if (!creds) return null;
    try {
      const mpPayment = await mpGetPayment(creds.accessToken, paymentId);
      return {
        mpPayment,
        businessId: byProvider.business_id,
        appointmentId: byProvider.appointment_id,
      };
    } catch {
      return null;
    }
  }

  const { data: pendingRows } = await admin
    .from("appointment_payments")
    .select("business_id, appointment_id")
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false })
    .limit(80);

  for (const row of pendingRows ?? []) {
    const creds = await getBusinessMpAccessToken(admin, row.business_id);
    if (!creds) continue;
    try {
      const p = await mpGetPayment(creds.accessToken, paymentId);
      if (p.external_reference === row.appointment_id) {
        return {
          mpPayment: p,
          businessId: row.business_id,
          appointmentId: row.appointment_id,
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const topic = url.searchParams.get("topic") ?? url.searchParams.get("type");
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (dataId && !verifyMercadoPagoWebhookSignature(xSignature, xRequestId, dataId)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = await req.json();
    if (raw && typeof raw === "object") body = raw as Record<string, unknown>;
  } catch {
    /* query-only notifications */
  }

  const paymentId =
    dataId ??
    (typeof body.data === "object" && body.data && "id" in body.data
      ? String((body.data as { id: unknown }).id)
      : null);

  if (topic !== "payment" && !paymentId) {
    return NextResponse.json({ ignored: true });
  }
  if (!paymentId) {
    return NextResponse.json({ ignored: true });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "server" }, { status: 503 });
  }

  const { data: existing } = await admin
    .from("appointment_payments")
    .select("id, status, appointment_id")
    .eq("provider", "mercadopago")
    .eq("provider_payment_id", paymentId)
    .maybeSingle();

  if (existing?.status === "approved") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const ctx = await resolvePaymentContext(admin, paymentId);
  if (!ctx) {
    return NextResponse.json({ ignored: true }, { status: 200 });
  }

  const { mpPayment, businessId, appointmentId } = ctx;
  const paidCents = Math.round(Number(mpPayment.transaction_amount) * 100);
  const status = mapMpStatus(mpPayment.status);

  if (status === "pending") {
    await admin
      .from("appointment_payments")
      .update({
        provider_payment_id: String(mpPayment.id),
        status: "pending",
        amount_cents: paidCents,
        raw: mpPayment as unknown as Record<string, unknown>,
      })
      .eq("appointment_id", appointmentId)
      .eq("business_id", businessId);
    return NextResponse.json({ ok: true, pending: true });
  }

  if (status === "rejected" || status === "cancelled") {
    await admin
      .from("appointment_payments")
      .update({
        provider_payment_id: String(mpPayment.id),
        status,
        amount_cents: paidCents,
        raw: mpPayment as unknown as Record<string, unknown>,
      })
      .eq("appointment_id", appointmentId)
      .eq("business_id", businessId);
    return NextResponse.json({ ok: true, rejected: true });
  }

  if (status !== "approved") {
    return NextResponse.json({ ignored: true });
  }

  const result = await applyMercadoPagoPaymentApproved(admin, {
    appointmentId,
    businessId,
    mpPayment,
    paidCents,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? "apply_failed" }, { status: 422 });
  }

  return NextResponse.json({ ok: true, confirmed: true });
}
