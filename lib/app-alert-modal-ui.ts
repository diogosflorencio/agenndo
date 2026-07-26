import { getDashboardDialogUi } from "@/lib/dashboard-dialog-ui";

/** Tokens visuais dos modais globais (alertas, confirmações, alterações não salvas). */
export function getAppAlertModalUi(isDark: boolean) {
  const d = getDashboardDialogUi(isDark);
  const footerBorder = isDark ? "border-white/10" : "border-gray-200";
  const kbd = isDark
    ? "rounded border border-white/15 px-1 py-0.5 font-mono text-[11px] text-gray-400"
    : "rounded border border-gray-300 bg-gray-50 px-1 py-0.5 font-mono text-[11px] text-gray-500";
  const discardBtn = isDark
    ? "border-red-500/45 bg-red-950/35 text-red-100 hover:bg-red-950/55"
    : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100";

  return {
    ...d,
    dialogCard:
      "relative z-[2] w-[min(100%,26rem)] rounded-2xl outline-none animate-fade-in shadow-xl " +
      (isDark ? "shadow-[0_24px_80px_-12px_rgba(0,0,0,0.75)]" : ""),
    panel: d.panel,
    title: d.title,
    message: d.subtitle,
    hint: d.muted,
    body: "px-5 pt-5 pb-4 sm:px-6 sm:pt-6",
    footer: `border-t ${footerBorder} px-5 py-4 sm:px-6 sm:pb-5`,
    footerRow: `flex flex-col-reverse gap-2 border-t ${footerBorder} px-5 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:pb-5`,
    footerUnsaved: `flex flex-col-reverse gap-2 border-t ${footerBorder} px-5 py-4 sm:flex-row sm:flex-wrap sm:justify-end sm:px-6`,
    iconWrap:
      "size-10 shrink-0 flex items-center justify-center rounded-xl border border-primary/20 bg-primary/10",
    icon: "material-symbols-outlined text-xl text-primary",
    btnPrimary:
      "min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-on-brand-accent transition-opacity hover:opacity-90 active:opacity-80",
    btnPrimaryWide: "min-h-11 w-full rounded-xl bg-primary px-6 text-sm font-bold text-on-brand-accent transition-opacity hover:opacity-90 active:opacity-80",
    btnCancel: `min-h-11 rounded-xl border px-4 text-sm font-semibold ${d.btnSecondary}`,
    btnCancelWide: `min-h-11 w-full rounded-xl border px-4 text-sm font-semibold sm:w-auto sm:min-w-[120px] ${d.btnSecondary}`,
    btnDanger: "min-h-11 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition-opacity hover:opacity-90",
    btnDiscard: `min-h-11 w-full rounded-xl border px-4 text-sm font-semibold sm:w-auto sm:min-w-[8rem] ${discardBtn}`,
    sheetPanel: [
      "relative z-[1] mt-auto flex w-full max-h-[96dvh] min-h-[80dvh] flex-1 flex-col overflow-hidden rounded-t-2xl outline-none animate-fade-in",
      "sm:mt-0 sm:h-[100dvh] sm:max-h-none sm:min-h-0 sm:rounded-none sm:border-0 sm:shadow-none",
      isDark
        ? "border border-white/10 border-b-0 bg-[#080c0a] shadow-[0_-12px_48px_rgba(0,0,0,0.45)]"
        : "border border-gray-200 border-b-0 bg-white shadow-[0_-12px_48px_rgba(0,0,0,0.12)]",
    ].join(" "),
    sheetBody:
      "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10 sm:pb-8 sm:pt-10",
    sheetFooter: `flex shrink-0 flex-col-reverse gap-3 border-t ${footerBorder} px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-10 sm:py-6`,
    sheetTitle: isDark ? "text-xl font-bold tracking-tight text-white sm:text-2xl" : "text-xl font-bold tracking-tight text-gray-900 sm:text-2xl",
    sheetMessage: isDark
      ? "mt-4 max-w-prose text-base leading-relaxed text-gray-300 whitespace-pre-wrap break-words sm:text-lg"
      : "mt-4 max-w-prose text-base leading-relaxed text-gray-600 whitespace-pre-wrap break-words sm:text-lg",
    inputLabel: d.label,
    input: `mt-2 w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 ${d.input}`,
    kbd,
  };
}
