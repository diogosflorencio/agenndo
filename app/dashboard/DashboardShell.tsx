"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
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
];
const MENU_CONFIG = [
  { href: "/dashboard/clientes", icon: "person_search", label: "Clientes" },
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

function NavItem({ href, icon, label, active, onClick }: { href: string; icon: string; label: string; active: boolean; onClick?: () => void }) {
  const isLight = useTheme().theme === "light";
  const base = "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors rounded-lg";
  const activeClass = active ? "bg-primary/10 text-primary" : isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/10 hover:text-white";
  return (
    <Link href={href} onClick={onClick} className={`${base} ${activeClass}`}>
      <span className={`material-symbols-outlined text-[18px] ${active ? "filled" : ""}`}>{icon}</span>
      {label}
    </Link>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { business } = useDashboard();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState<"agenda" | "cadastros" | "dados" | "config" | null>(null);
  const refs = { agenda: useRef<HTMLDivElement>(null), cadastros: useRef<HTMLDivElement>(null), dados: useRef<HTMLDivElement>(null), config: useRef<HTMLDivElement>(null) };

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (refs.agenda.current && !refs.agenda.current.contains(target) && refs.cadastros.current && !refs.cadastros.current.contains(target) && refs.dados.current && !refs.dados.current.contains(target) && refs.config.current && !refs.config.current.contains(target)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isLight = theme === "light";
  const bgMain = isLight ? "bg-gray-50" : "bg-[#020403]";
  const headerBg = isLight ? "bg-white border-gray-200" : "bg-[#080c0a] border-white/5";
  const navBottomBg = isLight ? "bg-white border-gray-200" : "bg-[#080c0a] border-white/5";

  const renderGroup = (key: string, label: string, icon: string, items: { href: string; icon: string; label: string }[], ref: React.RefObject<HTMLDivElement>) => {
    const active = items.some((i) => isActive(i.href));
    const open = openGroup === key;
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpenGroup(open ? null : key)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active || open ? "bg-primary/10 text-primary" : isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
        >
          <span className={`material-symbols-outlined text-[20px] ${active ? "filled" : ""}`}>{icon}</span>
          {label}
          <span className={`material-symbols-outlined text-base transition-transform ${open ? "rotate-180" : ""}`}>expand_more</span>
        </button>
        {open && (
          <div className={`absolute top-full left-0 mt-1 py-1 min-w-[200px] rounded-xl border shadow-lg z-50 ${isLight ? "bg-white border-gray-200" : "bg-[#0f1c15] border-white/10"}`}>
            {items.map((item) => (
              <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} active={isActive(item.href)} onClick={() => setOpenGroup(null)} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const slug = business?.slug ?? "";

  return (
    <div className={`min-h-screen flex flex-col ${bgMain}`} data-theme={theme}>
      <header className={`sticky top-0 z-40 border-b shadow-sm ${headerBg}`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 lg:h-16">
            <Link href="/" className={`flex items-center gap-2 transition-opacity hover:opacity-90 ${isLight ? "text-gray-900" : "text-white"}`}>
              <span className="material-symbols-outlined text-primary text-2xl">calendar_month</span>
              <span className="text-lg font-bold tracking-tight">Agenndo</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-0.5 flex-1 mx-4 justify-center flex-wrap">
              <Link href="/dashboard" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${pathname === "/dashboard" ? "bg-primary/10 text-primary" : isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
                <span className={`material-symbols-outlined text-[20px] ${pathname === "/dashboard" ? "filled" : ""}`}>grid_view</span>
                Início
              </Link>
              {renderGroup("agenda", "Agenda", "calendar_month", MENU_AGENDA, refs.agenda)}
              {renderGroup("cadastros", "Cadastros", "folder", MENU_CADASTROS, refs.cadastros)}
              {renderGroup("dados", "Dados", "bar_chart", MENU_DADOS, refs.dados)}
              {renderGroup("config", "Configurações", "tune", MENU_CONFIG, refs.config)}
              {DIRECT_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.href) ? "bg-primary/10 text-primary" : isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
                  <span className={`material-symbols-outlined text-[20px] ${isActive(item.href) ? "filled" : ""}`}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2 shrink-0">
              {slug && (
                <Link href={`/${slug}`} target="_blank" className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/10 hover:text-white"}`} title="Ver página pública">
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  Página pública
                </Link>
              )}
              <button type="button" onClick={toggleTheme} className={`size-9 flex items-center justify-center rounded-lg transition-colors ${isLight ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 hover:bg-white/10 hover:text-white"}`} title={theme === "light" ? "Usar tema escuro" : "Usar tema claro"} aria-label={theme === "light" ? "Tema escuro" : "Tema claro"}>
                <span className="material-symbols-outlined text-xl">{theme === "light" ? "dark_mode" : "light_mode"}</span>
              </button>
              <Link href="/dashboard/notificacoes" className="lg:hidden size-9 flex items-center justify-center rounded-lg relative">
                <span className="material-symbols-outlined text-xl">notifications</span>
                <span className="absolute top-1.5 right-1.5 size-2 bg-primary rounded-full" />
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className={`flex-1 lg:pb-8 ${mobileExpandedGroup ? "pb-36" : "pb-20"}`}>
        <div className="px-4 sm:px-6 lg:px-8 py-6 w-full max-w-5xl mx-auto">{children}</div>
      </main>
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
            <button key={item.key} type="button" onClick={() => setMobileExpandedGroup(open ? null : item.key)} className={`flex flex-col items-center gap-0.5 py-1.5 flex-1 min-w-0 max-w-[72px] ${active || open ? "text-primary" : isLight ? "text-gray-500" : "text-gray-500"}`}>
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
