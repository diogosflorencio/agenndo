/**
 * Superfícies do painel - alinhar com DashboardShell (#020403 fundo, #080c0a cards, primary verde).
 * Use com useTheme() em componentes com cores fixas (não confiar só em overrides globais de .bg-white).
 */
export function getDashboardSurfaces(isDark: boolean) {
  const panelDark = "rounded-xl border border-primary/10 bg-[#080c0a]";
  const panelLight = "rounded-xl border border-gray-200 bg-white shadow-sm";

  return {
    page: isDark ? "bg-[#020403]" : "bg-gray-50",
    /** Painel padrão (listagens, filtros, tabelas, cards). */
    panel: isDark ? panelDark : panelLight,
    card: isDark ? panelDark : panelLight,
    cardInset: isDark
      ? "rounded-xl border border-white/[0.06] bg-[#020403]"
      : "rounded-xl border border-gray-100 bg-gray-50",
    header: isDark ? "bg-[#080c0a] border-white/5" : "bg-white border-gray-200",
    title: isDark ? "text-white" : "text-gray-900",
    subtitle: isDark ? "text-gray-400" : "text-gray-600",
    muted: isDark ? "text-gray-500" : "text-gray-500",
    label: isDark ? "text-gray-300" : "text-gray-700",
    input: isDark
      ? "bg-[#020403] border-primary/10 text-white placeholder:text-gray-500"
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
    /** Card informativo (estilo “Resumo rápido”) - mesmo fundo escuro, borda verde suave. */
    accentCard: isDark ? panelDark : "rounded-xl border border-primary/20 bg-primary/[0.04]",
    accentCardTitle: isDark ? "font-semibold text-white" : "font-semibold text-gray-900",
    accentCardBody: isDark ? "text-gray-300" : "text-gray-700",
    accentIcon: "text-primary",
    accentBadge:
      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-primary/15 text-primary border border-primary/20",
    accentBadgeMuted: isDark
      ? "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-white/5 text-gray-500 border border-white/10"
      : "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-gray-500/10 text-gray-500",
    accentSelected: isDark
      ? "border-primary/20 bg-[#080c0a] ring-1 ring-primary/15"
      : "border-primary/35 bg-primary/10 ring-2 ring-primary/35",
    /** Card de serviço/listagem - mesmo padrão do painel. */
    serviceCard: isDark
      ? `${panelDark} overflow-hidden hover:border-primary/18 transition-all`
      : "rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-gray-300 transition-all shadow-sm",
    serviceCardMedia: isDark
      ? "rounded-lg overflow-hidden bg-white/[0.04] border border-primary/12"
      : "rounded-lg overflow-hidden bg-gray-100 border border-gray-200/80",
    serviceCardActions: isDark
      ? "grid grid-cols-3 gap-px bg-white/[0.03] border-t border-primary/10"
      : "grid grid-cols-3 gap-px bg-gray-100 border-t border-gray-200",
    serviceCardActionBtn: isDark
      ? "bg-[#080c0a] hover:bg-primary/10 text-gray-400 hover:text-gray-200"
      : "bg-white hover:bg-gray-50 text-gray-600",
    /** Linha clicável (lista de serviços, opções). */
    listRow: isDark
      ? "flex flex-row items-center gap-3 p-3 rounded-xl border text-left transition-all border-primary/10 bg-[#080c0a] hover:border-primary/18 hover:-translate-y-0.5"
      : "flex flex-row items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white text-left transition-all hover:border-primary/30 hover:shadow-sm",
  };
}
