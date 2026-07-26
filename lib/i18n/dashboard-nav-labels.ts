import type { Locale } from "@/lib/i18n/types";
import { translate } from "@/lib/i18n/translate";

/** Mapeia href do dashboard → chave i18n (nav traduzida no client). */
export const DASHBOARD_NAV_I18N_KEY: Record<string, string> = {
  "/dashboard": "dashboard.nav.home",
  "/dashboard/agendamentos": "dashboard.nav.appointments",
  "/dashboard/disponibilidade": "dashboard.nav.availability",
  "/dashboard/servicos": "dashboard.nav.services",
  "/dashboard/colaboradores": "dashboard.nav.team",
  "/dashboard/analytics": "dashboard.nav.analytics",
  "/dashboard/financeiro": "dashboard.nav.finance",
  "/dashboard/clientes": "dashboard.nav.clients",
  "/dashboard/negocio": "dashboard.nav.business",
  "/dashboard/pagamentos": "dashboard.nav.payments",
  "/dashboard/whatsapp": "dashboard.nav.whatsapp",
  "/dashboard/personalizacao": "dashboard.nav.branding",
  "/dashboard/conta": "dashboard.nav.account",
  "/dashboard/minhas-comissoes": "dashboard.nav.commissions",
};

const GROUP_I18N_KEY: Record<string, string> = {
  agenda: "dashboard.nav.groupAgenda",
  cadastros: "dashboard.nav.groupCatalog",
  dados: "dashboard.nav.groupData",
  config: "dashboard.nav.groupConfig",
};

export function dashboardNavLabel(locale: Locale, href: string, fallback: string): string {
  const key = DASHBOARD_NAV_I18N_KEY[href];
  return key ? translate(locale, key) : fallback;
}

export function dashboardGroupLabel(locale: Locale, key: string, fallback: string): string {
  const i18nKey = GROUP_I18N_KEY[key];
  return i18nKey ? translate(locale, i18nKey) : fallback;
}
