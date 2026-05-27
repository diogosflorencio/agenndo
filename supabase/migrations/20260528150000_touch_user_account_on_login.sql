-- Atualiza user_accounts após login OAuth (cliente não tinha política INSERT/UPDATE → 403 no upsert).

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

  PERFORM public.recompute_user_primary_kind(v_uid);
END;
$$;

REVOKE ALL ON FUNCTION public.touch_user_account_on_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_user_account_on_login(text) TO authenticated;
