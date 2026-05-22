-- Tipos de conta e vínculos: dono do negócio, funcionário (colaborador), cliente.
-- SECURITY: fonte de verdade para login e RLS auxiliar; não substitui vínculos em businesses/collaborators/clients.

DO $$ BEGIN
  CREATE TYPE public.user_account_kind AS ENUM (
    'platform_admin',
    'business_owner',
    'business_staff',
    'client'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.user_account_kind IS
  'Papel principal da conta Supabase Auth: dono, funcionário, cliente ou admin da plataforma.';

-- ========== Conta global (1:1 com auth.users) ==========
CREATE TABLE IF NOT EXISTS public.user_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  primary_kind public.user_account_kind NOT NULL DEFAULT 'business_owner',
  signup_channel TEXT NOT NULL DEFAULT 'owner'
    CHECK (signup_channel IN ('owner', 'staff', 'client', 'admin', 'unknown')),
  last_login_channel TEXT
    CHECK (last_login_channel IS NULL OR last_login_channel IN ('owner', 'staff', 'client', 'admin', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_accounts IS
  'Metadados de tipo de conta por utilizador Auth; memberships detalham vínculos por negócio.';

CREATE INDEX IF NOT EXISTS user_accounts_primary_kind_idx ON public.user_accounts (primary_kind);

-- ========== Vínculos por negócio (N por utilizador) ==========
CREATE TABLE IF NOT EXISTS public.user_account_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind public.user_account_kind NOT NULL
    CHECK (kind IN ('business_owner', 'business_staff', 'client')),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  collaborator_id UUID REFERENCES public.collaborators (id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_account_memberships_ref_check CHECK (
    (kind = 'business_owner' AND collaborator_id IS NULL AND client_id IS NULL)
    OR (kind = 'business_staff' AND collaborator_id IS NOT NULL AND client_id IS NULL)
    OR (kind = 'client' AND client_id IS NOT NULL AND collaborator_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS user_account_memberships_user_kind_business_key
  ON public.user_account_memberships (user_id, kind, business_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_account_memberships_staff_collaborator_key
  ON public.user_account_memberships (collaborator_id)
  WHERE collaborator_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_account_memberships_client_row_key
  ON public.user_account_memberships (client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_account_memberships_user_idx ON public.user_account_memberships (user_id);
CREATE INDEX IF NOT EXISTS user_account_memberships_business_idx ON public.user_account_memberships (business_id);

-- ========== profiles.account_kind (substitui role TEXT aos poucos) ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_kind public.user_account_kind;

UPDATE public.profiles
SET
  account_kind = CASE
    WHEN role = 'admin' THEN 'platform_admin'::public.user_account_kind
    ELSE 'business_owner'::public.user_account_kind
  END
WHERE account_kind IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN account_kind SET DEFAULT 'business_owner';

UPDATE public.profiles SET account_kind = 'business_owner' WHERE account_kind IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN account_kind SET NOT NULL;

COMMENT ON COLUMN public.profiles.account_kind IS
  'Espelho do tipo principal; user_accounts é a fonte de verdade no signup. role legado mantido por compatibilidade.';

-- ========== Funções auxiliares ==========
CREATE OR REPLACE FUNCTION public.infer_signup_channel_from_metadata(meta jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(COALESCE(meta ->> 'signup_channel', meta ->> 'signup_context', '')))
    WHEN 'cliente' THEN 'client'
    WHEN 'client' THEN 'client'
    WHEN 'staff' THEN 'staff'
    WHEN 'colaborador' THEN 'staff'
    WHEN 'owner' THEN 'owner'
    WHEN 'admin' THEN 'admin'
    ELSE 'unknown'
  END;
$$;

CREATE OR REPLACE FUNCTION public.channel_to_account_kind(p_channel text)
RETURNS public.user_account_kind
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_channel
    WHEN 'client' THEN 'client'::public.user_account_kind
    WHEN 'staff' THEN 'business_staff'::public.user_account_kind
    WHEN 'admin' THEN 'platform_admin'::public.user_account_kind
    ELSE 'business_owner'::public.user_account_kind
  END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_user_primary_kind(p_user_id uuid)
RETURNS public.user_account_kind
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind public.user_account_kind;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user_id AND p.account_kind = 'platform_admin') THEN
    v_kind := 'platform_admin';
  ELSIF EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.profile_id = p_user_id
  ) THEN
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
  PERFORM public.recompute_user_primary_kind(p_user_id);
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
  PERFORM public.recompute_user_primary_kind(v_user);
END;
$$;

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
  PERFORM public.recompute_user_primary_kind(v_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.auth_user_primary_kind()
RETURNS public.user_account_kind
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ua.primary_kind FROM public.user_accounts ua WHERE ua.user_id = auth.uid()),
    (SELECT p.account_kind FROM public.profiles p WHERE p.id = auth.uid()),
    'business_owner'::public.user_account_kind
  );
$$;

REVOKE ALL ON FUNCTION public.recompute_user_primary_kind(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_user_primary_kind(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.auth_user_primary_kind() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_primary_kind() TO authenticated;

CREATE OR REPLACE FUNCTION public.auth_user_is_business_owner(p_business_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_account_memberships m
    WHERE m.user_id = auth.uid()
      AND m.kind = 'business_owner'
      AND (p_business_id IS NULL OR m.business_id = p_business_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.profile_id = public.effective_user_id()
      AND (p_business_id IS NULL OR b.id = p_business_id)
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_is_business_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_is_business_owner(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.auth_user_is_business_staff(p_business_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_account_memberships m
    WHERE m.user_id = auth.uid()
      AND m.kind = 'business_staff'
      AND (p_business_id IS NULL OR m.business_id = p_business_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.collaborators c
    WHERE c.auth_user_id = auth.uid()
      AND c.active = true
      AND (p_business_id IS NULL OR c.business_id = p_business_id)
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_is_business_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_is_business_staff(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.auth_user_is_client(p_business_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_account_memberships m
    WHERE m.user_id = auth.uid()
      AND m.kind = 'client'
      AND (p_business_id IS NULL OR m.business_id = p_business_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.clients cl
    WHERE cl.auth_user_id = auth.uid()
      AND (p_business_id IS NULL OR cl.business_id = p_business_id)
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_is_client(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_is_client(uuid) TO authenticated;

-- ========== Triggers de sincronização ==========
CREATE OR REPLACE FUNCTION public.tg_businesses_upsert_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.upsert_owner_membership(NEW.id, NEW.profile_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_businesses_owner_membership ON public.businesses;
CREATE TRIGGER trg_businesses_owner_membership
  AFTER INSERT OR UPDATE OF profile_id ON public.businesses
  FOR EACH ROW
  EXECUTE PROCEDURE public.tg_businesses_upsert_owner_membership();

CREATE OR REPLACE FUNCTION public.tg_collaborators_upsert_staff_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.auth_user_id IS NOT NULL AND OLD.auth_user_id IS DISTINCT FROM NEW.auth_user_id THEN
    DELETE FROM public.user_account_memberships
    WHERE kind = 'business_staff' AND collaborator_id = OLD.id;
    PERFORM public.recompute_user_primary_kind(OLD.auth_user_id);
  END IF;
  IF NEW.auth_user_id IS NOT NULL THEN
    PERFORM public.upsert_staff_membership(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_collaborators_staff_membership ON public.collaborators;
CREATE TRIGGER trg_collaborators_staff_membership
  AFTER INSERT OR UPDATE OF auth_user_id ON public.collaborators
  FOR EACH ROW
  EXECUTE PROCEDURE public.tg_collaborators_upsert_staff_membership();

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
    PERFORM public.recompute_user_primary_kind(OLD.auth_user_id);
  END IF;
  IF NEW.auth_user_id IS NOT NULL THEN
    PERFORM public.upsert_client_membership(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_client_membership ON public.clients;
CREATE TRIGGER trg_clients_client_membership
  AFTER INSERT OR UPDATE OF auth_user_id ON public.clients
  FOR EACH ROW
  EXECUTE PROCEDURE public.tg_clients_upsert_client_membership();

-- ========== handle_new_user: canal de signup ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel text;
  v_kind public.user_account_kind;
BEGIN
  v_channel := public.infer_signup_channel_from_metadata(NEW.raw_user_meta_data);
  v_kind := public.channel_to_account_kind(v_channel);

  INSERT INTO public.user_accounts (user_id, primary_kind, signup_channel)
  VALUES (NEW.id, v_kind, v_channel)
  ON CONFLICT (user_id) DO UPDATE
    SET
      signup_channel = COALESCE(
        NULLIF(EXCLUDED.signup_channel, 'unknown'),
        public.user_accounts.signup_channel
      ),
      updated_at = now();

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, account_kind)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    CASE WHEN v_kind = 'platform_admin' THEN 'admin' ELSE 'provider' END,
    v_kind
  )
  ON CONFLICT (id) DO UPDATE
    SET
      email = COALESCE(EXCLUDED.email, public.profiles.email),
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
      account_kind = COALESCE(public.profiles.account_kind, EXCLUDED.account_kind),
      updated_at = now();

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

-- ========== Backfill vínculos existentes ==========
INSERT INTO public.user_accounts (user_id, primary_kind, signup_channel)
SELECT
  u.id,
  'business_owner'::public.user_account_kind,
  'unknown'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_accounts ua WHERE ua.user_id = u.id);

INSERT INTO public.user_account_memberships (user_id, kind, business_id)
SELECT b.profile_id, 'business_owner', b.id
FROM public.businesses b
ON CONFLICT (user_id, kind, business_id) DO NOTHING;

INSERT INTO public.user_account_memberships (user_id, kind, business_id, collaborator_id)
SELECT c.auth_user_id, 'business_staff', c.business_id, c.id
FROM public.collaborators c
WHERE c.auth_user_id IS NOT NULL
ON CONFLICT (user_id, kind, business_id) DO UPDATE
  SET collaborator_id = EXCLUDED.collaborator_id;

INSERT INTO public.user_account_memberships (user_id, kind, business_id, client_id)
SELECT cl.auth_user_id, 'client', cl.business_id, cl.id
FROM public.clients cl
WHERE cl.auth_user_id IS NOT NULL
ON CONFLICT (user_id, kind, business_id) DO UPDATE
  SET client_id = EXCLUDED.client_id;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM auth.users LOOP
    PERFORM public.recompute_user_primary_kind(r.id);
  END LOOP;
END;
$$;

-- ========== RLS ==========
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_account_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_account_memberships FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_accounts_self" ON public.user_accounts;
CREATE POLICY "user_accounts_self" ON public.user_accounts
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_account_memberships_self" ON public.user_account_memberships;
CREATE POLICY "user_account_memberships_self" ON public.user_account_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.user_accounts FROM anon;
REVOKE ALL ON TABLE public.user_account_memberships FROM anon;

CREATE TRIGGER set_updated_at BEFORE
UPDATE ON public.user_accounts FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at ();
