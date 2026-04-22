-- Permite à página pública (anon) ler vínculos serviço ↔ colaborador para filtrar a equipe no agendamento.
-- Sem isto, o nested select devolve collaborator_services = [] e o front assume "todos os profissionais".

DROP POLICY IF EXISTS "collaborator_services_public_read" ON public.collaborator_services;
CREATE POLICY "collaborator_services_public_read" ON public.collaborator_services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.services s
      WHERE s.id = collaborator_services.service_id
        AND s.active = true
    )
  );
