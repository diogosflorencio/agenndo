-- stop_impersonation como SECURITY INVOKER: com DEFINER, auth.uid() pode não refletir o JWT da
-- requisição e o DELETE não removia session_impersonation → banner "Voltar à minha conta" não funcionava.

CREATE OR REPLACE FUNCTION public.stop_impersonation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sub uuid;
BEGIN
  v_sub := auth.uid();
  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  DELETE FROM public.session_impersonation WHERE real_uid = v_sub;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.stop_impersonation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stop_impersonation() TO authenticated;
