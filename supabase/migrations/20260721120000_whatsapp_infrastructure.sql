-- Infraestrutura WhatsApp: configuracao, templates, sessoes e fila de envio (outbox).
-- Nao altera fluxos existentes; master_enabled permanece false por padrao.

CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  master_enabled BOOLEAN NOT NULL DEFAULT false,
  notify_owner_on_new_booking BOOLEAN NOT NULL DEFAULT true,
  notify_owner_on_cancellation BOOLEAN NOT NULL DEFAULT true,
  notify_owner_on_payment BOOLEAN NOT NULL DEFAULT true,
  notify_staff_on_new_booking BOOLEAN NOT NULL DEFAULT false,
  notify_staff_on_cancellation BOOLEAN NOT NULL DEFAULT false,
  default_country_code TEXT NOT NULL DEFAULT '55',
  owner_notification_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.whatsapp_settings IS 'Configuracao geral de WhatsApp por negocio.';
COMMENT ON COLUMN public.whatsapp_settings.master_enabled IS 'Liga envios automaticos quando gateway estiver ativo.';
COMMENT ON COLUMN public.whatsapp_settings.owner_notification_phone IS 'Telefone E.164 ou nacional do responsavel para alertas internos.';

CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  phone_e164 TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'connecting', 'connected', 'error')),
  provider TEXT NOT NULL DEFAULT 'baileys',
  last_connected_at TIMESTAMPTZ,
  last_error TEXT,
  session_version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT whatsapp_sessions_business_unique UNIQUE (business_id)
);

COMMENT ON TABLE public.whatsapp_sessions IS 'Sessao WhatsApp isolada por negocio (um numero por empresa).';

CREATE TABLE IF NOT EXISTS public.whatsapp_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  recipient_role TEXT NOT NULL
    CHECK (recipient_role IN ('client', 'owner', 'staff')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  body TEXT NOT NULL,
  schedule_kind TEXT NOT NULL DEFAULT 'immediate'
    CHECK (schedule_kind IN ('immediate', 'before_appointment', 'after_appointment')),
  schedule_offset_minutes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT whatsapp_message_templates_unique UNIQUE (business_id, event_key, recipient_role)
);

COMMENT ON TABLE public.whatsapp_message_templates IS 'Templates personalizaveis por evento e destinatario.';
COMMENT ON COLUMN public.whatsapp_message_templates.schedule_offset_minutes IS 'Negativo antes do horario, positivo depois; null se immediate.';

CREATE TABLE IF NOT EXISTS public.whatsapp_message_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  event_key TEXT NOT NULL,
  recipient_role TEXT NOT NULL
    CHECK (recipient_role IN ('client', 'owner', 'staff')),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'sent', 'failed', 'cancelled')),
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  last_error TEXT,
  provider_message_id TEXT,
  claimed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.whatsapp_message_outbox IS 'Fila de mensagens para processamento pelo gateway WhatsApp.';

CREATE INDEX IF NOT EXISTS whatsapp_message_outbox_pending_idx
  ON public.whatsapp_message_outbox (scheduled_for ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS whatsapp_message_outbox_business_idx
  ON public.whatsapp_message_outbox (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_message_templates_business_idx
  ON public.whatsapp_message_templates (business_id);

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_outbox FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_settings_owner ON public.whatsapp_settings;
CREATE POLICY whatsapp_settings_owner ON public.whatsapp_settings
  FOR ALL TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id()
    )
  );

DROP POLICY IF EXISTS whatsapp_sessions_owner ON public.whatsapp_sessions;
CREATE POLICY whatsapp_sessions_owner ON public.whatsapp_sessions
  FOR ALL TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id()
    )
  );

DROP POLICY IF EXISTS whatsapp_templates_owner ON public.whatsapp_message_templates;
CREATE POLICY whatsapp_templates_owner ON public.whatsapp_message_templates
  FOR ALL TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id()
    )
  );

DROP POLICY IF EXISTS whatsapp_outbox_owner ON public.whatsapp_message_outbox;
CREATE POLICY whatsapp_outbox_owner ON public.whatsapp_message_outbox
  FOR SELECT TO authenticated
  USING (
    business_id IN (
      SELECT b.id FROM public.businesses b WHERE b.profile_id = public.effective_user_id()
    )
  );

REVOKE ALL ON TABLE public.whatsapp_settings FROM anon;
REVOKE ALL ON TABLE public.whatsapp_sessions FROM anon;
REVOKE ALL ON TABLE public.whatsapp_message_templates FROM anon;
REVOKE ALL ON TABLE public.whatsapp_message_outbox FROM anon;

