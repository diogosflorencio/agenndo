-- Reverte leitura do negócio do empregador: vínculo de equipe não dá acesso ao businesses do dono.

DROP POLICY IF EXISTS "businesses_staff_linked_read" ON public.businesses;
