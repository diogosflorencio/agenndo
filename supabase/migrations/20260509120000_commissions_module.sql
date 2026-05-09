-- Módulo opcional de comissões por atendente (snapshot por agendamento compareceu).

ALTER TABLE public.collaborators
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS collaborators_auth_user_id_idx ON public.collaborators (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

COMMENT ON COLUMN public.collaborators.auth_user_id IS 'Conta Supabase vinculada: acesso a Minhas comissões (RLS).';

-- Taxas futuras (ex.: Mercado Pago) — base líquida = price_cents - processor_fee_cents
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS processor_fee_cents BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.appointments.processor_fee_cents IS 'Taxas de gateway etc.; usado na base líquida da comissão quando calculation_base=net.';

-- ========== CONFIGURAÇÃO POR NEGÓCIO ==========
CREATE TABLE IF NOT EXISTS public.business_commission_settings (
  business_id UUID PRIMARY KEY REFERENCES public.businesses (id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  default_percent NUMERIC(8, 4) NOT NULL DEFAULT 0 CHECK (default_percent >= 0 AND default_percent <= 100),
  calculation_base TEXT NOT NULL DEFAULT 'gross' CHECK (calculation_base IN ('gross', 'net')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.business_commission_settings IS 'Módulo global: desligado = fluxo atual sem comissões.';
COMMENT ON COLUMN public.business_commission_settings.calculation_base IS 'gross = sobre price_cents; net = sobre price_cents - processor_fee_cents.';

-- Override por colaborador (prevalece sobre default do negócio; perde para regra serviço+colaborador)
CREATE TABLE IF NOT EXISTS public.commission_collaborator_defaults (
  collaborator_id UUID PRIMARY KEY REFERENCES public.collaborators (id) ON DELETE CASCADE,
  percent NUMERIC(8, 4) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Regras finas: (serviço + colaborador) > só colaborador > só serviço > default negócio
CREATE TABLE IF NOT EXISTS public.commission_service_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services (id) ON DELETE CASCADE,
  collaborator_id UUID REFERENCES public.collaborators (id) ON DELETE CASCADE,
  percent NUMERIC(8, 4) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
);

CREATE UNIQUE INDEX IF NOT EXISTS commission_service_rules_unique_pair
  ON public.commission_service_rules (business_id, service_id, collaborator_id)
  WHERE collaborator_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS commission_service_rules_unique_service_only
  ON public.commission_service_rules (business_id, service_id)
  WHERE collaborator_id IS NULL;

CREATE INDEX IF NOT EXISTS commission_service_rules_business_idx ON public.commission_service_rules (business_id);

-- ========== SNAPSHOT POR ATENDIMENTO ==========
CREATE TABLE IF NOT EXISTS public.commission_payout_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  total_cents BIGINT NOT NULL CHECK (total_cents >= 0),
  notes TEXT,
  approved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
);

CREATE INDEX IF NOT EXISTS commission_payout_batches_business_idx ON public.commission_payout_batches (business_id);

DO $$ BEGIN
  CREATE TYPE public.commission_row_status AS ENUM ('pending', 'approved', 'paid', 'void');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.appointment_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments (id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators (id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.services (id) ON DELETE RESTRICT,
  appointment_price_cents BIGINT NOT NULL,
  processor_fee_cents_snapshot BIGINT NOT NULL DEFAULT 0,
  calculation_base TEXT NOT NULL CHECK (calculation_base IN ('gross', 'net')),
  base_amount_cents BIGINT NOT NULL,
  percent_applied NUMERIC(10, 6) NOT NULL,
  amount_cents BIGINT NOT NULL,
  rule_source TEXT NOT NULL CHECK (
    rule_source IN ('service_collaborator', 'collaborator_default', 'service_default', 'business_default')
  ),
  status public.commission_row_status NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  payout_batch_id UUID REFERENCES public.commission_payout_batches (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
  CONSTRAINT appointment_commissions_appointment_unique UNIQUE (appointment_id)
);

CREATE INDEX IF NOT EXISTS appointment_commissions_business_date_idx
  ON public.appointment_commissions (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS appointment_commissions_collaborator_idx ON public.appointment_commissions (collaborator_id);

CREATE INDEX IF NOT EXISTS appointment_commissions_status_idx ON public.appointment_commissions (business_id, status);

ALTER TABLE public.business_commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_collaborator_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_service_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payout_batches ENABLE ROW LEVEL SECURITY;

-- Dono do negócio (effective_user_id)
DROP POLICY IF EXISTS "business_commission_settings_own" ON public.business_commission_settings;
CREATE POLICY "business_commission_settings_own" ON public.business_commission_settings FOR ALL USING (
  business_id IN (
    SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id ()
  )
)
WITH CHECK (
  business_id IN (
    SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id ()
  )
);

DROP POLICY IF EXISTS "commission_collaborator_defaults_own" ON public.commission_collaborator_defaults;
CREATE POLICY "commission_collaborator_defaults_own" ON public.commission_collaborator_defaults FOR ALL USING (
  collaborator_id IN (
    SELECT c.id
    FROM public.collaborators c
    WHERE c.business_id IN (
      SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id ()
    )
  )
)
WITH CHECK (
  collaborator_id IN (
    SELECT c.id
    FROM public.collaborators c
    WHERE c.business_id IN (
      SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id ()
    )
  )
);

DROP POLICY IF EXISTS "commission_service_rules_own" ON public.commission_service_rules;
CREATE POLICY "commission_service_rules_own" ON public.commission_service_rules FOR ALL USING (
  business_id IN (
    SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id ()
  )
)
WITH CHECK (
  business_id IN (
    SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id ()
  )
);

DROP POLICY IF EXISTS "appointment_commissions_own" ON public.appointment_commissions;
CREATE POLICY "appointment_commissions_own" ON public.appointment_commissions FOR ALL USING (
  business_id IN (
    SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id ()
  )
)
WITH CHECK (
  business_id IN (
    SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id ()
  )
);

-- Colaborador vinculado: só leitura das próprias linhas
DROP POLICY IF EXISTS "appointment_commissions_collaborator_read" ON public.appointment_commissions;
CREATE POLICY "appointment_commissions_collaborator_read" ON public.appointment_commissions FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.collaborators c
      WHERE c.id = appointment_commissions.collaborator_id
        AND c.auth_user_id = (
          SELECT auth.uid ()
        )
    )
  );

DROP POLICY IF EXISTS "commission_payout_batches_own" ON public.commission_payout_batches;
CREATE POLICY "commission_payout_batches_own" ON public.commission_payout_batches FOR ALL USING (
  business_id IN (
    SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id ()
  )
)
WITH CHECK (
  business_id IN (
    SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id ()
  )
);

CREATE TRIGGER set_updated_at BEFORE
UPDATE ON public.business_commission_settings FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at ();

CREATE TRIGGER set_updated_at BEFORE
UPDATE ON public.commission_collaborator_defaults FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at ();

CREATE TRIGGER set_updated_at BEFORE
UPDATE ON public.commission_service_rules FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at ();

CREATE TRIGGER set_updated_at BEFORE
UPDATE ON public.appointment_commissions FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at ();
