import { getDashboardSurfaces } from "@/lib/dashboard-surfaces";

/** Tokens para diálogos/popovers dentro do dashboard (tema claro e escuro). */
export function getDashboardDialogUi(isDark: boolean) {
  const s = getDashboardSurfaces(isDark);
  return {
    backdrop: "bg-black/55 backdrop-blur-[2px]",
    panel: `${s.card} text-left shadow-xl ${isDark ? "shadow-[0_24px_80px_-12px_rgba(0,0,0,0.75)]" : ""}`,
    header: `border-b ${isDark ? "border-white/10" : "border-gray-200"}`,
    footer: `border-t ${isDark ? "border-white/10 bg-[#080c0a]" : "border-gray-200 bg-gray-50/80"}`,
    title: s.title,
    subtitle: s.subtitle,
    muted: s.muted,
    label: s.label,
    surface: `rounded-xl border ${s.cardInset}`,
    input: s.input,
    btnSecondary: s.btnSecondary,
    btnGhost: s.btnGhost,
    closeBtn: s.closeBtn,
  };
}
