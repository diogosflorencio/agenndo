-- Agenndo — Schema Supabase (estado alinhado às migrations em supabase/migrations)
-- Use no SQL Editor para bootstrap de projeto novo. Projetos existentes: preferir apenas migrations.

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== PERFIL / AUTH ==========
-- Contas de prestadores (donos do negócio) — vinculadas ao auth.users do Supabase
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'provider', -- 'provider' | 'admin'
  recommended_plan TEXT,
  recommended_price_display NUMERIC(10, 2),
  onboarding_inputs JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.profiles.recommended_plan IS 'Variante interna sugerida no cadastro: plano_1 | plano_2 | plano_3 | paid_20 | …';
COMMENT ON COLUMN public.profiles.recommended_price_display IS 'Valor exibido no onboarding (referência); cobrança efetiva conforme Stripe';
COMMENT ON COLUMN public.profiles.onboarding_inputs IS 'Snapshot: equipe, volume, ticket médio declarados';

-- Negócios (um perfil pode ter um negócio; no futuro pode ser mais de um)
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  segment TEXT,
  phone TEXT,
  city TEXT,
  primary_color TEXT DEFAULT '#13EC5B',
  logo_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free', -- 'free' | 'plano_1' | 'plano_2' | 'plano_3' | 'paid_20' | …
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  stripe_price_id TEXT,
  subscription_current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  billing_issue_deadline TIMESTAMPTZ,
  billing_legal_name TEXT,
  billing_document TEXT,
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_neighborhood TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_postal_code TEXT,
  billing_country TEXT NOT NULL DEFAULT 'BR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_key ON public.businesses(slug);

COMMENT ON COLUMN public.businesses.subscription_status IS 'Stripe subscription.status: trialing, active, past_due, canceled, unpaid, incomplete, incomplete_expired, paused';
COMMENT ON COLUMN public.businesses.trial_ends_at IS 'Fim do período de teste gratuito (antes de assinar Stripe).';
COMMENT ON COLUMN public.businesses.billing_issue_deadline IS 'Após past_due/unpaid: até quando o negócio mantém acesso antes de bloquear agendamentos públicos.';
COMMENT ON COLUMN public.businesses.billing_legal_name IS 'Nome completo (PF) ou razão social (PJ) para cobrança/NF.';
COMMENT ON COLUMN public.businesses.billing_document IS 'CPF ou CNPJ (apenas dígitos).';
COMMENT ON COLUMN public.businesses.billing_address_line1 IS 'Logradouro e número.';
COMMENT ON COLUMN public.businesses.billing_address_line2 IS 'Complemento (opcional).';
COMMENT ON COLUMN public.businesses.billing_neighborhood IS 'Bairro.';
COMMENT ON COLUMN public.businesses.billing_city IS 'Cidade.';
COMMENT ON COLUMN public.businesses.billing_state IS 'UF (2 letras).';
COMMENT ON COLUMN public.businesses.billing_postal_code IS 'CEP (apenas dígitos).';
COMMENT ON COLUMN public.businesses.billing_country IS 'Código ISO do país (ex.: BR).';

CREATE OR REPLACE FUNCTION public.set_business_trial_ends()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_set_trial_ends ON public.businesses;
CREATE TRIGGER businesses_set_trial_ends
  BEFORE INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_business_trial_ends();

-- ========== CLIENTES ==========
-- Clientes podem ter conta (auth) ou só existir como registro (agendamento só com nome)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- null = sem conta
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  total_appointments INT NOT NULL DEFAULT 0,
  total_spent_cents BIGINT NOT NULL DEFAULT 0,
  last_appointment_date DATE,
  no_shows INT NOT NULL DEFAULT 0,
  rating INT, -- 0 a 5
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clients_business_id ON public.clients(business_id);
CREATE INDEX IF NOT EXISTS clients_auth_user_id ON public.clients(auth_user_id);

-- ========== COLABORADORES ==========
CREATE TABLE IF NOT EXISTS public.collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  color TEXT DEFAULT '#3B82F6',
  avatar_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS collaborators_business_id ON public.collaborators(business_id);

-- ========== SERVIÇOS ==========
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  price_cents INT NOT NULL DEFAULT 0,
  emoji TEXT DEFAULT '✂️',
  image_url TEXT,
  description_public TEXT,
  variant_gallery JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS services_business_id ON public.services(business_id);

-- Serviços por colaborador (N:N)
CREATE TABLE IF NOT EXISTS public.collaborator_services (
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (collaborator_id, service_id)
);

