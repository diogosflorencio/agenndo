-- Agenndo — Schema Supabase
-- Execute no SQL Editor do Supabase na ordem abaixo.

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  plan TEXT NOT NULL DEFAULT 'free', -- 'free' | 'starter' | 'growth' | 'enterprise'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_key ON public.businesses(slug);

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
  active BOOLEAN NOT NULL DEFAULT true,
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
  client_name TEXT,
  service_name TEXT,
  collaborator_name TEXT,
  date DATE NOT NULL,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS financial_records_business_id ON public.financial_records(business_id);

-- ========== NOTIFICAÇÕES / CONFIG ==========
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  reminder_email BOOLEAN NOT NULL DEFAULT true,
  reminder_whatsapp BOOLEAN NOT NULL DEFAULT false,
  min_advance_hours INT NOT NULL DEFAULT 2,
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
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- Políticas: prestador acessa só dados do seu negócio
CREATE POLICY "profiles_own" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "businesses_own" ON public.businesses FOR ALL USING (
  profile_id IN (SELECT id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "clients_own" ON public.clients FOR ALL USING (
  business_id IN (SELECT id FROM public.businesses WHERE profile_id = auth.uid())
);
CREATE POLICY "collaborators_own" ON public.collaborators FOR ALL USING (
  business_id IN (SELECT id FROM public.businesses WHERE profile_id = auth.uid())
);
CREATE POLICY "services_own" ON public.services FOR ALL USING (
  business_id IN (SELECT id FROM public.businesses WHERE profile_id = auth.uid())
);
CREATE POLICY "collaborator_services_own" ON public.collaborator_services FOR ALL USING (
  collaborator_id IN (SELECT id FROM public.collaborators WHERE business_id IN (SELECT id FROM public.businesses WHERE profile_id = auth.uid()))
);
CREATE POLICY "availability_own" ON public.availability FOR ALL USING (
  business_id IN (SELECT id FROM public.businesses WHERE profile_id = auth.uid())
);
CREATE POLICY "availability_overrides_own" ON public.availability_overrides FOR ALL USING (
  business_id IN (SELECT id FROM public.businesses WHERE profile_id = auth.uid())
);
CREATE POLICY "availability_blocks_own" ON public.availability_blocks FOR ALL USING (
  business_id IN (SELECT id FROM public.businesses WHERE profile_id = auth.uid())
);
CREATE POLICY "appointments_own" ON public.appointments FOR ALL USING (
  business_id IN (SELECT id FROM public.businesses WHERE profile_id = auth.uid())
);
CREATE POLICY "financial_records_own" ON public.financial_records FOR ALL USING (
  business_id IN (SELECT id FROM public.businesses WHERE profile_id = auth.uid())
);
CREATE POLICY "notification_settings_own" ON public.notification_settings FOR ALL USING (
  business_id IN (SELECT id FROM public.businesses WHERE profile_id = auth.uid())
);
CREATE POLICY "personalization_own" ON public.personalization FOR ALL USING (
  business_id IN (SELECT id FROM public.businesses WHERE profile_id = auth.uid())
);

-- Página pública: leitura de negócio por slug (anon)
CREATE POLICY "businesses_public_read" ON public.businesses FOR SELECT USING (true);
CREATE POLICY "services_public_read" ON public.services FOR SELECT USING (active = true);
CREATE POLICY "collaborators_public_read" ON public.collaborators FOR SELECT USING (active = true);

-- Cliente com conta: leitura dos próprios dados e agendamentos
CREATE POLICY "clients_self" ON public.clients FOR ALL USING (auth_user_id = auth.uid());

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

-- ========== CRIAR PROFILE AO CRIAR USUÁRIO (Auth) ==========
-- No Supabase Dashboard: Authentication -> Triggers ou execute no SQL Editor.
-- Cria linha em public.profiles quando um novo auth.users é inserido (ex.: login com Google).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Só existe se o trigger ainda não foi criado (Supabase pode expor isso em Auth -> Triggers).
-- Se der erro "trigger already exists", pode dropar: DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

