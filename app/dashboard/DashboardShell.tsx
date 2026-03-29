"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import type { UserInfo } from "@/lib/dashboard-context";
import type { BusinessRow } from "@/lib/dashboard-context";
import type { ProfileRow } from "@/lib/dashboard-context";

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

type GroupKey = "agenda" | "cadastros" | "dados" | "config";

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
  const { business } = useDashboard();
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
      <aside
        className={`hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:fixed lg:left-0 lg:top-0 lg:z-40 lg:h-screen lg:border-r ${sidebarBg}`}
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

      <div className="flex flex-col flex-1 min-w-0 min-h-screen lg:pl-64">
        <header className={`lg:hidden sticky top-0 z-40 border-b shadow-sm ${headerBg}`}>
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
          <div className="px-4 sm:px-6 lg:px-8 py-6 w-full max-w-none">{children}</div>
        </main>
      </div>
      {mobileExpandedGroup && (
        <div className={`lg:hidden fixed left-0 right-0 z-30 border-t px-2 py-2 flex flex-wrap gap-1.5 justify-center ${navBottomBg}`} style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}>
          {(mobileExpandedGroup === "agenda" ? MENU_AGENDA : mobileExpandedGroup === "cadastros" ? MENU_CADASTROS : mobileExpandedGroup === "dados" ? MENU_DADOS : MENU_CONFIG).map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMobileExpandedGroup(null)} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${isActive(item.href) ? "bg-primary/20 text-primary" : isLight ? "bg-gray-100 text-gray-700" : "bg-white/10 text-gray-300"}`}>
              <span className="material-symbols-outlined text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center justify-around px-1 pt-1.5 pb-safe ${navBottomBg}`}>
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
