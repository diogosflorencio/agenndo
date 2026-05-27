-- Mercado Pago (conta do prestador) + políticas de sinal / pagamento antecipado + pagamentos por agendamento.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS mp_user_id text,
  ADD COLUMN IF NOT EXISTS mp_access_token_enc text,
  ADD COLUMN IF NOT EXISTS mp_refresh_token_enc text,
  ADD COLUMN IF NOT EXISTS mp_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS mp_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS mp_token_hint text,
  ADD COLUMN IF NOT EXISTS payment_policy text NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS deposit_mode text NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS deposit_percent smallint,
  ADD COLUMN IF NOT EXISTS deposit_fixed_cents integer,
  ADD COLUMN IF NOT EXISTS payment_client_message text,
  ADD COLUMN IF NOT EXISTS mp_checkout_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.mp_user_id IS 'User id do vendedor no Mercado Pago (OAuth).';
COMMENT ON COLUMN public.businesses.mp_access_token_enc IS 'Access token OAuth criptografado (AES-GCM).';
COMMENT ON COLUMN public.businesses.payment_policy IS 'off | optional | required_deposit | required_full';
COMMENT ON COLUMN public.businesses.deposit_mode IS 'percent | fixed — usado com required_deposit';
COMMENT ON COLUMN public.businesses.mp_checkout_enabled IS 'Prestador ativou cobrança online (requer mp conectado para políticas obrigatórias).';

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_payment_policy_check;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_payment_policy_check
  CHECK (payment_policy IN ('off', 'optional', 'required_deposit', 'required_full'));

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_deposit_mode_check;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_deposit_mode_check
  CHECK (deposit_mode IN ('percent', 'fixed'));

CREATE TABLE IF NOT EXISTS public.appointment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments (id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'mercadopago' CHECK (provider = 'mercadopago'),
  provider_payment_id text,
  preference_id text,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  expected_amount_cents integer NOT NULL CHECK (expected_amount_cents > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'refunded', 'cancelled')),
  payment_kind text NOT NULL DEFAULT 'deposit'
    CHECK (payment_kind IN ('deposit', 'full')),
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS appointment_payments_mp_payment_uidx
  ON public.appointment_payments (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS appointment_payments_appointment_idx
  ON public.appointment_payments (appointment_id);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_due_cents integer,
  ADD COLUMN IF NOT EXISTS payment_collected_cents integer NOT NULL DEFAULT 0;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_payment_status_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_payment_status_check
  CHECK (
    payment_status IN ('none', 'optional', 'pending', 'partial', 'paid', 'waived')
  );

COMMENT ON COLUMN public.appointments.payment_status IS 'Cobrança online: none, optional (pode pagar), pending, partial (sinal), paid.';
COMMENT ON COLUMN public.appointments.payment_due_cents IS 'Valor exigido neste agendamento (sinal ou total), calculado no servidor.';

ALTER TABLE public.appointment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointment_payments_business_owner" ON public.appointment_payments;
CREATE POLICY "appointment_payments_business_owner" ON public.appointment_payments
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id()
    )
  );

REVOKE ALL ON TABLE public.appointment_payments FROM anon;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.appointment_payments
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at ();