-- ========== DISPONIBILIDADE ==========
-- Horários de funcionamento por dia da semana (0=Dom, 1=Seg, ..., 6=Sab).
-- Corresponde ao "Padrão semanal" e ao bloco "Horários por dia da semana" na UI.
CREATE TABLE IF NOT EXISTS public.availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time TIME,
  close_time TIME,
  closed BOOLEAN NOT NULL DEFAULT false,
  breaks JSONB NOT NULL DEFAULT '[]', -- [{ "start": "12:00", "end": "13:00" }, ...]
  UNIQUE(business_id, day_of_week)
);

-- Exceções por data: um dia, uma semana ou um mês específico.
-- Uma linha por data (yyyy-mm-dd) com horário diferente do padrão semanal.
-- "Um dia" = 1 linha; "Uma semana" = até 7 linhas; "Um mês" = até 31 linhas (ou use o botão "Aplicar a todo o mês").
CREATE TABLE IF NOT EXISTS public.availability_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  open_time TIME,
  close_time TIME,
  closed BOOLEAN NOT NULL DEFAULT false,
  breaks JSONB NOT NULL DEFAULT '[]',
  UNIQUE(business_id, date)
);

CREATE INDEX IF NOT EXISTS availability_overrides_business_date ON public.availability_overrides(business_id, date);

-- Para bancos que já tinham availability sem breaks:
ALTER TABLE public.availability ADD COLUMN IF NOT EXISTS breaks JSONB NOT NULL DEFAULT '[]';

