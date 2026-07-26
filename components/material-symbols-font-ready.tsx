"use client";

import { useEffect } from "react";
import { waitForMaterialSymbolsFont } from "@/lib/material-symbols-font";

/**
 * Ícones usam a fonte **Material Symbols Outlined** (Google Fonts), por ligadura.
 * Revela ícones só quando essa família estiver carregada — não quando `document.fonts.ready` genérico resolver.
 */
export function MaterialSymbolsFontReady() {
  useEffect(() => {
    const root = document.documentElement;
    let cancelled = false;

    const reveal = () => {
      if (cancelled) return;
      root.classList.remove("material-symbols-fonts-pending");
      root.classList.add("material-symbols-fonts-ready");
    };

    void waitForMaterialSymbolsFont().then(reveal);

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
