-- Defesa em profundidade: preços não negativos no catálogo e agendamentos.

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_price_cents_non_negative;
ALTER TABLE public.services
  ADD CONSTRAINT services_price_cents_non_negative CHECK (price_cents >= 0);

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_price_cents_non_negative;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_price_cents_non_negative CHECK (price_cents >= 0);

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_payment_due_cents_non_negative;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_payment_due_cents_non_negative
  CHECK (payment_due_cents IS NULL OR payment_due_cents >= 0);

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_payment_collected_cents_non_negative;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_payment_collected_cents_non_negative
  CHECK (payment_collected_cents >= 0);
