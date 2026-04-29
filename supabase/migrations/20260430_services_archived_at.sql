-- Arquivar serviço: oculta da listagem pública e do painel, sem apagar a linha.
-- Agendamentos antigos mantêm service_id válido (RESTRICT em appointments impediria DELETE).

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.services.archived_at IS 'Preenchido = serviço arquivado permanentemente na UI (linha mantida por FK em appointments).';

-- Leitura pública: só serviços ativos e não arquivados
DROP POLICY IF EXISTS "services_public_read" ON public.services;
CREATE POLICY "services_public_read" ON public.services FOR SELECT USING (
  active = true
  AND archived_at IS NULL
);

-- Vínculos públicos serviço ↔ colaborador: só se o serviço estiver visível na página pública
DROP POLICY IF EXISTS "collaborator_services_public_read" ON public.collaborator_services;
CREATE POLICY "collaborator_services_public_read" ON public.collaborator_services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.services s
      WHERE s.id = collaborator_services.service_id
        AND s.active = true
        AND s.archived_at IS NULL
    )
  );
