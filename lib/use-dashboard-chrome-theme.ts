"use client";

import { useEffect, useState } from "react";

export type DashboardChromeTheme = {
  /** Tema claro/escuro do painel (`data-dashboard-theme` no html). */
  isDark: boolean;
  /** Usuário está no dashboard (marca sincronizada no html). */
  inDashboard: boolean;
  /** Borda fina em botões brancos/pretos (`data-brand-edge-border` no html). */
  brandEdgeBorder: boolean;
};

function readDashboardChromeTheme(): DashboardChromeTheme {
  if (typeof document === "undefined") {
    return { isDark: false, inDashboard: false, brandEdgeBorder: false };
  }
  const el = document.documentElement;
  const theme = el.getAttribute("data-dashboard-theme");
  return {
    isDark: theme === "dark",
    inDashboard: el.hasAttribute("data-dashboard-brand-chrome"),
    brandEdgeBorder: el.getAttribute("data-brand-edge-border") === "true",
  };
}

/** Lê tema e marca do dashboard a partir do `<html>` (funciona fora do ThemeProvider). */
export function useDashboardChromeTheme(): DashboardChromeTheme {
  const [chrome, setChrome] = useState<DashboardChromeTheme>(readDashboardChromeTheme);

  useEffect(() => {
    setChrome(readDashboardChromeTheme());
    const obs = new MutationObserver(() => setChrome(readDashboardChromeTheme()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-dashboard-theme", "data-dashboard-brand-chrome", "data-brand-edge-border"],
    });
    return () => obs.disconnect();
  }, []);

  return chrome;
}
