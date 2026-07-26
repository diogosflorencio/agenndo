"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { hasFullServiceAccess } from "@/lib/billing-access";
import type { BusinessRow, ProfileRow, StaffLink, UserInfo } from "@/lib/dashboard-context";
import { WhatsAppSupportWidget } from "@/components/whatsapp-support-widget";
import { StaffDashboardBoundary } from "@/components/dashboard/staff-dashboard-boundary";
import { stopImpersonation } from "@/lib/auth/impersonation-client";
import { useAppAlert } from "@/components/app-alert-provider";
import { DashboardHotkeyProvider } from "@/lib/dashboard-hotkeys";
import {
  DashboardNavigationGuardProvider,
  GuardedDashboardLink,
} from "@/lib/dashboard-navigation-guard";
import { cn } from "@/lib/utils";
import { DashboardNotificationBell } from "@/components/dashboard/dashboard-notification-bell";
import {
  DashboardThemeHint,
  useDashboardThemeHint,
} from "@/components/dashboard/dashboard-theme-hint";
import { useI18n } from "@/components/i18n-provider";
import { dashboardBrandCssProperties, brandEdgeBorderDataAttribute } from "@/lib/brand-color";
import { DashboardBrandChromeSync } from "@/components/dashboard/dashboard-brand-chrome-sync";
import { dashboardGroupLabel, dashboardNavLabel } from "@/lib/i18n/dashboard-nav-labels";
import type { DashboardMobileNavItem } from "@/lib/dashboard-nav";
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
const DIRECT_LINKS = [{ href: "/dashboard/conta", icon: "manage_accounts", label: "Conta" }];

type GroupKey = "agenda" | "cadastros" | "dados" | "config";

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
    <GuardedDashboardLink href={href} onClick={onClick} className={`${base} ${activeClass}`}>
      <span className={`material-symbols-outlined text-[18px] shrink-0 ${active ? "filled" : ""}`}>{icon}</span>
      <span className="truncate">{label}</span>
    </GuardedDashboardLink>
  );
}

