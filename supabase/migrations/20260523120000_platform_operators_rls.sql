-- Console interno YWP: operadores com leitura/gestão global via JWT + RLS (sem service role no browser).
-- Tabela propositalmente NÃO se chama admin_* - ver docs/ACCOUNTS.md e supabase/scripts/grant-platform-operator.sql

CREATE TABLE IF NOT EXISTS public.platform_operators (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.platform_operators IS
  'Operadores internos YWP com acesso global (RLS). INSERT só via SQL/migração/service role - nunca pelo app cliente.';

ALTER TABLE public.platform_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_operators FORCE ROW LEVEL SECURITY;

-- Sem INSERT/UPDATE/DELETE para authenticated/anon (append-only pelo operador no Dashboard SQL)
DROP POLICY IF EXISTS "platform_operators_self_read" ON public.platform_operators;
CREATE POLICY "platform_operators_self_read" ON public.platform_operators
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.platform_operators FROM anon;

CREATE OR REPLACE FUNCTION public.is_platform_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_operators o
    WHERE o.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_operator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_operator() TO authenticated;

COMMENT ON FUNCTION public.is_platform_operator IS
  'SECURITY: true se auth.uid() está em platform_operators. Fonte de verdade do console interno.';

DROP POLICY IF EXISTS "platform_operators_console_read" ON public.platform_operators;
CREATE POLICY "platform_operators_console_read" ON public.platform_operators
  FOR SELECT
  TO authenticated
  USING (public.is_platform_operator());

-- Impede auto-promoção em profiles (app não pode virar operador)
CREATE OR REPLACE FUNCTION public.tg_profiles_block_operator_self_promote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_kind = 'platform_admin' AND NOT public.is_platform_operator() THEN
    RAISE EXCEPTION 'account_kind platform_admin not allowed';
  END IF;
  IF NEW.role = 'admin' AND NOT public.is_platform_operator() THEN
    RAISE EXCEPTION 'role admin not allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_block_operator_self_promote ON public.profiles;
CREATE TRIGGER trg_profiles_block_operator_self_promote
  BEFORE INSERT OR UPDATE OF account_kind, role ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.tg_profiles_block_operator_self_promote();

-- Prioridade: operador de plataforma no recompute (sem depender de profiles.role editável)
CREATE OR REPLACE FUNCTION public.recompute_user_primary_kind(p_user_id uuid)
RETURNS public.user_account_kind
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind public.user_account_kind;
BEGIN
  IF EXISTS (SELECT 1 FROM public.platform_operators o WHERE o.user_id = p_user_id) THEN
    v_kind := 'platform_admin';
  ELSIF EXISTS (SELECT 1 FROM public.businesses b WHERE b.profile_id = p_user_id) THEN
    v_kind := 'business_owner';
  ELSIF EXISTS (
    SELECT 1 FROM public.collaborators c WHERE c.auth_user_id = p_user_id AND c.active = true
  ) THEN
    v_kind := 'business_staff';
  ELSIF EXISTS (
    SELECT 1 FROM public.clients cl WHERE cl.auth_user_id = p_user_id
  ) THEN
    v_kind := 'client';
  ELSE
    SELECT ua.primary_kind INTO v_kind FROM public.user_accounts ua WHERE ua.user_id = p_user_id;
    IF v_kind IS NULL THEN
      v_kind := 'business_owner';
    END IF;
  END IF;

  INSERT INTO public.user_accounts (user_id, primary_kind, updated_at)
  VALUES (p_user_id, v_kind, now())
  ON CONFLICT (user_id) DO UPDATE
    SET primary_kind = EXCLUDED.primary_kind, updated_at = now();

  UPDATE public.profiles
  SET account_kind = v_kind, updated_at = now()
  WHERE id = p_user_id;

  RETURN v_kind;
END;
$$;

-- Políticas de console: gestão global para operadores (OR com políticas existentes)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles',
    'businesses',
    'clients',
    'collaborators',
    'services',
    'collaborator_services',
    'availability',
    'availability_overrides',
    'availability_blocks',
    'appointments',
    'financial_records',
    'notification_settings',
    'personalization',
    'dashboard_notifications',
    'user_impersonate_tokens',
    'session_impersonation',
    'user_accounts',
    'user_account_memberships',
    'business_commission_settings',
    'commission_collaborator_defaults',
    'commission_service_rules',
    'appointment_commissions',
    'commission_payout_batches'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_console', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_platform_operator()) WITH CHECK (public.is_platform_operator())',
      t || '_console',
      t
    );
  END LOOP;
END;
$$;

-- Backfill: perfis legados role=admin → operadores (ajuste/remova linhas indesejadas no SQL Editor depois)
INSERT INTO public.platform_operators (user_id, note, created_at)
SELECT p.id, 'migrated from profiles.role=admin', now()
FROM public.profiles p
WHERE p.role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM public.platform_operators o WHERE o.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.platform_operators (user_id, note, created_at)
SELECT p.id, 'migrated from profiles.account_kind', now()
FROM public.profiles p
WHERE p.account_kind = 'platform_admin'
  AND NOT EXISTS (SELECT 1 FROM public.platform_operators o WHERE o.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT user_id FROM public.platform_operators LOOP
    PERFORM public.recompute_user_primary_kind(r.user_id);
  END LOOP;
END;
$$;
