import type { SupabaseClient } from "@supabase/supabase-js";
import type { EnqueueWhatsAppInput, WhatsAppEventKey, WhatsAppRecipientRole } from "./types";
import { getWhatsAppEvent } from "./events";
import { renderWhatsAppTemplate } from "./variables";

export type EnqueueFromTemplateInput = {
  businessId: string;
  eventKey: WhatsAppEventKey;
  recipientRole: WhatsAppRecipientRole;
  recipientPhone: string;
  recipientName?: string | null;
  templateBody: string;
  context: Record<string, string>;
  appointmentId?: string | null;
  clientId?: string | null;
  appointmentStartsAt?: Date | null;
  metadata?: Record<string, unknown>;
};

export function computeScheduledFor(
  scheduleKind: "immediate" | "before_appointment" | "after_appointment",
  offsetMinutes: number | null,
  appointmentStartsAt?: Date | null
): Date {
  const now = new Date();
  if (scheduleKind === "immediate" || offsetMinutes == null || !appointmentStartsAt) {
    return now;
  }
  const ms = appointmentStartsAt.getTime() + offsetMinutes * 60_000;
  const scheduled = new Date(ms);
  return scheduled.getTime() < now.getTime() ? now : scheduled;
}

export async function enqueueWhatsAppMessage(
  admin: SupabaseClient,
  input: EnqueueWhatsAppInput
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await admin
    .from("whatsapp_message_outbox")
    .insert({
      business_id: input.businessId,
      appointment_id: input.appointmentId ?? null,
      client_id: input.clientId ?? null,
      event_key: input.eventKey,
      recipient_role: input.recipientRole,
      recipient_phone: input.recipientPhone,
      recipient_name: input.recipientName ?? null,
      body: input.body,
      scheduled_for: (input.scheduledFor ?? new Date()).toISOString(),
      status: "pending",
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data.id as string, error: null };
}

export async function enqueueWhatsAppFromTemplate(
  admin: SupabaseClient,
  input: EnqueueFromTemplateInput
): Promise<{ id: string | null; error: string | null }> {
  const event = getWhatsAppEvent(input.eventKey, input.recipientRole);
  const scheduleKind = event?.scheduleKind ?? "immediate";
  const offset = event?.scheduleOffsetMinutes ?? null;
  const body = renderWhatsAppTemplate(input.templateBody, input.context);
  const scheduledFor = computeScheduledFor(scheduleKind, offset, input.appointmentStartsAt ?? null);

  return enqueueWhatsAppMessage(admin, {
    businessId: input.businessId,
    eventKey: input.eventKey,
    recipientRole: input.recipientRole,
    recipientPhone: input.recipientPhone,
    recipientName: input.recipientName,
    body,
    appointmentId: input.appointmentId,
    clientId: input.clientId,
    scheduledFor,
    metadata: input.metadata,
  });
}

export async function claimPendingOutboxBatch(
  admin: SupabaseClient,
  limit = 20
): Promise<Array<{ id: string; business_id: string; recipient_phone: string; body: string; event_key: string }>> {
  const now = new Date().toISOString();
  const { data: pending, error } = await admin
    .from("whatsapp_message_outbox")
    .select("id, business_id, recipient_phone, body, event_key")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (error || !pending?.length) return [];

  const claimed: typeof pending = [];
  for (const row of pending) {
    const { data: updated } = await admin
      .from("whatsapp_message_outbox")
      .update({ status: "claimed", claimed_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id, business_id, recipient_phone, body, event_key")
      .maybeSingle();
    if (updated) claimed.push(updated);
  }
  return claimed;
}

export async function markOutboxSent(
  admin: SupabaseClient,
  outboxId: string,
  providerMessageId?: string
) {
  await admin
    .from("whatsapp_message_outbox")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      provider_message_id: providerMessageId ?? null,
      last_error: null,
    })
    .eq("id", outboxId);
}

export async function markOutboxFailed(admin: SupabaseClient, outboxId: string, errorMessage: string) {
  const { data: row } = await admin
    .from("whatsapp_message_outbox")
    .select("attempt_count, max_attempts")
    .eq("id", outboxId)
    .maybeSingle();

  const attempts = (row?.attempt_count ?? 0) + 1;
  const max = row?.max_attempts ?? 5;
  const finalStatus = attempts >= max ? "failed" : "pending";

  await admin
    .from("whatsapp_message_outbox")
    .update({
      status: finalStatus,
      attempt_count: attempts,
      last_error: errorMessage,
      claimed_at: null,
    })
    .eq("id", outboxId);
}
