"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { hasFullServiceAccess } from "@/lib/billing-access";
import type { UserInfo } from "@/lib/dashboard-context";
import type { BusinessRow } from "@/lib/dashboard-context";
import type { ProfileRow } from "@/lib/dashboard-context";
import { WhatsAppSupportWidget } from "@/components/whatsapp-support-widget";
import { stopImpersonation } from "@/lib/auth/impersonation-client";
import { useAppAlert } from "@/components/app-alert-provider";
const MENU_AGENDA = [
  { href: "/dashboard/agendamentos", icon: "calendar_month", label: "Agendamentos" },
  { href: "/dashboard/disponibilidade", icon: "schedule", label: "Disponibilidade" },
];
const MENU_CADASTROS = [
  { href: "/dashboard/servicos", icon: "content_cut", label: "Serviços" },
  { href: "/dashboard/colaboradores", icon: "groups", label: "Equipe" },
];
const MENU_DADOS = [
  { href: "/dashboard/analytics", icon: "analytics", label: "Analytics" },
  { href: "/dashboard/financeiro", icon: "payments", label: "Financeiro" },
  { href: "/dashboard/clientes", icon: "person_search", label: "Clientes" },
];
const MENU_CONFIG = [
  { href: "/dashboard/negocio", icon: "store", label: "Dados do negócio" },
  { href: "/dashboard/personalizacao", icon: "palette", label: "Personalização" },
  { href: "/dashboard/notificacoes", icon: "notifications", label: "Notificações" },
];
const DIRECT_LINKS = [{ href: "/dashboard/conta", icon: "manage_accounts", label: "Conta" }];

type GroupKey = "agenda" | "cadastros" | "dados" | "config";

type MobileNavItem =
  | { type: "link"; href: string; icon: string; label: string; exact?: boolean }
  | { type: "group"; key: "agenda" | "cadastros" | "dados" | "config"; icon: string; label: string; items: { href: string; icon: string; label: string }[] };
const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { type: "link", href: "/dashboard", icon: "grid_view", label: "Início", exact: true },
  { type: "group", key: "agenda", icon: "calendar_month", label: "Agenda", items: MENU_AGENDA },
  { type: "group", key: "cadastros", icon: "folder", label: "Cadastros", items: MENU_CADASTROS },
  { type: "group", key: "dados", icon: "bar_chart", label: "Dados", items: MENU_DADOS },
  { type: "group", key: "config", icon: "tune", label: "Config", items: MENU_CONFIG },
  { type: "link", href: "/dashboard/conta", icon: "manage_accounts", label: "Conta" },
];

const MOBILE_GROUP_TITLE: Record<GroupKey, string> = {
  agenda: "Agenda",
  cadastros: "Cadastros",
  dados: "Dados",
  config: "Configurações",
};

