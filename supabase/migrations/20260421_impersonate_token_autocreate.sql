-- Token de impersonação desde a criação do utilizador (suporte vê em user_impersonate_tokens)
-- + RPC para garantir linha em contas antigas sem token.

-- Utilizadores existentes em auth.users sem linha em user_impersonate_tokens
INSERT INTO public.user_impersonate_tokens (user_id, token_hash, updated_at)
SELECT u.id,
  md5(random()::text || clock_timestamp()::text || random()::text || random()::text),
  now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_impersonate_tokens t WHERE t.user_id = u.id
);

CREATE OR REPLACE FUNCTION public.ensure_impersonate_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT t.token_hash INTO v_hash
  FROM public.user_impersonate_tokens t
  WHERE t.user_id = (SELECT auth.uid())
  LIMIT 1;

  IF v_hash IS NOT NULL THEN
    RETURN v_hash;
  END IF;

  v_hash := md5(random()::text || clock_timestamp()::text || random()::text || random()::text);
  INSERT INTO public.user_impersonate_tokens (user_id, token_hash, updated_at)
  VALUES ((SELECT auth.uid()), v_hash, now());
  RETURN v_hash;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_impersonate_token() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_impersonate_token() TO authenticated;

-- Novo signup: token já criado (não depende do utilizador clicar em "Gerar")
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
