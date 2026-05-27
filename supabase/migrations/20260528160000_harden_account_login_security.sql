-- SECURITY: login OAuth não pode definir primary_kind nem canal admin; recompute só para si (ou operador).

CREATE OR REPLACE FUNCTION public.touch_user_account_on_login(p_channel text DEFAULT 'owner')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_channel text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Canais aceitos no cliente: nunca 'admin' (operador vem de platform_operators + recompute).
  v_channel := CASE lower(trim(COALESCE(p_channel, '')))
    WHEN 'client' THEN 'client'
    WHEN 'staff' THEN 'staff'
    WHEN 'owner' THEN 'owner'
    WHEN 'unknown' THEN 'unknown'
    ELSE 'owner'
  END;

  INSERT INTO public.user_accounts (user_id, primary_kind, signup_channel, last_login_channel)
  VALUES (v_uid, 'business_owner', v_channel, v_channel)
  ON CONFLICT (user_id) DO UPDATE
    SET
      last_login_channel = EXCLUDED.last_login_channel,
      signup_channel = CASE
        WHEN public.user_accounts.signup_channel = 'unknown' AND EXCLUDED.signup_channel <> 'unknown'
          THEN EXCLUDED.signup_channel
        ELSE public.user_accounts.signup_channel
      END,
      updated_at = now();

  -- primary_kind só via recompute (memberships / platform_operators).
  PERFORM public.recompute_user_primary_kind(v_uid);
END;
$$;

REVOKE ALL ON FUNCTION public.touch_user_account_on_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_user_account_on_login(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.recompute_user_primary_kind(p_user_id uuid)
RETURNS public.user_account_kind
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind public.user_account_kind;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_platform_operator() THEN
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
