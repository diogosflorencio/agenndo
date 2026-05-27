import type { SupabaseClient } from "@supabase/supabase-js";
import type { MpPaymentInfo } from "@/lib/mercadopago/api";

/**
 * Fonte de verdade: confirma agendamento após pagamento MP aprovado (webhook).
 * Não chamar no /checkout/process — só quando o MP confirmar via webhook.
 */
export async function applyMercadoPagoPaymentApproved(
  admin: SupabaseClient,
  input: {
    appointmentId: string;
    businessId: string;
    mpPayment: MpPaymentInfo & { status_detail?: string };
    paidCents: number;
  }
): Promise<{ ok: boolean; reason?: string }> {
  const { appointmentId, businessId, mpPayment, paidCents } = input;

  const { data: apt } = await admin
    .from("appointments")
    .select("id, status, price_cents, payment_due_cents, payment_collected_cents, payment_status")
    .eq("id", appointmentId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!apt?.id) return { ok: false, reason: "appointment_not_found" };

  const expected = apt.payment_due_cents ?? apt.price_cents;
  if (paidCents < expected) {
    return { ok: false, reason: "amount_mismatch" };
  }

  const collected = (apt.payment_collected_cents ?? 0) + paidCents;
  const isFull = collected >= apt.price_cents;
  const paymentStatus = isFull ? "paid" : "partial";

  await admin
    .from("appointment_payments")
    .update({
      provider_payment_id: String(mpPayment.id),
      status: "approved",
      amount_cents: paidCents,
      raw: mpPayment as unknown as Record<string, unknown>,
    })
    .eq("appointment_id", appointmentId)
    .eq("business_id", businessId);

  const shouldConfirm = apt.status === "agendado";
  const nextAppointmentStatus = shouldConfirm ? "confirmado" : apt.status;

  await admin
    .from("appointments")
    .update({
      payment_collected_cents: collected,
      payment_status: paymentStatus,
      status: nextAppointmentStatus === "cancelado" ? "cancelado" : nextAppointmentStatus,
    })
    .eq("id", appointmentId);

  if (apt.status === "agendado" && nextAppointmentStatus === "confirmado") {
    const { data: cRow } = await admin
      .from("appointments")
      .select("client_id, date")
      .eq("id", appointmentId)
      .maybeSingle();
    if (cRow?.client_id) {
      const { data: cl } = await admin
        .from("clients")
        .select("total_appointments")
        .eq("id", cRow.client_id)
        .maybeSingle();
      const prev = Number(cl?.total_appointments) || 0;
      await admin
        .from("clients")
        .update({
          total_appointments: prev + 1,
          last_appointment_date: cRow.date,
        })
        .eq("id", cRow.client_id);
    }
  }

  return { ok: true };
}
