-- Foto opcional do serviço (URL pública no bucket business-assets, path {business_id}/services/{id}.ext)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_url TEXT;
