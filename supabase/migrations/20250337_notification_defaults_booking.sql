-- Defaults mais permissivos para novos negócios: sem folga obrigatória, sem aviso prévio, 30 dias de horizonte.
ALTER TABLE public.notification_settings
  ALTER COLUMN booking_buffer_minutes SET DEFAULT 0;
ALTER TABLE public.notification_settings
  ALTER COLUMN min_advance_hours SET DEFAULT 0;
ALTER TABLE public.notification_settings
  ALTER COLUMN booking_max_future_days SET DEFAULT 30;