-- Bloqueios de horário (feriados, folgas)
CREATE TABLE IF NOT EXISTS public.availability_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE, -- null = todos
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== AGENDAMENTOS ==========
CREATE TYPE appointment_status AS ENUM (
  'agendado', 'confirmado', 'compareceu', 'faltou', 'cancelado'
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL, -- null se agendamento sem conta
  client_name_snapshot TEXT, -- nome informado quando sem conta
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  price_cents INT NOT NULL DEFAULT 0,
  status appointment_status NOT NULL DEFAULT 'agendado',
  notes TEXT,
  service_variant_index SMALLINT,
  service_variant_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appointments_business_id ON public.appointments(business_id);
CREATE INDEX IF NOT EXISTS appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS appointments_date ON public.appointments(date);

-- ========== FINANCEIRO ==========
CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT,
  service_name TEXT,
  collaborator_name TEXT,
  date DATE NOT NULL,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS financial_records_business_id ON public.financial_records(business_id);
CREATE INDEX IF NOT EXISTS financial_records_client_id ON public.financial_records(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS financial_records_appointment_id_unique
  ON public.financial_records(appointment_id)
  WHERE appointment_id IS NOT NULL;

-- ========== NOTIFICAÇÕES / CONFIG ==========
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  reminder_email BOOLEAN NOT NULL DEFAULT true,
  reminder_whatsapp BOOLEAN NOT NULL DEFAULT false,
  min_advance_hours INT NOT NULL DEFAULT 0,
  booking_buffer_minutes INT NOT NULL DEFAULT 0,
  booking_max_future_days INT NOT NULL DEFAULT 30,
  public_booking_time_ui TEXT NOT NULL DEFAULT 'slider' CHECK (public_booking_time_ui IN ('slider', 'blocks')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== PERSONALIZAÇÃO ==========
CREATE TABLE IF NOT EXISTS public.personalization (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  banner_url TEXT,
  gallery_urls TEXT[],
  instagram_url TEXT,
  facebook_url TEXT,
  social_links JSONB NOT NULL DEFAULT '[]',
  whatsapp_number TEXT,
  tagline TEXT,
  about TEXT,
  public_theme TEXT NOT NULL DEFAULT 'dark',
  show_whatsapp_fab BOOLEAN NOT NULL DEFAULT true,
  address_line TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT personalization_public_theme_check CHECK (public_theme IN ('dark', 'light'))
);

-- ========== IMPERSONAÇÃO (suporte / co-admins) ==========
-- RLS do prestador usa effective_user_id(); clients_self continua com auth.uid().
CREATE TABLE IF NOT EXISTS public.user_impersonate_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.session_impersonation (
  real_uid uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  target_uid uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (real_uid)
);

CREATE INDEX IF NOT EXISTS session_impersonation_expires_idx ON public.session_impersonation (expires_at);

ALTER TABLE public.user_impersonate_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_impersonation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_impersonate_tokens_own" ON public.user_impersonate_tokens;
CREATE POLICY "user_impersonate_tokens_own" ON public.user_impersonate_tokens FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "session_impersonation_own" ON public.session_impersonation;
CREATE POLICY "session_impersonation_own" ON public.session_impersonation FOR ALL
  USING (real_uid = (SELECT auth.uid()))
  WITH CHECK (real_uid = (SELECT auth.uid()));

DROP POLICY IF EXISTS "session_impersonation_read_as_target" ON public.session_impersonation;
CREATE POLICY "session_impersonation_read_as_target"
  ON public.session_impersonation FOR SELECT
  TO authenticated
  USING (target_uid = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.effective_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT s.target_uid
      FROM public.session_impersonation s
      WHERE s.real_uid = (SELECT auth.uid())
        AND s.expires_at > now()
      LIMIT 1
    ),
    (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.effective_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.effective_user_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_effective_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.effective_user_id();
$$;

REVOKE ALL ON FUNCTION public.get_effective_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_effective_user_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.regenerate_impersonate_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
BEGIN
  v_hash := md5(random()::text || clock_timestamp()::text || random()::text || random()::text);
  INSERT INTO public.user_impersonate_tokens (user_id, token_hash, updated_at)
  VALUES ((SELECT auth.uid()), v_hash, now())
  ON CONFLICT (user_id) DO UPDATE
    SET token_hash = excluded.token_hash, updated_at = now();
  RETURN v_hash;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerate_impersonate_token() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_impersonate_token() TO authenticated;

CREATE OR REPLACE FUNCTION public.start_impersonation(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target uuid;
  v_hash text;
BEGIN
  v_hash := lower(trim(p_token_hash));
  IF v_hash !~ '^[0-9a-f]{32}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token_invalid');
  END IF;

  SELECT t.user_id INTO v_target
  FROM public.user_impersonate_tokens t
  WHERE t.token_hash = v_hash
  LIMIT 1;

  IF v_target IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token_invalid');
  END IF;

  IF v_target = (SELECT auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_impersonate_self');
  END IF;

  DELETE FROM public.session_impersonation WHERE real_uid = (SELECT auth.uid());
  INSERT INTO public.session_impersonation (real_uid, target_uid, expires_at)
  VALUES ((SELECT auth.uid()), v_target, now() + interval '8 hours');

  RETURN jsonb_build_object('ok', true, 'target_uid', v_target);
END;
$$;

REVOKE ALL ON FUNCTION public.start_impersonation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_impersonation(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.stop_impersonation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sub uuid;
BEGIN
  v_sub := auth.uid();
  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  DELETE FROM public.session_impersonation WHERE real_uid = v_sub;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.stop_impersonation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stop_impersonation() TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_impersonate_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT t.token_hash INTO v_hash
  FROM public.user_impersonate_tokens t
  WHERE t.user_id = (SELECT auth.uid())
  LIMIT 1;

  IF v_hash IS NOT NULL THEN
    RETURN v_hash;
  END IF;

  v_hash := md5(random()::text || clock_timestamp()::text || random()::text || random()::text);
  INSERT INTO public.user_impersonate_tokens (user_id, token_hash, updated_at)
  VALUES ((SELECT auth.uid()), v_hash, now());
  RETURN v_hash;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_impersonate_token() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_impersonate_token() TO authenticated;

-- ========== RLS (Row Level Security) ==========
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborator_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalization ENABLE ROW LEVEL SECURITY;

-- Políticas: prestador acessa só dados do negócio do perfil efetivo (impersonação → effective_user_id)
DROP POLICY IF EXISTS "profiles_own" ON public.profiles;
CREATE POLICY "profiles_own" ON public.profiles FOR ALL
  USING (id = public.effective_user_id())
  WITH CHECK (id = public.effective_user_id());

DROP POLICY IF EXISTS "businesses_own" ON public.businesses;
CREATE POLICY "businesses_own" ON public.businesses FOR ALL
  USING (profile_id = public.effective_user_id())
  WITH CHECK (profile_id = public.effective_user_id());

DROP POLICY IF EXISTS "clients_own" ON public.clients;
CREATE POLICY "clients_own" ON public.clients FOR ALL
  USING (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  )
  WITH CHECK (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  );

DROP POLICY IF EXISTS "collaborators_own" ON public.collaborators;
CREATE POLICY "collaborators_own" ON public.collaborators FOR ALL
  USING (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  )
  WITH CHECK (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  );

DROP POLICY IF EXISTS "services_own" ON public.services;
CREATE POLICY "services_own" ON public.services FOR ALL
  USING (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  )
  WITH CHECK (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  );

DROP POLICY IF EXISTS "collaborator_services_own" ON public.collaborator_services;
CREATE POLICY "collaborator_services_own" ON public.collaborator_services FOR ALL
  USING (
    collaborator_id IN (
      SELECT c.id FROM public.collaborators c
      WHERE c.business_id IN (
        SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id()
      )
    )
  )
  WITH CHECK (
    collaborator_id IN (
      SELECT c.id FROM public.collaborators c
      WHERE c.business_id IN (
        SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id()
      )
    )
  );
-- Página pública: quem faz cada serviço (anon)
DROP POLICY IF EXISTS "collaborator_services_public_read" ON public.collaborator_services;
CREATE POLICY "collaborator_services_public_read" ON public.collaborator_services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = collaborator_services.service_id AND s.active = true AND s.archived_at IS NULL
    )
  );
DROP POLICY IF EXISTS "availability_own" ON public.availability;
CREATE POLICY "availability_own" ON public.availability FOR ALL
  USING (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  )
  WITH CHECK (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  );

DROP POLICY IF EXISTS "availability_overrides_own" ON public.availability_overrides;
CREATE POLICY "availability_overrides_own" ON public.availability_overrides FOR ALL
  USING (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  )
  WITH CHECK (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  );

DROP POLICY IF EXISTS "availability_blocks_own" ON public.availability_blocks;
CREATE POLICY "availability_blocks_own" ON public.availability_blocks FOR ALL
  USING (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  )
  WITH CHECK (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  );

DROP POLICY IF EXISTS "appointments_own" ON public.appointments;
CREATE POLICY "appointments_own" ON public.appointments FOR ALL
  USING (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  )
  WITH CHECK (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  );

DROP POLICY IF EXISTS "financial_records_own" ON public.financial_records;
CREATE POLICY "financial_records_own" ON public.financial_records FOR ALL
  USING (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  )
  WITH CHECK (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  );

DROP POLICY IF EXISTS "notification_settings_own" ON public.notification_settings;
CREATE POLICY "notification_settings_own" ON public.notification_settings FOR ALL
  USING (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  )
  WITH CHECK (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  );

DROP POLICY IF EXISTS "personalization_own" ON public.personalization;
CREATE POLICY "personalization_own" ON public.personalization FOR ALL
  USING (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  )
  WITH CHECK (
    business_id IN (SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id())
  );
CREATE POLICY "personalization_public_read" ON public.personalization FOR SELECT USING (true);

-- Página pública: leitura de negócio por slug (anon)
CREATE POLICY "businesses_public_read" ON public.businesses FOR SELECT USING (true);
CREATE POLICY "services_public_read" ON public.services FOR SELECT USING (active = true AND archived_at IS NULL);
CREATE POLICY "collaborators_public_read" ON public.collaborators FOR SELECT USING (active = true);

-- Cliente com conta: leitura dos próprios dados e agendamentos
CREATE POLICY "clients_self" ON public.clients FOR ALL USING (auth_user_id = auth.uid());

CREATE POLICY "appointments_client_read" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    client_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = appointments.client_id AND c.auth_user_id = auth.uid()
    )
  );

-- ========== STORAGE (bucket business-assets) ==========
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "business_assets_public_read" ON storage.objects;
CREATE POLICY "business_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-assets');

DROP POLICY IF EXISTS "business_assets_insert" ON storage.objects;
CREATE POLICY "business_assets_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-assets'
    AND split_part(name, '/', 1) IN (
      SELECT b.id::text FROM public.businesses b WHERE b.profile_id = public.effective_user_id()
    )
  );

DROP POLICY IF EXISTS "business_assets_update" ON storage.objects;
CREATE POLICY "business_assets_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND split_part(name, '/', 1) IN (
      SELECT b.id::text FROM public.businesses b WHERE b.profile_id = public.effective_user_id()
    )
  );

DROP POLICY IF EXISTS "business_assets_delete" ON storage.objects;
CREATE POLICY "business_assets_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND split_part(name, '/', 1) IN (
      SELECT b.id::text FROM public.businesses b WHERE b.profile_id = public.effective_user_id()
    )
  );

-- Trigger updated_at (tabelas que têm coluna updated_at)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.collaborators FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.notification_settings FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.personalization FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ========== CRIAR PROFILE + TOKEN DE IMPERSONAÇÃO (Auth) ==========
-- No Supabase Dashboard: Authentication -> Triggers ou execute no SQL Editor.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    'provider'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_impersonate_tokens (user_id, token_hash, updated_at)
  VALUES (
    NEW.id,
    md5(random()::text || clock_timestamp()::text || random()::text || random()::text),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Só existe se o trigger ainda não foi criado (Supabase pode expor isso em Auth -> Triggers).
-- Se der erro "trigger already exists", pode dropar: DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
