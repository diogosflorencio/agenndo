import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mpGetPayment } from "@/lib/mercadopago/api";
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
    .select("id, status")
    .eq("provider", "mercadopago")
    .eq("provider_payment_id", paymentId)
    .maybeSingle();

  if (existing?.status === "approved") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Descobrir negócio via external_reference após fetch (precisamos de um token — tentamos pagamentos pendentes)
  const { data: pendingRows } = await admin
    .from("appointment_payments")
    .select("business_id, appointment_id")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  let mpPayment = null;
  let matchedBusinessId: string | null = null;

  for (const row of pendingRows ?? []) {
    const creds = await getBusinessMpAccessToken(admin, row.business_id);
    if (!creds) continue;
    try {
      const p = await mpGetPayment(creds.accessToken, paymentId);
      if (p.external_reference === row.appointment_id) {
        mpPayment = p;
        matchedBusinessId = row.business_id;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!mpPayment || !matchedBusinessId) {
    return NextResponse.json({ ignored: true }, { status: 200 });
  }

  const appointmentId = mpPayment.external_reference;
  if (!appointmentId) return NextResponse.json({ ignored: true });

  const { data: apt } = await admin
    .from("appointments")
    .select("id, price_cents, payment_due_cents, payment_collected_cents")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!apt) return NextResponse.json({ ignored: true });

  const paidCents = Math.round(Number(mpPayment.transaction_amount) * 100);
  const expected = apt.payment_due_cents ?? apt.price_cents;
  const status = mapMpStatus(mpPayment.status);

  if (status === "approved" && paidCents < expected) {
    return NextResponse.json({ error: "amount_mismatch" }, { status: 422 });
  }

  await admin
    .from("appointment_payments")
    .update({
      provider_payment_id: String(mpPayment.id),
      status,
      amount_cents: paidCents,
      raw: mpPayment as unknown as Record<string, unknown>,
    })
    .eq("appointment_id", appointmentId)
    .eq("business_id", matchedBusinessId);

  if (status === "approved") {
    const collected = (apt.payment_collected_cents ?? 0) + paidCents;
    const isFull = collected >= apt.price_cents;
    await admin
      .from("appointments")
      .update({
        payment_collected_cents: collected,
        payment_status: isFull ? "paid" : "partial",
        status: "confirmado",
      })
      .eq("id", appointmentId);
  }

  return NextResponse.json({ ok: true });
}
