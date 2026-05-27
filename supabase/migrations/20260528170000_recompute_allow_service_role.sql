-- Permite recompute em triggers / service role (ex.: insert de client na vitrine via API).
-- Mantém restrição quando há sessão JWT: só o próprio usuário ou operador da plataforma.

CREATE OR REPLACE FUNCTION public.recompute_user_primary_kind(p_user_id uuid)
RETURNS public.user_account_kind
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind public.user_account_kind;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NOT NULL AND p_user_id IS DISTINCT FROM v_caller AND NOT public.is_platform_operator() THEN
    RAISE EXCEPTION 'forbidden: recompute_user_primary_kind';
  END IF;

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
    v_kind := 'business_owner';
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

REVOKE ALL ON FUNCTION public.recompute_user_primary_kind(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_user_primary_kind(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_user_primary_kind(uuid) TO service_role;
