-- Trial inicial: 30 dias (novos negócios)

CREATE OR REPLACE FUNCTION public.set_business_trial_ends()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_set_trial_ends ON public.businesses;
CREATE TRIGGER businesses_set_trial_ends
  BEFORE INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_business_trial_ends();

COMMENT ON COLUMN public.businesses.trial_ends_at IS 'Fim do período de teste gratuito (30 dias para novos negócios).';
