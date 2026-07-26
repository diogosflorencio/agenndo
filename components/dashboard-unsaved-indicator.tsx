"use client";

import { cn } from "@/lib/utils";

/** Barra compacta: há edição local ainda não persistida (use junto de um botão Salvar). */
export function UnsavedChangesIndicator({
  dirty,
  className,
  variant = "banner",
}: {
  dirty: boolean;
  className?: string;
  variant?: "banner" | "inline";
}) {
  if (!dirty) return null;
  if (variant === "inline") {
    return (
      <span
        className={cn(
          "dashboard-status-warning inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
          className
        )}
      >
        <span className="size-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden />
        Pendente
      </span>
    );
  }
  return (
    <div
      role="status"
      className={cn(
        "dashboard-status-warning flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm",
        className
      )}
    >
      <span className="size-2 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.6)]" aria-hidden />
      <div>
        <p className="font-semibold leading-tight">Alterações não salvas</p>
        <p className="dashboard-status-warning-sub text-xs mt-0.5 leading-snug">
          Salve para aplicar no servidor. Se sair sem salvar, perde o que editou aqui.
        </p>
      </div>
    </div>
  );
}