function NavItem({
  href,
  icon,
  label,
  active,
  onClick,
  indent,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  onClick?: () => void;
  indent?: boolean;
}) {
  const isLight = useTheme().theme === "light";
  const base = `flex items-center gap-2 py-2.5 text-sm font-medium transition-colors rounded-lg ${indent ? "pl-11 pr-3" : "px-3"}`;
  const activeClass = active ? "bg-primary/10 text-primary" : isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/10 hover:text-white";
  return (
    <Link href={href} onClick={onClick} className={`${base} ${activeClass}`}>
      <span className={`material-symbols-outlined text-[18px] shrink-0 ${active ? "filled" : ""}`}>{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { showAlert } = useAppAlert();
  const { business, user, profile } = useDashboard();
  const [impersonationExitLoading, setImpersonationExitLoading] = useState(false);
  /** Apenas um grupo aberto por vez; Início e Conta fecham todos. */
  const [openSidebarGroup, setOpenSidebarGroup] = useState<GroupKey | null>(null);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState<"agenda" | "cadastros" | "dados" | "config" | null>(null);

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  useEffect(() => {
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/conta")) {
      setOpenSidebarGroup(null);
      setMobileExpandedGroup(null);
    }
  }, [pathname]);

  const isLight = theme === "light";
  const bgMain = isLight ? "bg-gray-50" : "bg-[#020403]";
  const headerBg = isLight ? "bg-white border-gray-200" : "bg-[#080c0a] border-white/5";
  const navBottomBg = isLight ? "bg-white border-gray-200" : "bg-[#080c0a] border-white/5";
  const sidebarBg = isLight ? "bg-white border-gray-200" : "bg-[#080c0a] border-white/5";

  const sidebarGroupOpen = (key: GroupKey, items: { href: string; icon: string; label: string }[]) => {
    if (items.some((i) => isActive(i.href))) return true;
    return openSidebarGroup === key;
  };

  const toggleSidebarGroup = (key: GroupKey, items: { href: string; icon: string; label: string }[]) => {
    if (items.some((i) => isActive(i.href))) return;
    setOpenSidebarGroup((prev) => (prev === key ? null : key));
  };

  const renderSidebarGroup = (key: GroupKey, label: string, icon: string, items: { href: string; icon: string; label: string }[]) => {
    const activeInGroup = items.some((i) => isActive(i.href));
    const open = sidebarGroupOpen(key, items);
    return (
      <div className="mb-1">
        <button
          type="button"
          onClick={() => toggleSidebarGroup(key, items)}
          className={`flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${activeInGroup || open ? "text-primary" : isLight ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:bg-white/5"}`}
          aria-expanded={open}
        >
          <span className={`material-symbols-outlined text-[20px] shrink-0 ${activeInGroup ? "filled" : ""}`}>{icon}</span>
          <span className="flex-1 truncate">{label}</span>
          <span className={`material-symbols-outlined text-lg shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>expand_more</span>
        </button>
        {open && (
          <div className="mt-0.5 space-y-0.5 border-l border-primary/20 ml-4 pl-1">
            {items.map((item) => (
              <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} active={isActive(item.href)} indent />
            ))}
          </div>
        )}
      </div>
    );
  };

  const slug = business?.slug ?? "";

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row ${bgMain}`} data-theme={theme}>
      {user?.isImpersonating && (
        <div
          className={`fixed top-0 left-0 right-0 z-[100] flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 text-sm border-b ${
            isLight
              ? "bg-amber-100 border-amber-200 text-amber-950"
              : "bg-amber-950/95 border-amber-700/50 text-amber-50"
          }`}
        >
          <p className="text-center leading-snug max-w-[min(100%,52rem)]">
            <strong>Acesso compartilhado ao dashboard:</strong> você está no painel de{" "}
            <strong>{business?.name ?? "-"}</strong>
            {profile?.email ? (
              <>
                {" "}
                (<span className="tabular-nums">{profile.email}</span>)
              </>
            ) : null}
            .
          </p>
          <button
            type="button"
            disabled={impersonationExitLoading}
            onClick={() => {
              setImpersonationExitLoading(true);
              void stopImpersonation()
                .catch((e) => {
                  showAlert(e instanceof Error ? e.message : "Não foi possível voltar à sua conta.", {
                    title: "Acesso compartilhado",
                  });
                  setImpersonationExitLoading(false);
                });
            }}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-60 ${
              isLight
                ? "bg-white border-amber-300 text-amber-950 hover:bg-amber-50"
                : "bg-amber-800 border-amber-600 text-white hover:bg-amber-700"
            }`}
          >
            {impersonationExitLoading ? "Saindo…" : "Voltar à minha conta"}
          </button>
        </div>
      )}
      <aside
        className={`hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:fixed lg:left-0 lg:z-40 lg:border-r ${sidebarBg} ${
          user?.isImpersonating ? "lg:top-14 lg:h-[calc(100vh-3.5rem)]" : "lg:top-0 lg:h-screen"
        }`}
      >
        <div className="p-4 border-b border-inherit">
          <Link href="/" className={`block font-bold tracking-tight text-lg transition-opacity hover:opacity-90 ${isLight ? "text-gray-900" : "text-white"}`}>
            Agenndo
          </Link>
          {business?.name && <p className="text-xs text-gray-500 mt-1 truncate" title={business.name}>{business.name}</p>}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 min-h-0">
          <Link
            href="/dashboard"
            onClick={() => {
              setOpenSidebarGroup(null);
              setMobileExpandedGroup(null);
            }}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-2 ${pathname === "/dashboard" ? "bg-primary/10 text-primary" : isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
          >
            <span className={`material-symbols-outlined text-[20px] ${pathname === "/dashboard" ? "filled" : ""}`}>grid_view</span>
            Início
          </Link>
          <p className={`px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider ${isLight ? "text-gray-400" : "text-gray-500"}`}>Menu</p>
          {renderSidebarGroup("agenda", "Agenda", "calendar_month", MENU_AGENDA)}
          {renderSidebarGroup("cadastros", "Cadastros", "folder", MENU_CADASTROS)}
          {renderSidebarGroup("dados", "Dados", "bar_chart", MENU_DADOS)}
          {renderSidebarGroup("config", "Configurações", "tune", MENU_CONFIG)}
          <div className="mt-3 pt-3 border-t border-inherit space-y-0.5">
            {DIRECT_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setOpenSidebarGroup(null);
                  setMobileExpandedGroup(null);
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.href) ? "bg-primary/10 text-primary" : isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
              >
                <span className={`material-symbols-outlined text-[20px] ${isActive(item.href) ? "filled" : ""}`}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className={`p-3 border-t border-inherit space-y-1 shrink-0 ${isLight ? "bg-gray-50/80" : "bg-black/20"}`}>
          {slug && (
            <Link
              href={`/${slug}`}
              target="_blank"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isLight ? "text-gray-600 hover:bg-white" : "text-gray-400 hover:bg-white/10 hover:text-white"}`}
            >
              <span className="material-symbols-outlined text-base">open_in_new</span>
              Página pública
            </Link>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className={`flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isLight ? "text-gray-600 hover:bg-white" : "text-gray-400 hover:bg-white/10 hover:text-white"}`}
            title={theme === "light" ? "Usar tema escuro" : "Usar tema claro"}
            aria-label={theme === "light" ? "Tema escuro" : "Tema claro"}
          >
            <span className="material-symbols-outlined text-xl">{theme === "light" ? "dark_mode" : "light_mode"}</span>
            {theme === "light" ? "Tema escuro" : "Tema claro"}
          </button>
        </div>
      </aside>

      <div
        className={`flex flex-col flex-1 min-w-0 min-h-screen lg:pl-64 ${user?.isImpersonating ? "pt-14" : ""}`}
      >
        <header className={`lg:hidden sticky top-0 z-28 border-b shadow-sm ${headerBg}`}>
          <div className="px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              <Link href="/" className={`transition-opacity hover:opacity-90 ${isLight ? "text-gray-900" : "text-white"}`}>
                <span className="text-lg font-bold tracking-tight">Agenndo</span>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                {slug && (
                  <Link href={`/${slug}`} target="_blank" className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/10 hover:text-white"}`} title="Ver página pública">
                    <span className="material-symbols-outlined text-base">open_in_new</span>
                  </Link>
                )}
                <button type="button" onClick={toggleTheme} className={`size-9 flex items-center justify-center rounded-lg transition-colors ${isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/10 hover:text-white"}`} title={theme === "light" ? "Usar tema escuro" : "Usar tema claro"} aria-label={theme === "light" ? "Tema escuro" : "Tema claro"}>
                  <span className="material-symbols-outlined text-xl">{theme === "light" ? "dark_mode" : "light_mode"}</span>
                </button>
                <Link href="/dashboard/notificacoes" className="size-9 flex items-center justify-center rounded-lg relative">
                  <span className="material-symbols-outlined text-xl">notifications</span>
                  <span className="absolute top-1.5 right-1.5 size-2 bg-primary rounded-full" />
                </Link>
              </div>
            </div>
          </div>
        </header>
        <main className={`flex-1 w-full lg:pb-8 ${mobileExpandedGroup ? "pb-36" : "pb-20"}`}>
          <div className="px-4 sm:px-6 lg:px-8 py-6 w-full max-w-none">
            {business &&
              !hasFullServiceAccess({
                plan: business.plan,
                stripe_subscription_id: business.stripe_subscription_id,
                subscription_status: business.subscription_status,
                subscription_current_period_end: business.subscription_current_period_end,
                trial_ends_at: business.trial_ends_at,
                billing_issue_deadline: business.billing_issue_deadline,
                created_at: business.created_at,
              }) && (
                <div
                  className={`mb-4 rounded-xl border px-4 py-3 text-sm shadow-sm ${
                    isLight
                      ? "border-amber-400/80 bg-amber-50 text-amber-950"
                      : "border-amber-500/45 bg-amber-950/55 text-amber-50"
                  }`}
                >
                  <p
                    className={`font-bold flex items-center gap-2 ${isLight ? "text-amber-950" : "text-amber-100"}`}
                  >
                    <span className="material-symbols-outlined text-lg">gpp_maybe</span>
                    Agendamentos públicos e novos cadastros estão bloqueados
                  </p>
                  <p
                    className={`mt-1 leading-relaxed ${isLight ? "text-amber-900/90" : "text-amber-200/95"}`}
                  >
                    Ative ou regularize sua assinatura para liberar a página de agendamento e o uso completo do painel.
                  </p>
                  <Link
                    href="/dashboard/conta"
                    className={`mt-2 inline-flex items-center gap-1 text-sm font-bold underline underline-offset-2 hover:no-underline ${
                      isLight
                        ? "text-amber-950 hover:text-amber-800"
                        : "text-amber-100 hover:text-white"
                    }`}
                  >
                    Ir para Meu plano
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </Link>
                </div>
              )}
            {children}
          </div>
        </main>
      </div>
      {mobileExpandedGroup && (
        <>
          <button
            type="button"
            aria-label="Fechar submenu"
            className="lg:hidden fixed inset-x-0 top-0 z-[28] bg-black/45 backdrop-blur-[2px]"
            style={{ bottom: "calc(0px + env(safe-area-inset-bottom, 0px))" }}
            onClick={() => setMobileExpandedGroup(null)}
          />
          <div
            className={`lg:hidden fixed left-2 right-2 z-[32] rounded-2xl border shadow-[0_-8px_40px_rgba(0,0,0,0.18)] overflow-hidden ${
              isLight ? "bg-white border-gray-200/90" : "bg-[#0c1210] border-white/10"
            }`}
            style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 10px)" }}
            role="dialog"
            aria-label={MOBILE_GROUP_TITLE[mobileExpandedGroup]}
          >
            <div className="flex justify-center pt-2 pb-1">
              <span className={`h-1 w-10 rounded-full ${isLight ? "bg-gray-200" : "bg-white/20"}`} aria-hidden />
            </div>
            <div
              className={`flex items-center justify-between gap-3 px-4 pb-3 border-b ${isLight ? "border-gray-100" : "border-white/[0.08]"}`}
            >
              <div className="min-w-0">
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${isLight ? "text-gray-400" : "text-white/45"}`}>
                  Menu
                </p>
                <p className={`text-base font-bold truncate ${isLight ? "text-gray-900" : "text-white"}`}>
                  {MOBILE_GROUP_TITLE[mobileExpandedGroup]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileExpandedGroup(null)}
                className={`shrink-0 size-10 rounded-xl flex items-center justify-center transition-colors ${
                  isLight ? "text-gray-500 hover:bg-gray-100" : "text-white/60 hover:bg-white/10"
                }`}
                aria-label="Fechar"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <nav className="max-h-[min(52vh,340px)] overflow-y-auto overscroll-contain px-2 pb-3 pt-1 flex flex-col gap-1">
              {(mobileExpandedGroup === "agenda"
                ? MENU_AGENDA
                : mobileExpandedGroup === "cadastros"
                  ? MENU_CADASTROS
                  : mobileExpandedGroup === "dados"
                    ? MENU_DADOS
                    : MENU_CONFIG
              ).map((item) => {
                const subActive = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileExpandedGroup(null)}
                    className={`flex items-center gap-3 min-h-[52px] px-3 py-3 rounded-xl transition-colors ${
                      subActive
                        ? isLight
                          ? "bg-primary/12 text-primary"
                          : "bg-primary/15 text-primary"
                        : isLight
                          ? "text-gray-800 active:bg-gray-50"
                          : "text-white/90 active:bg-white/[0.06]"
                    }`}
                  >
                    <span
                      className={`size-11 rounded-xl flex items-center justify-center shrink-0 material-symbols-outlined text-[22px] ${
                        subActive
                          ? "bg-primary/20 text-primary"
                          : isLight
                            ? "bg-gray-100 text-gray-600"
                            : "bg-white/[0.08] text-white/70"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1 text-left text-[15px] font-semibold leading-tight">{item.label}</span>
                    <span
                      className={`material-symbols-outlined text-xl shrink-0 ${
                        subActive ? "text-primary" : isLight ? "text-gray-300" : "text-white/25"
                      }`}
                    >
                      chevron_right
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center justify-around px-1 pt-1.5 pb-1.5 pb-safe ${navBottomBg}`}>
        {MOBILE_NAV_ITEMS.map((item) => {
          if (item.type === "link") {
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileExpandedGroup(null)} className={`flex flex-col items-center gap-0.5 py-1.5 flex-1 min-w-0 max-w-[72px] ${active ? "text-primary" : isLight ? "text-gray-500" : "text-gray-500"}`}>
                <span className={`material-symbols-outlined text-[20px] ${active ? "filled" : ""}`}>{item.icon}</span>
                <span className={`text-[9px] font-medium leading-none truncate w-full text-center ${active ? "text-primary" : ""}`}>{item.label}</span>
              </Link>
            );
          }
          const active = item.items.some((i) => isActive(i.href));
          const open = mobileExpandedGroup === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setMobileExpandedGroup((prev) => (prev === item.key ? null : item.key))}
              className={`flex flex-col items-center gap-0.5 py-1.5 flex-1 min-w-0 max-w-[72px] ${active || open ? "text-primary" : isLight ? "text-gray-500" : "text-gray-500"}`}
            >
              <span className={`material-symbols-outlined text-[20px] ${active || open ? "filled" : ""}`}>{item.icon}</span>
              <span className={`text-[9px] font-medium leading-none truncate w-full text-center ${active || open ? "text-primary" : ""}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <WhatsAppSupportWidget context="dashboard" />
    </div>
  );
}

type DashboardShellProps = {
  user: UserInfo | null;
  profile: ProfileRow | null;
  business: BusinessRow | null;
  children: React.ReactNode;
};

export function DashboardShell({ user, profile, business, children }: DashboardShellProps) {
  return (
    <ThemeProvider>
      <DashboardProvider user={user} profile={profile} business={business} loading={false} refetch={() => {}}>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </DashboardProvider>
    </ThemeProvider>
  );
}