function DashboardLayoutInner({
  children,
  mobileNavItems,
  showOwnerComissoesLink,
}: {
  children: React.ReactNode;
  mobileNavItems: DashboardMobileNavItem[];
  showOwnerComissoesLink: boolean;
}) {
  const pathname = usePathname();
  const { locale } = useI18n();
  const navLabel = (href: string, fallback: string) => dashboardNavLabel(locale, href, fallback);
  const groupLabel = (key: GroupKey, fallback: string) => dashboardGroupLabel(locale, key, fallback);
  const { theme, toggleTheme } = useTheme();
  const themeHint = useDashboardThemeHint();
  const handleToggleTheme = () => {
    toggleTheme();
    themeHint.dismiss();
  };
  const { showAlert } = useAppAlert();
  const { business, user, profile, isStaffDashboard, staffContexts, brandColorPreview } = useDashboard();
  const [impersonationExitLoading, setImpersonationExitLoading] = useState(false);
  /** Apenas um grupo aberto por vez; Início e Conta fecham todos. */
  const [openSidebarGroup, setOpenSidebarGroup] = useState<GroupKey | null>(null);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState<"agenda" | "cadastros" | "dados" | "config" | null>(null);
  const [sidebarMotionReady, setSidebarMotionReady] = useState(false);

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  useEffect(() => {
    setSidebarMotionReady(true);
  }, []);

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
    const submenuItems = (
      <div className="mt-0.5 space-y-0.5 border-l border-primary/20 ml-4 pl-1 pb-0.5">
        {items.map((item, index) =>
          sidebarMotionReady ? (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.045,
                duration: 0.32,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <NavItem href={item.href} icon={item.icon} label={navLabel(item.href, item.label)} active={isActive(item.href)} indent />
            </motion.div>
          ) : (
            <NavItem key={item.href} href={item.href} icon={item.icon} label={navLabel(item.href, item.label)} active={isActive(item.href)} indent />
          )
        )}
      </div>
    );

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
        {open && !sidebarMotionReady ? (
          <div className="overflow-hidden">{submenuItems}</div>
        ) : null}
        {sidebarMotionReady ? (
          <AnimatePresence initial={false}>
            {open ? (
              <motion.div
                key={`sidebar-submenu-${key}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                {submenuItems}
              </motion.div>
            ) : null}
          </AnimatePresence>
        ) : null}
      </div>
    );
  };

  const slug = isStaffDashboard ? "" : (business?.slug ?? "");
  const brandHex = brandColorPreview ?? business?.primary_color;
  const brandStyle = useMemo(() => dashboardBrandCssProperties(brandHex, !isLight), [brandHex, isLight]);
  const brandEdgeBorderAttr = useMemo(
    () => brandEdgeBorderDataAttribute(brandHex, !isLight),
    [brandHex, isLight],
  );

  return (
    <div
      className={`min-h-screen flex flex-col lg:flex-row ${bgMain}`}
      data-theme={theme}
      data-dashboard-brand-root
      style={brandStyle}
      {...brandEdgeBorderAttr}
    >
      <DashboardBrandChromeSync />
      {user?.isImpersonating && (
        <div
          className={`fixed top-0 left-0 right-0 z-[100] flex h-10 items-center justify-between gap-2 border-b px-3 text-[11px] sm:text-xs ${
            isLight
              ? "border-amber-200/80 bg-amber-100/95 text-amber-950"
              : "border-amber-800/60 bg-amber-950/95 text-amber-50"
          }`}
        >
          <p className="min-w-0 flex-1 truncate leading-tight">
            <span className="font-semibold">Acesso compartilhado</span>
            <span className="opacity-80"> · {business?.name ?? "-"}</span>
            {profile?.email ? (
              <span className="hidden opacity-75 sm:inline"> · {profile.email}</span>
            ) : null}
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
            className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold transition-colors disabled:opacity-60 sm:px-2.5 ${
              isLight
                ? "border border-amber-300/80 bg-white text-amber-950 hover:bg-amber-50"
                : "border border-amber-600/80 bg-amber-800 text-white hover:bg-amber-700"
            }`}
          >
            {impersonationExitLoading ? "…" : "Voltar"}
          </button>
        </div>
      )}
      <aside
        className={`hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:fixed lg:left-0 lg:z-40 lg:border-r ${sidebarBg} ${
          user?.isImpersonating ? "lg:top-10 lg:h-[calc(100vh-1.5rem)]" : "lg:top-0 lg:h-screen"
        }`}
      >
        <div className="p-4 border-b border-inherit flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <GuardedDashboardLink href="/" className={`block font-bold tracking-tight text-lg transition-opacity hover:opacity-90 ${isLight ? "text-gray-900" : "text-white"}`}>
              Agenndo
            </GuardedDashboardLink>
          {isStaffDashboard ? (
            staffContexts.length > 1 ? (
              <p className="text-xs text-gray-500 mt-1 leading-snug" title={staffContexts.map((s) => s.businessName).join(", ")}>
                {staffContexts.length} negócios · comissões unificadas
              </p>
            ) : staffContexts[0]?.businessName ? (
              <p className="text-xs text-gray-500 mt-1 truncate" title={staffContexts[0].businessName}>
                {staffContexts[0].businessName}
              </p>
            ) : null
          ) : business?.name ? (
            <p className="text-xs text-gray-500 mt-1 truncate" title={business.name}>
              {business.name}
            </p>
          ) : null}
          </div>
          {!isStaffDashboard ? (
            <DashboardNotificationBell
              className={cn(
                "size-10 mt-0.5",
                isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/10 hover:text-white"
              )}
              iconClassName="text-[22px]"
            />
          ) : null}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 min-h-0">
          {isStaffDashboard ? (
            <>
              <p className={`px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider ${isLight ? "text-gray-400" : "text-gray-500"}`}>
                Profissional
              </p>
              <GuardedDashboardLink
                href="/dashboard/minhas-comissoes"
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
                  pathname.startsWith("/dashboard/minhas-comissoes")
                    ? "bg-primary/10 text-primary"
                    : isLight
                      ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${pathname.startsWith("/dashboard/minhas-comissoes") ? "filled" : ""}`}
                >
                  savings
                </span>
                Minhas comissões
              </GuardedDashboardLink>
            </>
          ) : (
            <>
              <GuardedDashboardLink
                href="/dashboard"
                onClick={() => {
                  setOpenSidebarGroup(null);
                  setMobileExpandedGroup(null);
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-2 ${pathname === "/dashboard" ? "bg-primary/10 text-primary" : isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
              >
                <span className={`material-symbols-outlined text-[20px] ${pathname === "/dashboard" ? "filled" : ""}`}>grid_view</span>
                Início
              </GuardedDashboardLink>
              <p className={`px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider ${isLight ? "text-gray-400" : "text-gray-500"}`}>Menu</p>
              {renderSidebarGroup("agenda", groupLabel("agenda", "Agenda"), "calendar_month", MENU_AGENDA)}
              {renderSidebarGroup("cadastros", groupLabel("cadastros", "Cadastros"), "folder", MENU_CADASTROS)}
              {renderSidebarGroup("dados", groupLabel("dados", "Dados"), "bar_chart", MENU_DADOS)}
              {renderSidebarGroup("config", groupLabel("config", "Configurações"), "tune", MENU_CONFIG)}
              <div className="mt-3 pt-3 border-t border-inherit space-y-0.5">
                {showOwnerComissoesLink ? (
                  <GuardedDashboardLink
                    href="/dashboard/minhas-comissoes"
                    onClick={() => {
                      setOpenSidebarGroup(null);
                      setMobileExpandedGroup(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith("/dashboard/minhas-comissoes")
                        ? "bg-primary/10 text-primary"
                        : isLight
                          ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] ${pathname.startsWith("/dashboard/minhas-comissoes") ? "filled" : ""}`}
                    >
                      savings
                    </span>
                    Minhas comissões
                  </GuardedDashboardLink>
                ) : null}
                {DIRECT_LINKS.map((item) => (
                  <GuardedDashboardLink
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      setOpenSidebarGroup(null);
                      setMobileExpandedGroup(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.href) ? "bg-primary/10 text-primary" : isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
                  >
                    <span className={`material-symbols-outlined text-[20px] ${isActive(item.href) ? "filled" : ""}`}>{item.icon}</span>
                    {navLabel(item.href, item.label)}
                  </GuardedDashboardLink>
                ))}
              </div>
            </>
          )}
        </nav>
        <div className={`p-3 border-t border-inherit space-y-1 shrink-0 ${isLight ? "bg-gray-50/80" : "bg-black/20"}`}>
          {!isStaffDashboard && slug ? (
            <Link
              href={`/${slug}`}
              target="_blank"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isLight ? "text-gray-600 hover:bg-white" : "text-gray-400 hover:bg-white/10 hover:text-white"}`}
            >
              <span className="material-symbols-outlined text-base">open_in_new</span>
              Página pública
            </Link>
          ) : null}
          <div className="relative">
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isLight ? "text-gray-600 hover:bg-white" : "text-gray-400 hover:bg-white/10 hover:text-white"}`}
              title={theme === "light" ? "Usar tema escuro" : "Usar tema claro"}
              aria-label={theme === "light" ? "Tema escuro" : "Tema claro"}
            >
              <span className="material-symbols-outlined text-xl">{theme === "light" ? "dark_mode" : "light_mode"}</span>
              {theme === "light" ? "Tema escuro" : "Tema claro"}
            </button>
            <DashboardThemeHint
              visible={themeHint.visible}
              onDismiss={themeHint.dismiss}
              placement="sidebar"
              isLight={isLight}
            />
          </div>
        </div>
      </aside>

      <div
        className={`flex flex-col flex-1 min-w-0 min-h-screen lg:pl-64 ${user?.isImpersonating ? "pt-10" : ""}`}
      >
        <header className={`lg:hidden sticky top-0 z-28 border-b shadow-sm ${headerBg}`}>
          <div className="px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              <GuardedDashboardLink href="/" className={`transition-opacity hover:opacity-90 ${isLight ? "text-gray-900" : "text-white"}`}>
                <span className="text-lg font-bold tracking-tight">Agenndo</span>
              </GuardedDashboardLink>
              <div className="flex items-center gap-2 shrink-0">
                {!isStaffDashboard && slug ? (
                  <Link href={`/${slug}`} target="_blank" className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/10 hover:text-white"}`} title="Ver página pública">
                    <span className="material-symbols-outlined text-base">open_in_new</span>
                  </Link>
                ) : null}
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleToggleTheme}
                    className={`size-9 flex items-center justify-center rounded-lg transition-colors ${isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/10 hover:text-white"}`}
                    title={theme === "light" ? "Usar tema escuro" : "Usar tema claro"}
                    aria-label={theme === "light" ? "Tema escuro" : "Tema claro"}
                  >
                    <span className="material-symbols-outlined text-xl">{theme === "light" ? "dark_mode" : "light_mode"}</span>
                  </button>
                  <DashboardThemeHint
                    visible={themeHint.visible}
                    onDismiss={themeHint.dismiss}
                    placement="mobile"
                    isLight={isLight}
                  />
                </div>
                {!isStaffDashboard ? (
                  <DashboardNotificationBell
                    className={cn(
                      "size-9",
                      isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/10 hover:text-white"
                    )}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </header>
        <main className={`flex-1 w-full lg:pb-8 ${mobileExpandedGroup ? "pb-36" : "pb-20"}`}>
          <div className="px-4 sm:px-6 lg:px-8 py-6 w-full max-w-none">
            {business &&
              !isStaffDashboard &&
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
                  <GuardedDashboardLink
                    href="/dashboard/conta"
                    className={`mt-2 inline-flex items-center gap-1 text-sm font-bold underline underline-offset-2 hover:no-underline ${
                      isLight
                        ? "text-amber-950 hover:text-amber-800"
                        : "text-amber-100 hover:text-white"
                    }`}
                  >
                    Ir para Meu plano
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </GuardedDashboardLink>
                </div>
              )}
            <StaffDashboardBoundary>{children}</StaffDashboardBoundary>
          </div>
        </main>
      </div>
      {mobileExpandedGroup && (
        <>
          <button
            type="button"
            aria-label="Fechar submenu"
            className="lg:hidden fixed inset-x-0 top-0 z-[52] bg-black/45 backdrop-blur-[2px]"
            style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
            onClick={() => setMobileExpandedGroup(null)}
          />
          <div
            className={`lg:hidden fixed left-2 right-2 z-[53] rounded-2xl border shadow-[0_-8px_40px_rgba(0,0,0,0.18)] overflow-hidden ${
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
                  <GuardedDashboardLink
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileExpandedGroup(null)}
                    className={`flex items-center gap-3 min-h-[52px] px-3 py-2.5 rounded-xl transition-colors ${
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
                      className={`grid shrink-0 place-items-center size-11 rounded-xl ${
                        subActive
                          ? "bg-primary/20 text-primary"
                          : isLight
                            ? "bg-gray-100 text-gray-600"
                            : "bg-white/[0.08] text-white/70"
                      }`}
                    >
                      <span className="material-symbols-outlined inline-grid size-[22px] place-items-center text-[22px] leading-none !min-h-[22px] !min-w-[22px]">
                        {item.icon}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-1 items-center text-left text-[15px] font-semibold leading-snug">
                      {navLabel(item.href, item.label)}
                    </span>
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center ${
                        subActive ? "text-primary" : isLight ? "text-gray-300" : "text-white/25"
                      }`}
                      aria-hidden
                    >
                      <span className="material-symbols-outlined inline-grid size-6 place-items-center text-xl leading-none !min-h-6 !min-w-6">
                        chevron_right
                      </span>
                    </span>
                  </GuardedDashboardLink>
                );
              })}
            </nav>
          </div>
        </>
      )}
      <nav
        className={`lg:hidden fixed bottom-0 left-0 right-0 border-t flex items-center justify-around px-1 pt-1.5 pb-1.5 pb-safe ${navBottomBg} ${
          mobileExpandedGroup ? "z-[55]" : "z-40"
        }`}
      >
        {mobileNavItems.map((item) => {
          if (item.type === "link") {
            const active = isActive(item.href, item.exact);
            return (
              <GuardedDashboardLink key={item.href} href={item.href} onClick={() => setMobileExpandedGroup(null)} className={`flex flex-col items-center gap-0.5 py-1.5 flex-1 min-w-0 max-w-[72px] ${active ? "text-primary" : isLight ? "text-gray-500" : "text-gray-500"}`}>
                <span className="flex h-[22px] w-full items-center justify-center">
                  <span
                    className={`material-symbols-outlined inline-grid size-5 place-items-center text-[20px] leading-none !min-h-5 !min-w-5 ${active ? "filled" : ""}`}
                  >
                    {item.icon}
                  </span>
                </span>
                <span className={`text-[9px] font-medium leading-none truncate w-full text-center ${active ? "text-primary" : ""}`}>{navLabel(item.href, item.label)}</span>
              </GuardedDashboardLink>
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
              <span className="flex h-[22px] w-full items-center justify-center">
                <span
                  className={`material-symbols-outlined inline-grid size-5 place-items-center text-[20px] leading-none !min-h-5 !min-w-5 ${active || open ? "filled" : ""}`}
                >
                  {item.icon}
                </span>
              </span>
              <span className={`text-[9px] font-medium leading-none truncate w-full text-center ${active || open ? "text-primary" : ""}`}>{groupLabel(item.key, item.label)}</span>
            </button>
          );
        })}
      </nav>

      {!isStaffDashboard ? <WhatsAppSupportWidget context="dashboard" /> : null}
    </div>
  );
}

type DashboardShellProps = {
  user: UserInfo | null;
  profile: ProfileRow | null;
  business: BusinessRow | null;
  children: React.ReactNode;
  isStaffDashboard?: boolean;
  hasStaffMembership?: boolean;
  showOwnerComissoesLink?: boolean;
  mobileNavItems: DashboardMobileNavItem[];
  staffCollaboratorId?: string | null;
  staffContexts?: StaffLink[];
};

export function DashboardShell({
  user,
  profile,
  business,
  children,
  isStaffDashboard = false,
  hasStaffMembership = false,
  showOwnerComissoesLink = false,
  mobileNavItems,
  staffCollaboratorId = null,
  staffContexts = [],
}: DashboardShellProps) {
  return (
    <ThemeProvider>
      <DashboardProvider
        user={user}
        profile={profile}
        business={business}
        loading={false}
        refetch={() => {}}
        isStaffDashboard={isStaffDashboard}
        hasStaffMembership={hasStaffMembership}
        staffCollaboratorId={staffCollaboratorId}
        staffContexts={staffContexts}
      >
        <DashboardHotkeyProvider>
          <DashboardNavigationGuardProvider>
            <DashboardLayoutInner
              mobileNavItems={mobileNavItems}
              showOwnerComissoesLink={showOwnerComissoesLink}
            >
              {children}
            </DashboardLayoutInner>
          </DashboardNavigationGuardProvider>
        </DashboardHotkeyProvider>
      </DashboardProvider>
    </ThemeProvider>
  );
}
