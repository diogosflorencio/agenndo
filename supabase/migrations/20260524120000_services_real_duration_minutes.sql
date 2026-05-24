-- Tempo real de ocupação da agenda (opcional). NULL = usar duration_minutes (duração total).
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS real_duration_minutes INT NULL;

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_real_duration_minutes_check;

ALTER TABLE public.services
  ADD CONSTRAINT services_real_duration_minutes_check
  CHECK (
    real_duration_minutes IS NULL
    OR (
      real_duration_minutes >= 1
      AND real_duration_minutes <= duration_minutes
    )
  );

COMMENT ON COLUMN public.services.duration_minutes IS
  'Duração total do serviço (tempo que o cliente permanece no estabelecimento).';

COMMENT ON COLUMN public.services.real_duration_minutes IS
  'Tempo bloqueado na agenda do profissional. NULL = igual à duração total.';
