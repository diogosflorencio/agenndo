-- Links de redes sociais estruturados (plataforma + identificador definido pelo usuário).
-- instagram_url / facebook_url permanecem na tabela para compatibilidade; o app prefere social_links.

ALTER TABLE public.personalization ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.personalization.social_links IS 'JSON [{ "platform": "instagram"|..., "handle": "..." }] — URLs derivadas no front.';