DROP TRIGGER IF EXISTS set_updated_at_whatsapp_settings ON public.whatsapp_settings;
CREATE TRIGGER set_updated_at_whatsapp_settings
  BEFORE UPDATE ON public.whatsapp_settings
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_whatsapp_sessions ON public.whatsapp_sessions;
CREATE TRIGGER set_updated_at_whatsapp_sessions
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_whatsapp_templates ON public.whatsapp_message_templates;
CREATE TRIGGER set_updated_at_whatsapp_templates
  BEFORE UPDATE ON public.whatsapp_message_templates
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE FUNCTION public.seed_whatsapp_defaults(p_business_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.whatsapp_settings (business_id)
  VALUES (p_business_id)
  ON CONFLICT (business_id) DO NOTHING;

  INSERT INTO public.whatsapp_sessions (business_id)
  VALUES (p_business_id)
  ON CONFLICT (business_id) DO NOTHING;

  INSERT INTO public.whatsapp_message_templates (business_id, event_key, recipient_role, enabled, body, schedule_kind, schedule_offset_minutes)
  VALUES
    (p_business_id, 'booking_created', 'client', false,
     'Ola {nome}! Seu agendamento foi registrado.' || E'\n' || 'Data: {data} as {hora}' || E'\n' || 'Servico: {servico} com {profissional}' || E'\n' || '{endereco}' || E'\n' || 'Link: {link}',
     'immediate', NULL),
    (p_business_id, 'booking_confirmed', 'client', true,
     'Ola {nome}! Seu agendamento foi confirmado.' || E'\n' || 'Data: {data} as {hora}' || E'\n' || 'Servico: {servico} com {profissional}' || E'\n' || '{endereco}' || E'\n' || 'Cancelar: {link_cancelamento}',
     'immediate', NULL),
    (p_business_id, 'booking_cancelled', 'client', true,
     'Ola {nome}. Seu agendamento de {servico} em {data} as {hora} foi cancelado.' || E'\n' || 'Para reagendar: {link_vitrine}',
     'immediate', NULL),
    (p_business_id, 'booking_rescheduled', 'client', false,
     'Ola {nome}! Seu agendamento foi reagendado.' || E'\n' || 'Nova data: {data} as {hora}' || E'\n' || 'Servico: {servico} com {profissional}',
     'immediate', NULL),
    (p_business_id, 'payment_pending', 'client', false,
     'Ola {nome}! Para confirmar seu horario ({data} as {hora}), conclua o pagamento de {valor_sinal}.' || E'\n' || 'Link: {link}',
     'immediate', NULL),
    (p_business_id, 'payment_confirmed', 'client', false,
     'Ola {nome}! Pagamento de {valor} confirmado.' || E'\n' || 'Agendamento: {data} as {hora} - {servico}',
     'immediate', NULL),
    (p_business_id, 'reminder_48h', 'client', false,
     'Ola {nome}! Lembrete: voce tem {servico} em dois dias ({data} as {hora}).',
     'before_appointment', -2880),
    (p_business_id, 'reminder_24h', 'client', true,
     'Ola {nome}! Lembrete: amanha voce tem {servico} as {hora} com {profissional}.',
     'before_appointment', -1440),
    (p_business_id, 'reminder_2h', 'client', false,
     'Ola {nome}! Daqui a 2 horas: {servico} as {hora}. Te esperamos!',
     'before_appointment', -120),
    (p_business_id, 'reminder_1h', 'client', false,
     'Ola {nome}! Em 1 hora: {servico} as {hora}. Ate ja!',
     'before_appointment', -60),
    (p_business_id, 'attendance_confirmation', 'client', false,
     'Ola {nome}! Confirma presenca para {data} as {hora}? Responda SIM ou acesse {link}.',
     'before_appointment', -720),
    (p_business_id, 'thank_you', 'client', false,
     'Ola {nome}! Obrigado pela visita. Esperamos voce em breve!',
     'after_appointment', 60),
    (p_business_id, 'review_request', 'client', true,
     'Ola {nome}! Como foi seu atendimento? Avalie em: {link}',
     'after_appointment', 1440),
    (p_business_id, 'reactivation', 'client', false,
     'Ola {nome}! Sentimos sua falta. Que tal agendar? {link_vitrine}',
     'immediate', NULL),
    (p_business_id, 'no_show_followup', 'client', false,
     'Ola {nome}. Notamos sua ausencia em {data}. Para reagendar: {link_vitrine}',
     'after_appointment', 120),
    (p_business_id, 'owner_new_booking', 'owner', true,
     'Novo agendamento: {nome} - {servico} em {data} as {hora} com {profissional}.',
     'immediate', NULL),
    (p_business_id, 'owner_booking_cancelled', 'owner', true,
     'Cancelamento: {nome} - {servico} em {data} as {hora}.',
     'immediate', NULL),
    (p_business_id, 'owner_payment_received', 'owner', false,
     'Pagamento recebido: {valor} de {nome} ({servico}, {data}).',
     'immediate', NULL),
    (p_business_id, 'owner_daily_summary', 'owner', false,
     'Resumo do dia: consulte sua agenda em {link}.',
     'immediate', NULL),
    (p_business_id, 'staff_new_booking', 'staff', false,
     'Novo cliente {nome}: {servico} em {data} as {hora}.',
     'immediate', NULL),
    (p_business_id, 'staff_booking_cancelled', 'staff', false,
     'Cancelado: {nome} - {servico} em {data} as {hora}.',
     'immediate', NULL),
    (p_business_id, 'staff_day_reminder', 'staff', false,
     'Hoje: {nome} - {servico} as {hora}.',
     'before_appointment', -480)
  ON CONFLICT (business_id, event_key, recipient_role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_whatsapp_defaults(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_whatsapp_defaults(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_whatsapp_defaults(UUID) TO service_role;
