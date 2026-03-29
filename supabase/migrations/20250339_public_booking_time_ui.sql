-- Como o cliente escolhe o horário no link público: linha do tempo (slider) ou grade de botões.
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS public_booking_time_ui TEXT NOT NULL DEFAULT 'slider';

ALTER TABLE public.notification_settings DROP CONSTRAINT IF EXISTS notification_settings_public_booking_time_ui_check;
ALTER TABLE public.notification_settings ADD CONSTRAINT notification_settings_public_booking_time_ui_check
  CHECK (public_booking_time_ui IN ('slider', 'blocks'));
