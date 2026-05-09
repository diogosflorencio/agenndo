"use client";

import { useEffect } from "react";

/**
 * Ícones usam a fonte **Material Symbols Outlined** (Google Fonts), por ligadura.
 * Marca `html` quando `document.fonts` está pronto para revelar ícones sem mostrar o nome da glifa antes.
 */
export function MaterialSymbolsFontReady() {
  useEffect(() => {
    const root = document.documentElement;

    const done = () => {
      root.classList.remove("material-symbols-fonts-pending");
      root.classList.add("material-symbols-fonts-ready");
    };

    let cancelled = false;
    const fallback = window.setTimeout(done, 2800);

    if (typeof document !== "undefined" && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (cancelled) return;
        window.clearTimeout(fallback);
        done();
      });
    }

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, []);

  return null;
}
