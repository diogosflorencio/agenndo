import type { SupabaseClient } from "@supabase/supabase-js";

export function parseMoneyInputToCents(value: string): number | null {
  const t = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function centsToMoneyInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export async function recalcClientTotalSpent(supabase: SupabaseClient, clientId: string): Promise<{ error?: string }> {
  const { data, error } = await supabase
    .from("financial_records")
    .select("amount_cents")
    .eq("client_id", clientId)
    .eq("paid", true);

  if (error) return { error: error.message };
  const sum = (data ?? []).reduce((s, r) => s + Number(r.amount_cents), 0);
  const { error: upErr } = await supabase.from("clients").update({ total_spent_cents: sum }).eq("id", clientId);
  if (upErr) return { error: upErr.message };
  return {};
}

async function recalcClientsForFinancialRow(
  supabase: SupabaseClient,
  oldClientId: string | null | undefined,
  newClientId: string | null | undefined
) {
  const ids: string[] = [];
  if (oldClientId) ids.push(oldClientId);
  if (newClientId && newClientId !== oldClientId) ids.push(newClientId);
  for (const id of ids) {
    const r = await recalcClientTotalSpent(supabase, id);
    if (r.error) return r;
  }
  return {};
}

export type AppointmentAttendanceRow = {
  id: string;
  client_id: string | null;
  date: string;
  price_cents: number;
  status: string;
};

/**
 * Marca compareceu (com valor cobrado editável) ou faltou; sincroniza financial_records e total do cliente.
 */
export async function setAppointmentAttendance(opts: {
  supabase: SupabaseClient;
  businessId: string;
  appointment: AppointmentAttendanceRow;
  clientName: string | null;
  serviceName: string | null;
  collaboratorName: string | null;
  nextStatus: "compareceu" | "faltou";
  /** Centavos efetivamente cobrados; padrão = price_cents atual do agendamento */
  paidCents?: number;
}): Promise<{ ok: true } | { error: string }> {
  const {
    supabase,
    businessId,
    appointment,
    clientName,
    serviceName,
    collaboratorName,
    nextStatus,
  } = opts;
  const paidCents = opts.paidCents ?? appointment.price_cents;

  const { data: existingFr, error: selErr } = await supabase
    .from("financial_records")
    .select("id, client_id, amount_cents")
    .eq("appointment_id", appointment.id)
    .maybeSingle();

  if (selErr) return { error: selErr.message };

  if (nextStatus === "faltou") {
    if (existingFr?.id) {
      const oldCid = existingFr.client_id as string | null;
      const { error: delErr } = await supabase.from("financial_records").delete().eq("id", existingFr.id);
      if (delErr) return { error: delErr.message };
      if (oldCid) {
        const r = await recalcClientTotalSpent(supabase, oldCid);
        if (r.error) return { error: r.error };
      }
    }
    const { error } = await supabase
      .from("appointments")
      .update({ status: "faltou" })
      .eq("id", appointment.id)
      .eq("business_id", businessId);
    if (error) return { error: error.message };
    return { ok: true };
  }

  const { error: upApt } = await supabase
    .from("appointments")
    .update({ status: "compareceu", price_cents: paidCents })
    .eq("id", appointment.id)
    .eq("business_id", businessId);
  if (upApt) return { error: upApt.message };

  const frPayload = {
    business_id: businessId,
    appointment_id: appointment.id,
    client_id: appointment.client_id,
    date: appointment.date,
    client_name: clientName,
    service_name: serviceName,
    collaborator_name: collaboratorName,
    amount_cents: paidCents,
    paid: true,
  };

  if (existingFr?.id) {
    const oldCid = existingFr.client_id as string | null;
    const { error: frErr } = await supabase.from("financial_records").update(frPayload).eq("id", existingFr.id);
    if (frErr) return { error: frErr.message };
    const r = await recalcClientsForFinancialRow(supabase, oldCid, appointment.client_id);
    if (r.error) return { error: r.error };
  } else {
    const { error: frErr } = await supabase.from("financial_records").insert(frPayload);
    if (frErr) return { error: frErr.message };
    if (appointment.client_id) {
      const r = await recalcClientTotalSpent(supabase, appointment.client_id);
      if (r.error) return { error: r.error };
    }
  }

  return { ok: true };
}

/** Atualiza valor cobrado com agendamento já em compareceu (e lançamento vinculado). */
export async function updateCompareceuPaidAmount(opts: {
  supabase: SupabaseClient;
  businessId: string;
  appointmentId: string;
  clientId: string | null;
  paidCents: number;
  /** Se não existir lançamento financeiro (legado), cria uma linha. */
  createIfMissing?: {
    date: string;
    clientName: string | null;
    serviceName: string | null;
    collaboratorName: string | null;
  };
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, businessId, appointmentId, clientId, paidCents, createIfMissing } = opts;

  const { data: existingFr } = await supabase
    .from("financial_records")
    .select("id, client_id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  const { error: upApt } = await supabase
    .from("appointments")
    .update({ price_cents: paidCents })
    .eq("id", appointmentId)
    .eq("business_id", businessId)
    .eq("status", "compareceu");
  if (upApt) return { error: upApt.message };

  if (existingFr?.id) {
    const oldCid = existingFr.client_id as string | null;
    const { error: frErr } = await supabase
      .from("financial_records")
      .update({ amount_cents: paidCents, client_id: clientId })
      .eq("id", existingFr.id);
    if (frErr) return { error: frErr.message };
    const r = await recalcClientsForFinancialRow(supabase, oldCid, clientId);
    if (r.error) return { error: r.error };
  } else if (createIfMissing) {
    const { error: insErr } = await supabase.from("financial_records").insert({
      business_id: businessId,
      appointment_id: appointmentId,
      client_id: clientId,
      date: createIfMissing.date,
      client_name: createIfMissing.clientName,
      service_name: createIfMissing.serviceName,
      collaborator_name: createIfMissing.collaboratorName,
      amount_cents: paidCents,
      paid: true,
    });
    if (insErr) return { error: insErr.message };
    if (clientId) {
      const r = await recalcClientTotalSpent(supabase, clientId);
      if (r.error) return { error: r.error };
    }
  }

  return { ok: true };
}
