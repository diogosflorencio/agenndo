-- Cliente autenticado vê os próprios agendamentos (vinculados por clients.auth_user_id)
DROP POLICY IF EXISTS "appointments_client_read" ON public.appointments;
CREATE POLICY "appointments_client_read" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    client_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = appointments.client_id AND c.auth_user_id = auth.uid()
    )
  );
