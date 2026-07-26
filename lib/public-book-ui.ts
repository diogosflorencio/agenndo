import { cn } from "@/lib/utils";

/** Centraliza emoji/ícone dentro de caixa com tamanho fixo (não usar `size-full` aqui - conflita com `size-14` etc.). */
export const publicMediaTileClass = "flex items-center justify-center shrink-0";

export function publicEmojiClass(size: "sm" | "md" | "lg" = "md") {
  const text = { sm: "text-2xl", md: "text-[1.65rem]", lg: "text-3xl" }[size];
  return cn("inline-flex items-center justify-center leading-none select-none", text);
}

export function publicMaterialIconClass(size: "sm" | "md" | "lg" | "xl" = "md", muted = true) {
  const px = { sm: "text-[18px]", md: "text-[22px]", lg: "text-[26px]", xl: "text-[28px]" }[size];
  return cn(
    "material-symbols-outlined leading-none shrink-0",
    px,
    muted && "text-gray-500"
  );
}

/** Tokens visuais compartilhados entre home e fluxo de agendamento público. */
export function getPublicBookUi(isDark: boolean) {
  const panelDark = "rounded-xl border border-primary/10 bg-[#080c0a]";
  const panelLight = "rounded-xl border border-gray-200 bg-white shadow-sm";

  return {
    page: isDark ? "min-h-screen bg-[#020403]" : "min-h-screen bg-gray-100",
    header: isDark ? "border-white/5 bg-[#080c0a]/90" : "border-gray-200 bg-white/90",
    sticky: isDark ? "bg-[#020403]/95 border-white/5" : "bg-gray-50/95 border-gray-200",
    title: isDark ? "text-white" : "text-gray-900",
    subtitle: isDark ? "text-gray-400" : "text-gray-600",
    muted: isDark ? "text-gray-500" : "text-gray-500",
    card: isDark ? panelDark : panelLight,
    cardHover: isDark ? "hover:border-primary/18 hover:bg-[#0a100e]" : "hover:border-gray-300 hover:shadow-sm",
    input: isDark
      ? "bg-[#020403] border-primary/10 text-white placeholder-gray-600"
      : "bg-white border-gray-200 text-gray-900 placeholder-gray-400",
    bottomBar: isDark ? "bg-[#020403]/95 border-white/5" : "bg-white/95 border-gray-200",
    stepIdle: isDark ? "bg-white/5 text-gray-500" : "bg-gray-200 text-gray-500",
    stepLine: isDark ? "bg-white/10" : "bg-gray-200",
    label: isDark ? "text-gray-300" : "text-gray-700",
    chip: isDark ? "border-primary/10 bg-[#080c0a]" : "bg-gray-50 border-gray-200",
    surfaceMuted: isDark ? "bg-white/[0.04]" : "bg-gray-100",
    navBtn: isDark
      ? "bg-white/[0.06] hover:bg-white/10 text-gray-400 hover:text-white"
      : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900",
    /** Card informativo / resumo - fundo escuro, borda verde suave. */
    accentCard: isDark ? panelDark : "rounded-xl border border-primary/20 bg-primary/[0.04]",
    accentCardTitle: isDark ? "font-semibold text-white" : "font-semibold text-gray-900",
    accentCardBody: isDark ? "text-gray-300" : "text-gray-700",
    accentIcon: "text-primary",
    accentSelected: isDark
      ? "border-primary/20 bg-[#080c0a] ring-1 ring-primary/15"
      : "border-[var(--public-accent)] bg-[color-mix(in_srgb,var(--public-accent)_10%,transparent)] ring-2 ring-[color-mix(in_srgb,var(--public-accent)_35%,transparent)]",
    /** Card de serviço na listagem pública. */
    serviceCard: isDark
      ? `${panelDark} hover:border-primary/18 transition-all`
      : "rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all",
    serviceCardMedia: isDark ? "bg-white/[0.04] border-primary/12" : "bg-gray-100 border-black/5",
    listRow: isDark
      ? "flex flex-row items-center gap-3 p-3 rounded-xl border text-left transition-all border-primary/10 bg-[#080c0a] hover:border-primary/18 hover:-translate-y-0.5"
      : "flex flex-row items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white text-left transition-all hover:border-primary/30 hover:shadow-sm",
  };
}

export function getPublicHomeUi(isDark: boolean) {
  const book = getPublicBookUi(isDark);
  return {
    title: book.title,
    subtitle: book.subtitle,
    muted: book.muted,
    card: book.card,
    cardHover: book.cardHover,
    surfaceMuted: book.surfaceMuted,
  };
}
