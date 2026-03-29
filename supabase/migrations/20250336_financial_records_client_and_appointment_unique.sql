-- Vínculo opcional ao cliente para somar total_spent_cents a partir dos lançamentos pagos.
ALTER TABLE public.financial_records
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS financial_records_client_id ON public.financial_records(client_id);

-- Um lançamento automático por agendamento (upsert ao marcar compareceu).
CREATE UNIQUE INDEX IF NOT EXISTS financial_records_appointment_id_unique
  ON public.financial_records(appointment_id)
  WHERE appointment_id IS NOT NULL;
