-- Campos extras de personalização + leitura pública (página do slug)
ALTER TABLE public.personalization ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE public.personalization ADD COLUMN IF NOT EXISTS about TEXT;
ALTER TABLE public.personalization ADD COLUMN IF NOT EXISTS public_theme TEXT NOT NULL DEFAULT 'dark';
ALTER TABLE public.personalization ADD COLUMN IF NOT EXISTS show_whatsapp_fab BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.personalization ADD COLUMN IF NOT EXISTS address_line TEXT;

ALTER TABLE public.personalization DROP CONSTRAINT IF EXISTS personalization_public_theme_check;
ALTER TABLE public.personalization ADD CONSTRAINT personalization_public_theme_check
  CHECK (public_theme IN ('dark', 'light'));

DROP POLICY IF EXISTS "personalization_public_read" ON public.personalization;
CREATE POLICY "personalization_public_read" ON public.personalization
  FOR SELECT USING (true);
