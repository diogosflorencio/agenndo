-- Regras de agendamento (buffer / janela) junto das notificações por negócio
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS booking_buffer_minutes INT NOT NULL DEFAULT 15;
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS booking_max_future_days INT NOT NULL DEFAULT 60;
