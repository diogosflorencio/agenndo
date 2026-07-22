-- Ultimo login explicito (operacoes) e seed WhatsApp ao criar negocio.

ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_accounts.last_login_at IS
  'Ultimo login OAuth registrado via touch_user_account_on_login.';

UPDATE public.user_accounts
SET last_login_at = updated_at
WHERE last_login_at IS NULL AND updated_at IS NOT NULL;

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

  INSERT INTO public.user_accounts (user_id, primary_kind, signup_channel, last_login_channel, last_login_at)
  VALUES (v_uid, 'business_owner', v_channel, v_channel, now())
  ON CONFLICT (user_id) DO UPDATE
    SET
      last_login_channel = EXCLUDED.last_login_channel,
      last_login_at = now(),
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

CREATE OR REPLACE FUNCTION public.tg_business_seed_whatsapp_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_whatsapp_defaults(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_seed_whatsapp ON public.businesses;
CREATE TRIGGER trg_business_seed_whatsapp
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE PROCEDURE public.tg_business_seed_whatsapp_defaults();

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.businesses LOOP
    PERFORM public.seed_whatsapp_defaults(r.id);
  END LOOP;
END;
$$;
