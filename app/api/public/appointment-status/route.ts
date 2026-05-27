import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Status público do agendamento (após reserva) — para polling na tela de pagamento. */
export async function GET(req: Request) {
  const appointmentId = new URL(req.url).searchParams.get("appointmentId")?.trim();
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
    .select("id, status, payment_status, payment_due_cents, payment_collected_cents, price_cents")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!apt?.id) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const { data: pay } = await admin
    .from("appointment_payments")
    .select("status, provider_payment_id, amount_cents, payment_kind, created_at")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const mpConfirmed =
    apt.status === "confirmado" &&
    (apt.payment_status === "paid" || apt.payment_status === "partial");

  const awaitingWebhook =
    apt.payment_status === "pending" ||
    (pay?.status === "pending" && apt.status === "agendado");

  return NextResponse.json({
    status: apt.status,
    paymentStatus: apt.payment_status,
    paymentDueCents: apt.payment_due_cents,
    paymentCollectedCents: apt.payment_collected_cents,
    priceCents: apt.price_cents,
    mpConfirmed,
    awaitingWebhook,
    mpPaymentId: pay?.provider_payment_id ?? null,
    mpPaymentApproved: pay?.status === "approved",
  });
}
