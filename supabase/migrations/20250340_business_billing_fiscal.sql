-- Dados fiscais para nota/declaração: CPF ou CNPJ + endereço (Brasil).
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS billing_legal_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_document TEXT,
  ADD COLUMN IF NOT EXISTS billing_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS billing_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS billing_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS billing_city TEXT,
  ADD COLUMN IF NOT EXISTS billing_state TEXT,
  ADD COLUMN IF NOT EXISTS billing_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS billing_country TEXT NOT NULL DEFAULT 'BR';

COMMENT ON COLUMN public.businesses.billing_legal_name IS 'Nome completo (PF) ou razão social (PJ) para cobrança/NF.';
COMMENT ON COLUMN public.businesses.billing_document IS 'CPF ou CNPJ (apenas dígitos).';
COMMENT ON COLUMN public.businesses.billing_address_line1 IS 'Logradouro e número.';
COMMENT ON COLUMN public.businesses.billing_address_line2 IS 'Complemento (opcional).';
COMMENT ON COLUMN public.businesses.billing_neighborhood IS 'Bairro.';
COMMENT ON COLUMN public.businesses.billing_city IS 'Cidade.';
COMMENT ON COLUMN public.businesses.billing_state IS 'UF (2 letras).';
COMMENT ON COLUMN public.businesses.billing_postal_code IS 'CEP (apenas dígitos).';
COMMENT ON COLUMN public.businesses.billing_country IS 'Código ISO do país (ex.: BR).';
