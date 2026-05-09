-- Centro de notificações do painel (in-app). Linhas inseridas por jobs/API no futuro; read_at marca como lida.

CREATE TABLE IF NOT EXISTS public.dashboard_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
  business_id UUID NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  icon TEXT NOT NULL DEFAULT 'notifications',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
);

CREATE INDEX IF NOT EXISTS dashboard_notifications_business_created_idx ON public.dashboard_notifications (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS dashboard_notifications_unread_idx ON public.dashboard_notifications (business_id)
WHERE
  read_at IS NULL;

ALTER TABLE public.dashboard_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_notifications_own" ON public.dashboard_notifications;

CREATE POLICY "dashboard_notifications_own" ON public.dashboard_notifications FOR ALL USING (
  business_id IN (
    SELECT
      b.id
    FROM
      public.businesses b
    WHERE
      b.profile_id = public.effective_user_id ()
  )
)
WITH CHECK (
  business_id IN (
    SELECT
      b.id
    FROM
      public.businesses b
    WHERE
      b.profile_id = public.effective_user_id ()
  )
);

COMMENT ON TABLE public.dashboard_notifications IS 'Notificações in-app do painel (contagem não lidas + última na home).';
