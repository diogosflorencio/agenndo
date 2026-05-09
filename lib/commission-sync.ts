import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeCommissionAmountCents,
  computeCommissionBaseAmount,
  resolveCommissionPercent,
  type CommissionCalculationBase,
  type CommissionRuleSource,
} from "@/lib/commission-resolve";

type SettingsRow = {
  enabled: boolean;
  default_percent: number;
  calculation_base: CommissionCalculationBase;
};

/**
 * Cria ou atualiza o snapshot de comissão quando o atendimento vai para compareceu.
 * Idempotente por appointment_id (upsert lógico).
 */
export async function upsertCommissionForCompletedAppointment(opts: {
  supabase: SupabaseClient;
  businessId: string;
  appointmentId: string;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, businessId, appointmentId } = opts;

  const { data: settings } = await supabase
    .from("business_commission_settings")
    .select("enabled, default_percent, calculation_base")
    .eq("business_id", businessId)
    .maybeSingle();

  const s = settings as SettingsRow | null;
  if (!s?.enabled) return { ok: true };

  const { data: apt, error: aptErr } = await supabase
    .from("appointments")
    .select("id, business_id, collaborator_id, service_id, price_cents, processor_fee_cents, status")
    .eq("id", appointmentId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (aptErr) return { error: aptErr.message };
  if (!apt || apt.status !== "compareceu") return { ok: true };

  const priceCents = Number(apt.price_cents) || 0;
  const processorFeeCents = Number(apt.processor_fee_cents) || 0;
  const collaboratorId = apt.collaborator_id as string;
  const serviceId = apt.service_id as string;

  const [{ data: svcCollabRule }, { data: svcOnlyRule }, { data: collabDef }] = await Promise.all([
    supabase
      .from("commission_service_rules")
      .select("percent")
      .eq("business_id", businessId)
      .eq("service_id", serviceId)
      .eq("collaborator_id", collaboratorId)
      .maybeSingle(),
    supabase
      .from("commission_service_rules")
      .select("percent")
      .eq("business_id", businessId)
      .eq("service_id", serviceId)
      .is("collaborator_id", null)
      .maybeSingle(),
    supabase.from("commission_collaborator_defaults").select("percent").eq("collaborator_id", collaboratorId).maybeSingle(),
  ]);

  const serviceCollaboratorPercent =
    svcCollabRule != null ? Number((svcCollabRule as { percent: string }).percent) : null;
  const serviceOnlyPercent = svcOnlyRule != null ? Number((svcOnlyRule as { percent: string }).percent) : null;
  const collaboratorDefaultPercent = collabDef != null ? Number((collabDef as { percent: string }).percent) : null;

  const { percent, ruleSource } = resolveCommissionPercent({
    defaultPercent: Number(s.default_percent),
    collaboratorDefaultPercent,
    serviceOnlyPercent,
    serviceCollaboratorPercent,
  });

  const baseAmountCents = computeCommissionBaseAmount({
    priceCents,
    processorFeeCents,
    calculationBase: s.calculation_base,
  });
  const amountCents = computeCommissionAmountCents(baseAmountCents, percent);

  const payload = {
    business_id: businessId,
    appointment_id: appointmentId,
    collaborator_id: collaboratorId,
    service_id: serviceId,
    appointment_price_cents: priceCents,
    processor_fee_cents_snapshot: processorFeeCents,
    calculation_base: s.calculation_base,
    base_amount_cents: baseAmountCents,
    percent_applied: percent,
    amount_cents: amountCents,
    rule_source: ruleSource,
    status: "pending" as const,
  };

  const { data: existing } = await supabase
    .from("appointment_commissions")
    .select("id, status")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  const row = existing as { id: string; status: string } | null;
  if (row?.status === "void") return { ok: true };

  if (row?.id) {
    const { error } = await supabase
      .from("appointment_commissions")
      .update({
        appointment_price_cents: priceCents,
        processor_fee_cents_snapshot: processorFeeCents,
        calculation_base: s.calculation_base,
        base_amount_cents: baseAmountCents,
        percent_applied: percent,
        amount_cents: amountCents,
        rule_source: ruleSource as CommissionRuleSource,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .in("status", ["pending", "approved"]);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("appointment_commissions").insert(payload);
    if (error) return { error: error.message };
  }

  return { ok: true };
}

/** Recalcula valor em centavos mantendo percent_applied congelado (edição de valor do atendimento). */
export async function recalculateCommissionAmountForAppointment(opts: {
  supabase: SupabaseClient;
  businessId: string;
  appointmentId: string;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, businessId, appointmentId } = opts;

  const { data: ac } = await supabase
    .from("appointment_commissions")
    .select(
      "id, status, percent_applied, calculation_base, appointment_id, payout_batch_id"
    )
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (!ac) return { ok: true };
  const row = ac as {
    id: string;
    status: string;
    percent_applied: number;
    calculation_base: CommissionCalculationBase;
    payout_batch_id: string | null;
  };
  if (row.status === "void" || row.status === "paid") return { ok: true };

  const { data: apt } = await supabase
    .from("appointments")
    .select("price_cents, processor_fee_cents")
    .eq("id", appointmentId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!apt) return { ok: true };

  const priceCents = Number((apt as { price_cents: number }).price_cents) || 0;
  const processorFeeCents = Number((apt as { processor_fee_cents?: number }).processor_fee_cents) || 0;
  const baseAmountCents = computeCommissionBaseAmount({
    priceCents,
    processorFeeCents,
    calculationBase: row.calculation_base,
  });
  const percent = Number(row.percent_applied);
  const amountCents = computeCommissionAmountCents(baseAmountCents, percent);

  const { error } = await supabase
    .from("appointment_commissions")
    .update({
      appointment_price_cents: priceCents,
      processor_fee_cents_snapshot: processorFeeCents,
      base_amount_cents: baseAmountCents,
      amount_cents: amountCents,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (error) return { error: error.message };
  return { ok: true };
}

export async function voidCommissionForAppointment(opts: {
  supabase: SupabaseClient;
  businessId: string;
  appointmentId: string;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, businessId, appointmentId } = opts;

  const { data: row } = await supabase
    .from("appointment_commissions")
    .select("id, status")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (!row) return { ok: true };
  const st = (row as { status: string }).status;
  if (st === "paid") {
    return { error: "Comissão já marcada como paga; estorne manualmente em Financeiro > Comissões." };
  }

  const { error } = await supabase
    .from("appointment_commissions")
    .update({
      status: "void",
      updated_at: new Date().toISOString(),
    })
    .eq("appointment_id", appointmentId)
    .eq("business_id", businessId);

  if (error) return { error: error.message };
  return { ok: true };
}

export async function voidCommissionsForAppointments(opts: {
  supabase: SupabaseClient;
  businessId: string;
  appointmentIds: string[];
}): Promise<{ ok: true } | { error: string }> {
  const ids = opts.appointmentIds.filter(Boolean);
  if (ids.length === 0) return { ok: true };

  const { data: rows } = await opts.supabase
    .from("appointment_commissions")
    .select("appointment_id, status")
    .eq("business_id", opts.businessId)
    .in("appointment_id", ids);

  const paid = (rows ?? []).filter((r: { status?: string }) => r.status === "paid");
  if (paid.length > 0) {
    return {
      error:
        "Um ou mais agendamentos têm comissão já paga. Remova-os da seleção ou estorne os pagamentos antes de cancelar.",
    };
  }

  const { error } = await opts.supabase
    .from("appointment_commissions")
    .update({ status: "void", updated_at: new Date().toISOString() })
    .eq("business_id", opts.businessId)
    .in("appointment_id", ids)
    .neq("status", "paid");

  if (error) return { error: error.message };
  return { ok: true };
}
