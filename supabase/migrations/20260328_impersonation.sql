-- Impersonação de conta (suporte / co-admins): sessão em session_impersonation + token em user_impersonate_tokens.
-- RLS usa effective_user_id() em vez de auth.uid() para dados do prestador (não afeta clients_self).

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

-- Resolve o user_id efetivo para RLS (prestador): alvo da sessão ou o próprio auth.uid().
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

-- ========== Substituir políticas RLS (prestador) ==========
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

-- Storage: mesmo critério do dono efetivo
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
