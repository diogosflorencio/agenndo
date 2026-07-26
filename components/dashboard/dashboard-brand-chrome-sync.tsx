"use client";

import { useEffect, useMemo } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { useTheme } from "@/lib/theme-context";
import {
  dashboardBrandCssProperties,
  brandEdgeBorderDataAttribute,
} from "@/lib/brand-color";

const BRAND_CSS_VARS = [
  "--primary",
  "--primary-dark",
  "--primary-rgb",
  "--primary-fg",
  "--primary-mark",
  "--primary-mark-rgb",
] as const;

/** Espelha cor da marca no `<html>` para modais portaled (fora do shell). */
export function DashboardBrandChromeSync() {
  const { business, brandColorPreview } = useDashboard();
  const { theme } = useTheme();
  const brandHex = brandColorPreview ?? business?.primary_color;
  const isDark = theme === "dark";
  const brandStyle = useMemo(() => dashboardBrandCssProperties(brandHex, isDark), [brandHex, isDark]);
  const edgeAttr = useMemo(
    () => brandEdgeBorderDataAttribute(brandHex, isDark),
    [brandHex, isDark],
  );

  useEffect(() => {
    const el = document.documentElement;
    for (const [key, value] of Object.entries(brandStyle)) {
      if (typeof value === "string") el.style.setProperty(key, value);
    }
    if (edgeAttr?.["data-brand-edge-border"]) {
      el.setAttribute("data-brand-edge-border", "true");
    } else {
      el.removeAttribute("data-brand-edge-border");
    }
    el.setAttribute("data-dashboard-brand-chrome", "true");

    return () => {
      for (const key of BRAND_CSS_VARS) el.style.removeProperty(key);
      el.removeAttribute("data-brand-edge-border");
      el.removeAttribute("data-dashboard-brand-chrome");
    };
  }, [brandStyle, edgeAttr]);

  return null;
}
