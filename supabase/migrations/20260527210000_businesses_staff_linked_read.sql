-- Funcionário vinculado em collaborators pode ler o negócio do empregador (painel / comissões).

DROP POLICY IF EXISTS "businesses_staff_linked_read" ON public.businesses;
CREATE POLICY "businesses_staff_linked_read" ON public.businesses
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT c.business_id
      FROM public.collaborators c
      WHERE c.auth_user_id = (SELECT auth.uid())
    )
  );
