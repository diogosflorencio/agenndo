-- Pix manual na página pública (chave + mensagem opcional; sem gateway de pagamento)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS public_pix_key text,
  ADD COLUMN IF NOT EXISTS public_pix_suggest_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_pix_suggest_message text;

COMMENT ON COLUMN public.businesses.public_pix_key IS 'Chave Pix informada pelo prestador. Exposta na página pública apenas quando public_pix_suggest_enabled.';
COMMENT ON COLUMN public.businesses.public_pix_suggest_enabled IS 'Quando true e houver chave, mostra bloco de orientação Pix na confirmação do agendamento público.';
COMMENT ON COLUMN public.businesses.public_pix_suggest_message IS 'Mensagem personalizada ao cliente; null usa texto padrão da aplicação.';
