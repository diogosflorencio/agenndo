export type WhatsAppRecipientRole = "client" | "owner" | "staff";

export type WhatsAppSessionStatus = "disconnected" | "connecting" | "connected" | "error";

export type WhatsAppScheduleKind = "immediate" | "before_appointment" | "after_appointment";

export type WhatsAppOutboxStatus = "pending" | "claimed" | "sent" | "failed" | "cancelled";

export type WhatsAppProviderKind = "mock" | "noop" | "gateway";

export type WhatsAppUiMode = "dev" | "coming_soon" | "live";

export type WhatsAppEventKey =
  | "booking_created"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_rescheduled"
  | "payment_pending"
  | "payment_confirmed"
  | "reminder_48h"
  | "reminder_24h"
  | "reminder_2h"
  | "reminder_1h"
  | "attendance_confirmation"
  | "thank_you"
  | "review_request"
  | "reactivation"
  | "no_show_followup"
  | "owner_new_booking"
  | "owner_booking_cancelled"
  | "owner_payment_received"
  | "owner_daily_summary"
  | "staff_new_booking"
  | "staff_booking_cancelled"
  | "staff_day_reminder";

export type WhatsAppSettingsRow = {
  business_id: string;
  master_enabled: boolean;
  notify_owner_on_new_booking: boolean;
  notify_owner_on_cancellation: boolean;
  notify_owner_on_payment: boolean;
  notify_staff_on_new_booking: boolean;
  notify_staff_on_cancellation: boolean;
  default_country_code: string;
  owner_notification_phone: string | null;
  created_at: string;
  updated_at: string;
};

export type WhatsAppSessionRow = {
  id: string;
  business_id: string;
  phone_e164: string | null;
  status: WhatsAppSessionStatus;
  provider: string;
  last_connected_at: string | null;
  last_error: string | null;
  session_version: number;
  created_at: string;
  updated_at: string;
};

export type WhatsAppTemplateRow = {
  id: string;
  business_id: string;
  event_key: WhatsAppEventKey;
  recipient_role: WhatsAppRecipientRole;
  enabled: boolean;
  body: string;
  schedule_kind: WhatsAppScheduleKind;
  schedule_offset_minutes: number | null;
  created_at: string;
  updated_at: string;
};

export type WhatsAppOutboxRow = {
  id: string;
  business_id: string;
  appointment_id: string | null;
  client_id: string | null;
  event_key: WhatsAppEventKey;
  recipient_role: WhatsAppRecipientRole;
  recipient_phone: string;
  recipient_name: string | null;
  body: string;
  scheduled_for: string;
  status: WhatsAppOutboxStatus;
  attempt_count: number;
  max_attempts: number;
  last_error: string | null;
  provider_message_id: string | null;
  claimed_at: string | null;
  sent_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type WhatsAppTemplateContext = Record<string, string>;

export type EnqueueWhatsAppInput = {
  businessId: string;
  eventKey: WhatsAppEventKey;
  recipientRole: WhatsAppRecipientRole;
  recipientPhone: string;
  recipientName?: string | null;
  body: string;
  appointmentId?: string | null;
  clientId?: string | null;
  scheduledFor?: Date;
  metadata?: Record<string, unknown>;
};

export type SendWhatsAppMessageInput = {
  businessId: string;
  toPhone: string;
  body: string;
  outboxId?: string;
};

export type SendWhatsAppMessageResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

export type WhatsAppSessionInfo = {
  businessId: string;
  status: WhatsAppSessionStatus;
  phoneE164: string | null;
  lastConnectedAt: string | null;
  lastError: string | null;
};
