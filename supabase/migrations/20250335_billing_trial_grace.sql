-- Trial inicial (7 dias) e prazo de regularização após falha de pagamento (5 dias)

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_issue_deadline TIMESTAMPTZ;

COMMENT ON COLUMN public.businesses.trial_ends_at IS 'Fim do período de teste gratuito (antes de assinar Stripe).';
COMMENT ON COLUMN public.businesses.billing_issue_deadline IS 'Após past_due/unpaid: até quando o negócio mantém acesso antes de bloquear agendamentos públicos.';

UPDATE public.businesses
SET trial_ends_at = created_at + INTERVAL '7 days'
WHERE trial_ends_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_business_trial_ends()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_set_trial_ends ON public.businesses;
CREATE TRIGGER businesses_set_trial_ends
  BEFORE INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_business_trial_ends();
