"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const HINT_SEEN_KEY = "agenndo_dashboard_theme_hint_seen";
const THEME_STORAGE_KEY = "agenndo_dashboard_theme";

export function useDashboardThemeHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(HINT_SEEN_KEY) === "1") return;
    if (localStorage.getItem(THEME_STORAGE_KEY)) return;
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(HINT_SEEN_KEY, "1");
    setVisible(false);
  }, []);

  return { visible, dismiss };
}

export function DashboardThemeHint({
  visible,
  onDismiss,
  placement,
  isLight,
}: {
  visible: boolean;
  onDismiss: () => void;
  placement: "sidebar" | "mobile";
  isLight: boolean;
}) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "absolute z-50 w-[15.5rem] rounded-xl border p-3 shadow-lg",
        placement === "sidebar" ? "left-full bottom-0 ml-3" : "right-0 top-full mt-2",
        isLight ? "border-emerald-200 bg-white text-gray-600" : "border-emerald-500/30 bg-[#0c1210] text-gray-300",
      )}
    >
      <p className={cn("text-xs font-semibold mb-1", isLight ? "text-gray-900" : "text-white")}>
        Aparência do painel
      </p>
      <p className="text-xs leading-relaxed">
        O tema claro vem ativado por padrão. Para usar o escuro, altere aqui quando quiser.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
      >
        Entendi
      </button>
    </div>
  );
}
