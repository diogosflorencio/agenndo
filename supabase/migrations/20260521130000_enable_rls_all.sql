-- SECURITY: garante ENABLE + FORCE RLS (FORCE sozinho não ativa RLS se estiver desligado).

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborator_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_impersonate_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_impersonation ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_collaborator_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_service_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payout_batches ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.businesses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators FORCE ROW LEVEL SECURITY;
ALTER TABLE public.services FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collaborator_services FORCE ROW LEVEL SECURITY;
ALTER TABLE public.availability FORCE ROW LEVEL SECURITY;
ALTER TABLE public.availability_overrides FORCE ROW LEVEL SECURITY;
ALTER TABLE public.availability_blocks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.personalization FORCE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_impersonate_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.session_impersonation FORCE ROW LEVEL SECURITY;

ALTER TABLE public.business_commission_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.commission_collaborator_defaults FORCE ROW LEVEL SECURITY;
ALTER TABLE public.commission_service_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_commissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payout_batches FORCE ROW LEVEL SECURITY;
