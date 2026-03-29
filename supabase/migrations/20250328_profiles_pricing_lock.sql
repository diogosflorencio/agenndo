-- Perfil de precificação no onboarding (anti-burla entre contas + retorno em outro dispositivo)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recommended_plan TEXT,
  ADD COLUMN IF NOT EXISTS recommended_price_display NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS onboarding_inputs JSONB;

COMMENT ON COLUMN public.profiles.recommended_plan IS 'Variante interna: plano_1 | plano_2 | plano_3 (migrar de starter/growth/enterprise se necessário)';
COMMENT ON COLUMN public.profiles.recommended_price_display IS 'Valor exibido no onboarding (referência); cobrança efetiva conforme Stripe';
COMMENT ON COLUMN public.profiles.onboarding_inputs IS 'Snapshot: equipe, volume, ticket médio declarados';
