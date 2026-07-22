import type { SupabaseClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/site-url";
import {
  computeDurationLabel,
  formatAppointmentDate,
  formatAppointmentTime,
  formatCentsBrl,
  normalizePhoneE164,
} from "../variables";
import type { WhatsAppEventKey, WhatsAppTemplateContext } from "../types";
import { enqueueWhatsAppFromTemplate } from "../outbox";
import { resolveOwnerAlertPhone } from "../resolve-recipients";

export type AppointmentWhatsAppPayload = {
  appointmentId: string;
  businessId: string;
  clientId?: string | null;
  clientName: string;
  clientPhone?: string | null;
  serviceName: string;
  collaboratorName: string;
  collaboratorPhone?: string | null;
  date: string;
  timeStart: string;
  timeEnd: string;
  priceCents: number;
  paymentDueCents?: number | null;
  paymentCollectedCents?: number | null;
  paymentStatus?: string | null;
  status: string;
  notes?: string | null;
  businessName: string;
  businessPhone?: string | null;
  businessSlug: string;
  ownerPhone?: string | null;
  address?: string | null;
  paymentPolicyLabel?: string | null;
};

/**
 * Monta contexto de variaveis para templates a partir de dados ja carregados no servidor.
 * Nao faz queries adicionais.
 */
export function buildTemplateContextFromAppointment(p: AppointmentWhatsAppPayload): WhatsAppTemplateContext {
  const site = getSiteUrl().replace(/\/$/, "");
  const vitrine = `${site}/${p.businessSlug}`;
  const agendar = `${vitrine}/agendar`;

  const due = p.paymentDueCents ?? 0;
  const collected = p.paymentCollectedCents ?? 0;
  const remaining = Math.max(0, p.priceCents - collected);

  return {
    nome: p.clientName,
    empresa: p.businessName,
    profissional: p.collaboratorName,
    servico: p.serviceName,
    data: formatAppointmentDate(p.date),
    hora: formatAppointmentTime(p.timeStart),
    hora_fim: formatAppointmentTime(p.timeEnd),
    duracao: computeDurationLabel(p.timeStart, p.timeEnd),
    endereco: p.address ?? "",
    telefone_empresa: p.businessPhone ?? "",
    telefone_cliente: p.clientPhone ?? "",
    valor: formatCentsBrl(p.priceCents),
    valor_sinal: due > 0 ? formatCentsBrl(due) : formatCentsBrl(p.priceCents),
    valor_restante: remaining > 0 ? formatCentsBrl(remaining) : "R$ 0,00",
    forma_pagamento: p.paymentPolicyLabel ?? "",
    status: p.status,
    link: agendar,
    link_vitrine: vitrine,
    link_agendamento: agendar,
    link_cancelamento: `${site}/conta`,
    observacoes: p.notes ?? "",
  };
}

export function appointmentStartsAt(date: string, timeStart: string): Date {
  return new Date(`${date}T${timeStart.length === 5 ? `${timeStart}:00` : timeStart}`);
}

type TemplateRow = {
  event_key: string;
  recipient_role: string;
  enabled: boolean;
  body: string;
};

type SettingsRow = {
  master_enabled: boolean;
  notify_owner_on_new_booking: boolean;
  notify_owner_on_cancellation: boolean;
  notify_owner_on_payment: boolean;
  notify_staff_on_new_booking: boolean;
  notify_staff_on_cancellation: boolean;
  default_country_code: string;
  owner_notification_phone: string | null;
};

/**
 * Ponto de integracao para eventos de agendamento.
 * Nao e chamado pelos fluxos atuais; use quando conectar book/cancel/webhook.
 * Respeita master_enabled e flags por evento sem alterar comportamento existente ate ser ligado.
 */
export async function enqueueWhatsAppForAppointmentEvent(
  admin: SupabaseClient,
  eventKey: WhatsAppEventKey,
  payload: AppointmentWhatsAppPayload,
  options?: { force?: boolean }
): Promise<{ enqueued: string[]; skipped: string[] }> {
  const enqueued: string[] = [];
  const skipped: string[] = [];

  const [{ data: settings }, { data: templates }, { data: session }] = await Promise.all([
    admin.from("whatsapp_settings").select("*").eq("business_id", payload.businessId).maybeSingle(),
    admin.from("whatsapp_message_templates").select("event_key, recipient_role, enabled, body").eq("business_id", payload.businessId),
    admin.from("whatsapp_sessions").select("phone_e164, status").eq("business_id", payload.businessId).maybeSingle(),
  ]);

  if (!settings?.master_enabled && !options?.force) {
    return { enqueued, skipped: ["master_disabled"] };
  }

  const s = settings as SettingsRow;
  const templateList = (templates ?? []) as TemplateRow[];
  const context = buildTemplateContextFromAppointment(payload);
  const startsAt = appointmentStartsAt(payload.date, payload.timeStart);

  const tryEnqueue = async (
    key: WhatsAppEventKey,
    role: "client" | "owner" | "staff",
    phone: string | null | undefined,
    name?: string | null
  ) => {
    if (!phone) {
      skipped.push(`${key}:${role}:no_phone`);
      return;
    }
    const tpl = templateList.find((t) => t.event_key === key && t.recipient_role === role);
    if (!tpl?.enabled) {
      skipped.push(`${key}:${role}:disabled`);
      return;
    }
    const normalized = normalizePhoneE164(phone, s.default_country_code ?? "55");
    if (!normalized) {
      skipped.push(`${key}:${role}:invalid_phone`);
      return;
    }
    const { id, error } = await enqueueWhatsAppFromTemplate(admin, {
      businessId: payload.businessId,
      eventKey: key,
      recipientRole: role,
      recipientPhone: normalized,
      recipientName: name,
      templateBody: tpl.body,
      context,
      appointmentId: payload.appointmentId,
      clientId: payload.clientId,
      appointmentStartsAt: startsAt,
    });
    if (error || !id) skipped.push(`${key}:${role}:${error ?? "error"}`);
    else enqueued.push(id);
  };

  const ownerAllowed =
    (eventKey === "owner_new_booking" && s.notify_owner_on_new_booking) ||
    (eventKey === "owner_booking_cancelled" && s.notify_owner_on_cancellation) ||
    (eventKey === "owner_payment_received" && s.notify_owner_on_payment) ||
    eventKey === "owner_daily_summary";

  const staffAllowed =
    (eventKey === "staff_new_booking" && s.notify_staff_on_new_booking) ||
    (eventKey === "staff_booking_cancelled" && s.notify_staff_on_cancellation) ||
    eventKey === "staff_day_reminder";

  if (eventKey.startsWith("owner_")) {
    if (ownerAllowed) {
      const ownerPhone = resolveOwnerAlertPhone(
        s.owner_notification_phone,
        session?.phone_e164 ?? null,
        payload.ownerPhone ?? payload.businessPhone
      );
      await tryEnqueue(eventKey, "owner", ownerPhone, payload.businessName);
    }
    return { enqueued, skipped };
  }

  if (eventKey.startsWith("staff_")) {
    if (staffAllowed) await tryEnqueue(eventKey, "staff", payload.collaboratorPhone, payload.collaboratorName);
    return { enqueued, skipped };
  }

  await tryEnqueue(eventKey, "client", payload.clientPhone, payload.clientName);
  return { enqueued, skipped };
}

export async function ensureWhatsAppDefaults(admin: SupabaseClient, businessId: string) {
  const { error } = await admin.rpc("seed_whatsapp_defaults", { p_business_id: businessId });
  return { error: error?.message ?? null };
}
