"use client";

import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onChange: () => void;
  className?: string;
  disabled?: boolean;
  /** Fundo quando desligado (p.ex. card escuro no tema dark) */
  trackOffClassName?: string;
};

/**
 * Interruptor estilo iOS. Faixa 48×28px, bolinha 20px, deslocamento exato (sem translate em px solto).
 */
export function SwitchToggle({
  checked,
  onChange,
  className,
  disabled,
  trackOffClassName,
}: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange()}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        checked ? "bg-primary" : trackOffClassName ?? "bg-gray-300",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
