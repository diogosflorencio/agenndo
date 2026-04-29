-- Descrição pública do serviço + galeria de variações (até 3 fotos com título/descrição opcionais, JSONB)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS description_public TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS variant_gallery JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Escolha do cliente ao agendar (índice na galeria de variações + rótulo congelado)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS service_variant_index SMALLINT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS service_variant_label TEXT;

COMMENT ON COLUMN public.services.description_public IS 'Texto opcional visível na página pública de agendamento.';
COMMENT ON COLUMN public.services.variant_gallery IS 'Array JSON: [{url, title?, description?}] até 3 itens — variações/opções do serviço.';
COMMENT ON COLUMN public.appointments.service_variant_index IS 'Índice (0-based) em variant_gallery quando o cliente escolhe uma opção; NULL se não aplicável.';
COMMENT ON COLUMN public.appointments.service_variant_label IS 'Título da opção no momento do agendamento (snapshot).';
