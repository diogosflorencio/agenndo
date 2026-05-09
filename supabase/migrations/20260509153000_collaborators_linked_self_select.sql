-- Profissional com conta vinculada em collaborators pode ler a própria linha (evita depender só de active=true na policy pública).

DROP POLICY IF EXISTS "collaborators_linked_account_read" ON public.collaborators;
CREATE POLICY "collaborators_linked_account_read" ON public.collaborators FOR SELECT TO authenticated USING (
  auth_user_id = auth.uid ()
);
