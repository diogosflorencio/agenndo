"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { UnifiedRowKind } from "@/lib/operacoes/types";

const THEME_KEY = "agenndo_operacoes_theme_v1";
const COLLAPSE_KEY = "agenndo_operacoes_collapse_v1";

export type OperacoesTheme = "dark" | "light";

export type OperacoesCollapseMode = "all" | "prestador" | "cliente";

type ShellCtx = {
  theme: OperacoesTheme;
  toggleTheme: () => void;
  collapseMode: OperacoesCollapseMode;
  setCollapseMode: (m: OperacoesCollapseMode) => void;
  isKindCollapsed: (kind: UnifiedRowKind) => boolean;
};

const OperacoesShellContext = createContext<ShellCtx | null>(null);

export function useOperacoesShell() {
  const ctx = useContext(OperacoesShellContext);
  if (!ctx) throw new Error("useOperacoesShell outside OperacoesShell");
  return ctx;
}

/** @deprecated use useOperacoesShell */
export function useOperacoesTheme() {
  const { theme, toggleTheme } = useOperacoesShell();
  return { theme, toggle: toggleTheme };
}

const COLLAPSE_LABELS: Record<OperacoesCollapseMode, string> = {
  all: "Todos expandidos",
  prestador: "Colapsar prestadores",
  cliente: "Colapsar clientes",
};

export function operacoesSurface(theme: OperacoesTheme) {
  return theme === "light"
    ? {
        page: "min-h-screen bg-slate-100 text-slate-900",
        header: "border-b border-emerald-900/20 bg-white",
        headerBrand: "text-emerald-950",
        headerLink: "text-emerald-900/70 hover:text-emerald-950",
        headerChip: "bg-slate-100 border-slate-200 text-slate-600",
        panel: "rounded-lg border border-slate-200 bg-white",
        cardInner: "rounded-lg border border-slate-200 bg-white",
        table: "bg-white",
        innerTable: "text-xs",
        labelCell: "text-slate-500 font-medium py-1 pr-3 align-top whitespace-nowrap w-[72px]",
        input: "bg-white border-slate-300 text-slate-900",
        muted: "text-slate-500",
        border: "border-slate-200",
        accent: "text-emerald-900 hover:text-emerald-950",
        stat: "text-emerald-950",
        btnPrimary: "bg-emerald-900 hover:bg-emerald-950 text-white",
        btnGhost: "bg-slate-100 hover:bg-slate-200 text-slate-700",
        badgePrestador: "bg-emerald-100 text-emerald-900",
        badgeCliente: "bg-sky-100 text-sky-800",
        badgeAtivo: "bg-emerald-100 text-emerald-800",
        rowCollapsed: "bg-slate-50/90",
      }
    : {
        page: "min-h-screen bg-[#020403] text-white",
        header: "border-b border-[#0a3d22] bg-[#041610]",
        headerBrand: "text-[#c8e6d4]",
        headerLink: "text-[#5a9a72] hover:text-[#8fc4a4]",
        headerChip: "bg-[#062818] border-[#0a3d22] text-[#6b9a7a]",
        panel: "rounded-lg border border-white/10 bg-[#0d2316]",
        cardInner: "rounded-lg border border-white/10 bg-[#0a120e]",
        table: "bg-[#080c0a]",
        innerTable: "text-xs w-full",
        labelCell: "text-[#5a7a68] font-medium py-1 pr-3 align-top whitespace-nowrap w-[72px]",
        input: "bg-[#14221A] border-[#213428] text-gray-200",
        muted: "text-gray-500",
        border: "border-white/10",
        accent: "text-[#2d8f55] hover:text-[#4aad72]",
        stat: "text-[#3dba6a]",
        btnPrimary: "bg-[#0a5230] hover:bg-[#0d6b3d] text-[#e8f5ec]",
        btnGhost: "bg-white/5 hover:bg-white/10 text-gray-400",
        badgePrestador: "bg-[#0a3d22]/80 text-[#4aad72]",
        badgeCliente: "bg-sky-500/15 text-sky-400/90",
        badgeAtivo: "bg-[#0a3d22]/60 text-[#4aad72]",
        rowCollapsed: "bg-[#041610]/80",
      };
}

function CollapseViewSelect({
  value,
  onChange,
  inputClass,
}: {
  value: OperacoesCollapseMode;
  onChange: (m: OperacoesCollapseMode) => void;
  inputClass: string;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-[#5a7a68] font-semibold">Lista</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as OperacoesCollapseMode)}
        className={`h-8 min-w-[10.5rem] rounded-md border px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#1a7a42]/60 ${inputClass}`}
      >
        {(Object.keys(COLLAPSE_LABELS) as OperacoesCollapseMode[]).map((k) => (
          <option key={k} value={k}>
            {COLLAPSE_LABELS[k]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OperacoesShell({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<OperacoesTheme>("dark");
  const [collapseMode, setCollapseModeState] = useState<OperacoesCollapseMode>("all");
  const s = operacoesSurface(theme);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") setTheme(stored);
    const c = localStorage.getItem(COLLAPSE_KEY);
    if (c === "all" || c === "prestador" || c === "cliente") setCollapseModeState(c);
  }, []);

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  };

  const setCollapseMode = useCallback((m: OperacoesCollapseMode) => {
    setCollapseModeState(m);
    localStorage.setItem(COLLAPSE_KEY, m);
  }, []);

  const isKindCollapsed = useCallback(
    (kind: UnifiedRowKind) => collapseMode !== "all" && collapseMode === kind,
    [collapseMode]
  );

  return (
    <OperacoesShellContext.Provider
      value={{ theme, toggleTheme, collapseMode, setCollapseMode, isKindCollapsed }}
    >
      <div className={s.page}>
        <header className={`${s.header} sticky top-0 z-30`}>
          <div className="max-w-7xl mx-auto px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`font-bold text-sm tracking-tight ${s.headerBrand}`}>Operações</span>
                <span className="text-[#0a3d22] hidden sm:inline">|</span>
                <Link href="/operacoes" className={`text-xs font-medium ${s.headerLink}`}>
                  Painel
                </Link>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <CollapseViewSelect
                  value={collapseMode}
                  onChange={setCollapseMode}
                  inputClass={s.input}
                />
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`h-8 px-3 rounded-md border text-xs font-semibold ${s.border} ${s.btnGhost}`}
                >
                  {theme === "dark" ? "Claro" : "Escuro"}
                </button>
                {userEmail ? (
                  <span
                    className={`hidden md:inline-flex h-8 items-center max-w-[220px] truncate rounded-md border px-2.5 text-[11px] ${s.headerChip}`}
                    title={userEmail}
                  >
                    {userEmail}
                  </span>
                ) : null}
                <form action="/operacoes/sair" method="post">
                  <button
                    type="submit"
                    className={`h-8 px-3 rounded-md border text-xs font-semibold ${s.border} ${s.btnGhost}`}
                  >
                    Sair
                  </button>
                </form>
                <Link
                  href="/dashboard"
                  className={`inline-flex h-8 items-center px-3 rounded-md text-xs font-bold ${s.btnPrimary}`}
                >
                  App
                </Link>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">{children}</main>
      </div>
    </OperacoesShellContext.Provider>
  );
}
