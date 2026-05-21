/**
 * Superfícies do painel — alinhar com DashboardShell (#020403 fundo, #080c0a cards, primary verde).
 * Use com useTheme() em componentes com cores fixas (não confiar só em overrides globais de .bg-white).
 */
export function getDashboardSurfaces(isDark: boolean) {
  return {
    page: isDark ? "bg-[#020403]" : "bg-gray-50",
    card: isDark ? "bg-[#080c0a] border-white/[0.08]" : "bg-white border-gray-200",
    cardInset: isDark ? "bg-[#020403] border-white/[0.06]" : "bg-gray-50 border-gray-100",
    header: isDark ? "bg-[#080c0a] border-white/5" : "bg-white border-gray-200",
    title: isDark ? "text-white" : "text-gray-900",
    subtitle: isDark ? "text-gray-400" : "text-gray-600",
    muted: isDark ? "text-gray-500" : "text-gray-500",
    label: isDark ? "text-gray-300" : "text-gray-700",
    input: isDark
      ? "bg-[#020403] border-white/10 text-white placeholder:text-gray-500"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400",
    btnSecondary: isDark
      ? "border-white/10 bg-white/[0.06] text-white hover:bg-white/10"
      : "border-gray-200 bg-gray-100 text-gray-900 hover:bg-gray-200",
    btnGhost: isDark
      ? "bg-white/[0.06] text-gray-200 hover:bg-white/10"
      : "bg-gray-100 text-gray-800 hover:bg-gray-200",
    closeBtn: isDark
      ? "border-white/10 bg-white/[0.06] text-gray-300 hover:bg-white/10 hover:text-white"
      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100",
  };
}
