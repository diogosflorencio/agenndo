-- SECURITY (Agenndo): endurecimento RLS após revisão de segurança.
-- Auth: Supabase Auth (auth.uid() = UUID do utilizador). Impersonação: effective_user_id().
-- Página pública: catálogo via API servidor (service role), não listagem anon em tabelas de negócio.
-- Não altera colunas de URL/imagem, slugs, nem políticas do bucket business-assets.

-- ========== Função: slug disponível (setup, sem expor linhas de outros negócios) ==========
CREATE OR REPLACE FUNCTION public.is_business_slug_available(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.slug = lower(trim(p_slug))
      AND length(trim(p_slug)) > 0
  );
$$;

REVOKE ALL ON FUNCTION public.is_business_slug_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_business_slug_available(text) TO authenticated;

COMMENT ON FUNCTION public.is_business_slug_available IS
  'SECURITY: verifica slug livre sem SELECT público em businesses.';

-- ========== ENABLE + FORCE RLS (service_role ignora; anon/authenticated não bypassam) ==========
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators FORCE ROW LEVEL SECURITY;
ALTER TABLE public.services FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collaborator_services FORCE ROW LEVEL SECURITY;
ALTER TABLE public.availability FORCE ROW LEVEL SECURITY;
ALTER TABLE public.availability_overrides FORCE ROW LEVEL SECURITY;
ALTER TABLE public.availability_blocks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.personalization FORCE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_impersonate_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.session_impersonation FORCE ROW LEVEL SECURITY;

ALTER TABLE public.business_commission_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.commission_collaborator_defaults FORCE ROW LEVEL SECURITY;
ALTER TABLE public.commission_service_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_commissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payout_batches FORCE ROW LEVEL SECURITY;

-- ========== Remover políticas públicas permissivas (vazamento multi-tenant / billing) ==========
DROP POLICY IF EXISTS "businesses_public_read" ON public.businesses;
DROP POLICY IF EXISTS "services_public_read" ON public.services;
DROP POLICY IF EXISTS "collaborators_public_read" ON public.collaborators;
DROP POLICY IF EXISTS "collaborator_services_public_read" ON public.collaborator_services;
DROP POLICY IF EXISTS "personalization_public_read" ON public.personalization;

-- ========== Perfis: INSERT só pelo próprio auth.uid() (oauth-bridge / signup) ==========
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- ========== Clientes com conta: só SELECT/UPDATE nos próprios registos ==========
DROP POLICY IF EXISTS "clients_self" ON public.clients;
CREATE POLICY "clients_self_select" ON public.clients
  FOR SELECT
  TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

CREATE POLICY "clients_self_update" ON public.clients
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = (SELECT auth.uid()))
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

-- ========== Revogar acesso direto anon às tabelas sensíveis (PostgREST) ==========
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.businesses FROM anon;
REVOKE ALL ON TABLE public.clients FROM anon;
REVOKE ALL ON TABLE public.collaborators FROM anon;
REVOKE ALL ON TABLE public.services FROM anon;
REVOKE ALL ON TABLE public.collaborator_services FROM anon;
REVOKE ALL ON TABLE public.availability FROM anon;
REVOKE ALL ON TABLE public.availability_overrides FROM anon;
REVOKE ALL ON TABLE public.availability_blocks FROM anon;
REVOKE ALL ON TABLE public.appointments FROM anon;
REVOKE ALL ON TABLE public.financial_records FROM anon;
REVOKE ALL ON TABLE public.notification_settings FROM anon;
REVOKE ALL ON TABLE public.personalization FROM anon;
REVOKE ALL ON TABLE public.dashboard_notifications FROM anon;
REVOKE ALL ON TABLE public.user_impersonate_tokens FROM anon;
REVOKE ALL ON TABLE public.session_impersonation FROM anon;
REVOKE ALL ON TABLE public.business_commission_settings FROM anon;
REVOKE ALL ON TABLE public.commission_collaborator_defaults FROM anon;
REVOKE ALL ON TABLE public.commission_service_rules FROM anon;
REVOKE ALL ON TABLE public.appointment_commissions FROM anon;
REVOKE ALL ON TABLE public.commission_payout_batches FROM anon;

-- Imagens públicas continuam no Storage (bucket business-assets, políticas existentes).
