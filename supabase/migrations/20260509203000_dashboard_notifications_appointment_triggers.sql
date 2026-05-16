-- Insere linhas em dashboard_notifications quando há novo agendamento ou cancelamento.
-- SECURITY DEFINER + search_path: o dono do negócio vê via RLS na leitura; o trigger grava com privilégios elevados.

CREATE OR REPLACE FUNCTION public.tg_notify_dashboard_on_appointment_insert () RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public AS $$
DECLARE
  v_client text;

  v_service text;

  v_collab text;

  d text;

  t text;

  body text;
BEGIN
  SELECT
    c.name INTO v_client
  FROM
    public.clients c
  WHERE
    c.id = NEW.client_id;

  SELECT
    s.name INTO v_service
  FROM
    public.services s
  WHERE
    s.id = NEW.service_id;

  SELECT
    col.name INTO v_collab
  FROM
    public.collaborators col
  WHERE
    col.id = NEW.collaborator_id;

  d := to_char(NEW.date, 'DD/MM/YYYY');

  t := substring(NEW.time_start::text, 1, 5);

  body := COALESCE(NULLIF(trim(BOTH FROM v_client), ''), NULLIF(trim(BOTH FROM NEW.client_name_snapshot), ''), 'Cliente') || ' · ' || COALESCE(v_service, 'Serviço') || ' · ' || d || ' às ' || t;

  IF v_collab IS NOT NULL AND length(trim(BOTH FROM v_collab)) > 0 THEN
    body := body || ' · ' || v_collab;
  END IF;

  INSERT INTO
    public.dashboard_notifications (business_id, title, body, icon)
  VALUES
    (NEW.business_id, 'Novo agendamento', body, 'event_available');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_notify_dashboard_on_appointment_cancelled () RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public AS $$
DECLARE
  v_client text;

  v_service text;

  d text;

  t text;

  body text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status::text <> 'cancelado' THEN
    RETURN NEW;
  END IF;

  IF OLD.status::text = 'cancelado' THEN
    RETURN NEW;
  END IF;

  SELECT
    c.name INTO v_client
  FROM
    public.clients c
  WHERE
    c.id = NEW.client_id;

  SELECT
    s.name INTO v_service
  FROM
    public.services s
  WHERE
    s.id = NEW.service_id;

  d := to_char(NEW.date, 'DD/MM/YYYY');

  t := substring(NEW.time_start::text, 1, 5);

  body := COALESCE(NULLIF(trim(BOTH FROM v_client), ''), NULLIF(trim(BOTH FROM NEW.client_name_snapshot), ''), 'Cliente') || ' · ' || COALESCE(v_service, 'Serviço') || ' · ' || d || ' às ' || t || ' - cancelado';

  INSERT INTO
    public.dashboard_notifications (business_id, title, body, icon)
  VALUES
    (NEW.business_id, 'Agendamento cancelado', body, 'event_busy');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_dashboard_notify_insert ON public.appointments;

CREATE TRIGGER trg_appointments_dashboard_notify_insert
AFTER INSERT ON public.appointments FOR EACH ROW
EXECUTE PROCEDURE public.tg_notify_dashboard_on_appointment_insert ();

DROP TRIGGER IF EXISTS trg_appointments_dashboard_notify_cancel ON public.appointments;

CREATE TRIGGER trg_appointments_dashboard_notify_cancel
AFTER
UPDATE OF status ON public.appointments FOR EACH ROW
EXECUTE PROCEDURE public.tg_notify_dashboard_on_appointment_cancelled ();

COMMENT ON FUNCTION public.tg_notify_dashboard_on_appointment_insert () IS 'Grava dashboard_notifications ao criar agendamento (página pública ou painel).';

COMMENT ON FUNCTION public.tg_notify_dashboard_on_appointment_cancelled () IS 'Grava dashboard_notifications quando status passa a cancelado (cliente ou painel).';
