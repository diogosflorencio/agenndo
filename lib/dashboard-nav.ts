export type DashboardMobileNavItem =
  | { type: "link"; href: string; icon: string; label: string; exact?: boolean }
  | {
      type: "group";
      key: "agenda" | "cadastros" | "dados" | "config";
      icon: string;
      label: string;
      items: { href: string; icon: string; label: string }[];
    };

const MENU_AGENDA = [
  { href: "/dashboard/agendamentos", icon: "calendar_month", label: "Agendamentos" },
  { href: "/dashboard/disponibilidade", icon: "schedule", label: "Disponibilidade" },
];
const MENU_CADASTROS = [
  { href: "/dashboard/servicos", icon: "category", label: "Serviços" },
  { href: "/dashboard/colaboradores", icon: "groups", label: "Equipe" },
];
const MENU_DADOS = [
  { href: "/dashboard/analytics", icon: "analytics", label: "Analytics" },
  { href: "/dashboard/financeiro", icon: "payments", label: "Financeiro" },
  { href: "/dashboard/clientes", icon: "person_search", label: "Clientes" },
];
const MENU_CONFIG = [
  { href: "/dashboard/negocio", icon: "store", label: "Dados do negócio" },
  { href: "/dashboard/pagamentos", icon: "account_balance_wallet", label: "Receber pagamentos" },
  { href: "/dashboard/whatsapp", icon: "chat", label: "WhatsApp" },
  { href: "/dashboard/personalizacao", icon: "palette", label: "Personalização" },
];

export const MOBILE_NAV_BASE: DashboardMobileNavItem[] = [
  { type: "link", href: "/dashboard", icon: "grid_view", label: "Início", exact: true },
  { type: "group", key: "agenda", icon: "calendar_month", label: "Agenda", items: MENU_AGENDA },
  { type: "group", key: "cadastros", icon: "folder", label: "Cadastros", items: MENU_CADASTROS },
  { type: "group", key: "dados", icon: "bar_chart", label: "Dados", items: MENU_DADOS },
  { type: "group", key: "config", icon: "tune", label: "Config", items: MENU_CONFIG },
  { type: "link", href: "/dashboard/conta", icon: "manage_accounts", label: "Conta" },
];

export const MOBILE_NAV_STAFF_ONLY: DashboardMobileNavItem[] = [
  { type: "link", href: "/dashboard/minhas-comissoes", icon: "savings", label: "Comissões", exact: false },
];

const COMISSOES_LINK: DashboardMobileNavItem = {
  type: "link",
  href: "/dashboard/minhas-comissoes",
  icon: "savings",
  label: "Comissões",
};

/** Montado no servidor para evitar divergência de hidratação no menu mobile. */
export function buildMobileNavItems(
  isStaffDashboard: boolean,
  hasStaffMembership: boolean
): DashboardMobileNavItem[] {
  if (isStaffDashboard) return MOBILE_NAV_STAFF_ONLY;
  if (!hasStaffMembership) return MOBILE_NAV_BASE;
  return [MOBILE_NAV_BASE[0]!, COMISSOES_LINK, ...MOBILE_NAV_BASE.slice(1)];
}
