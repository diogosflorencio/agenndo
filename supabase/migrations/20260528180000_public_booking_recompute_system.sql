-- Recompute interno (triggers, service role) — sem exigir auth.uid().
-- A versão pública recompute_user_primary_kind continua restrita a JWT do próprio usuário.

CREATE OR REPLACE FUNCTION public.recompute_user_primary_kind_system(p_user_id uuid)
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

REVOKE ALL ON FUNCTION public.recompute_user_primary_kind_system(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_user_primary_kind_system(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_client_membership(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_biz uuid;
BEGIN
  SELECT cl.auth_user_id, cl.business_id INTO v_user, v_biz
  FROM public.clients cl
  WHERE cl.id = p_client_id AND cl.auth_user_id IS NOT NULL;
  IF v_user IS NULL OR v_biz IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.user_account_memberships (user_id, kind, business_id, client_id)
  VALUES (v_user, 'client', v_biz, p_client_id)
  ON CONFLICT (user_id, kind, business_id) DO UPDATE
    SET client_id = EXCLUDED.client_id;
  PERFORM public.recompute_user_primary_kind_system(v_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_staff_membership(p_collaborator_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_biz uuid;
BEGIN
  SELECT c.auth_user_id, c.business_id INTO v_user, v_biz
  FROM public.collaborators c
  WHERE c.id = p_collaborator_id AND c.auth_user_id IS NOT NULL;
  IF v_user IS NULL OR v_biz IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.user_account_memberships (user_id, kind, business_id, collaborator_id)
  VALUES (v_user, 'business_staff', v_biz, p_collaborator_id)
  ON CONFLICT (user_id, kind, business_id) DO UPDATE
    SET collaborator_id = EXCLUDED.collaborator_id;
  PERFORM public.recompute_user_primary_kind_system(v_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_owner_membership(p_business_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_account_memberships (user_id, kind, business_id)
  VALUES (p_user_id, 'business_owner', p_business_id)
  ON CONFLICT (user_id, kind, business_id) DO NOTHING;
  PERFORM public.recompute_user_primary_kind_system(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_clients_upsert_client_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.auth_user_id IS NOT NULL AND OLD.auth_user_id IS DISTINCT FROM NEW.auth_user_id THEN
    DELETE FROM public.user_account_memberships
    WHERE kind = 'client' AND client_id = OLD.id;
    PERFORM public.recompute_user_primary_kind_system(OLD.auth_user_id);
  END IF;
  IF NEW.auth_user_id IS NOT NULL THEN
    PERFORM public.upsert_client_membership(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
