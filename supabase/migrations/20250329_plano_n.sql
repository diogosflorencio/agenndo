-- Renomeia valores legados de plano no banco → plano_1 | plano_2 | plano_3
UPDATE public.businesses SET plan = 'plano_1' WHERE plan = 'starter';
UPDATE public.businesses SET plan = 'plano_2' WHERE plan = 'growth';
UPDATE public.businesses SET plan = 'plano_3' WHERE plan = 'enterprise';

UPDATE public.profiles SET recommended_plan = 'plano_1' WHERE recommended_plan = 'starter';
UPDATE public.profiles SET recommended_plan = 'plano_2' WHERE recommended_plan = 'growth';
UPDATE public.profiles SET recommended_plan = 'plano_3' WHERE recommended_plan = 'enterprise';

COMMENT ON COLUMN public.profiles.recommended_plan IS 'Variante interna sugerida no cadastro: plano_1 | plano_2 | plano_3';
