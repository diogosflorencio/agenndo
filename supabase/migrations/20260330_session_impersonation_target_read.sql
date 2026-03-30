-- Dono da conta (target) pode ver linhas em session_impersonation onde alguém
-- está com o painel aberto na conta dele (além de real_uid = auth.uid()).
DROP POLICY IF EXISTS "session_impersonation_read_as_target" ON public.session_impersonation;
CREATE POLICY "session_impersonation_read_as_target"
ON public.session_impersonation FOR SELECT
TO authenticated
USING (target_uid = (SELECT auth.uid()));
