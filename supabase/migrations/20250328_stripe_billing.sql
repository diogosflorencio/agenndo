-- Stripe / assinatura (execute no SQL Editor do Supabase após deploy)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

COMMENT ON COLUMN public.businesses.subscription_status IS 'Stripe subscription.status: trialing, active, past_due, canceled, unpaid, incomplete, incomplete_expired, paused';
