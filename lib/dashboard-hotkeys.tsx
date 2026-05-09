"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";

/** Handlers para atalhos só em viewport lg+ (teclado no PC). Alt+tecla; evita Ctrl/Meta para não brigara com o SO/navegador. */
export type DashboardHotkeyHandlers = {
  save?: () => void;
  cancel?: () => void;
  novo?: () => void;
  /** Foco no campo de busca principal da página */
  focusSearch?: () => void;
};

type StackEntry = {
  id: string;
  ref: MutableRefObject<DashboardHotkeyHandlers>;
};

type HotkeyContextValue = {
  push: (id: string, slot: MutableRefObject<DashboardHotkeyHandlers>) => void;
  pop: (id: string) => void;
};

const DashboardHotkeyContext = createContext<HotkeyContextValue | null>(null);

export function DashboardHotkeyProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<StackEntry[]>([]);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const push = useCallback((id: string, slot: MutableRefObject<DashboardHotkeyHandlers>) => {
    setStack((s) => [...s.filter((e) => e.id !== id), { id, ref: slot }]);
  }, []);

  const pop = useCallback((id: string) => {
    setStack((s) => s.filter((e) => e.id !== id));
  }, []);

  const desktopOkRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      desktopOkRef.current = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!desktopOkRef.current) return;
      if (!e.altKey || e.ctrlKey || e.metaKey) return;

      const k = e.key.toLowerCase();
      if (k !== "s" && k !== "c" && k !== "n" && k !== "u") return;

      const st = stackRef.current;
      for (let i = st.length - 1; i >= 0; i--) {
        const h = st[i].ref.current;
        if (k === "s" && h.save) {
          e.preventDefault();
          e.stopPropagation();
          h.save();
          return;
        }
        if (k === "c" && h.cancel) {
          e.preventDefault();
          e.stopPropagation();
          h.cancel();
          return;
        }
        if (k === "n" && h.novo) {
          e.preventDefault();
          e.stopPropagation();
          h.novo();
          return;
        }
        if (k === "u" && h.focusSearch) {
          e.preventDefault();
          e.stopPropagation();
          h.focusSearch();
          return;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const value = useMemo(() => ({ push, pop }), [push, pop]);

  return <DashboardHotkeyContext.Provider value={value}>{children}</DashboardHotkeyContext.Provider>;
}

/**
 * Registra atalhos nesta “camada”. Vários componentes empilham: o último registrado ganha prioridade (ex.: modal sobre a lista).
 */
export function useRegisterDashboardHotkeys(enabled: boolean, id: string, handlers: DashboardHotkeyHandlers) {
  const ctx = useContext(DashboardHotkeyContext);
  const slot = useRef<DashboardHotkeyHandlers>(handlers);
  slot.current = handlers;

  useEffect(() => {
    if (!ctx) return;
    if (!enabled) {
      ctx.pop(id);
      return;
    }
    ctx.push(id, slot);
    return () => ctx.pop(id);
  }, [ctx, enabled, id]);
}

function useAltLabel() {
  const [altLabel, setAltLabel] = useState("Alt");
  useEffect(() => {
    const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
    setAltLabel(mac ? "⌥" : "Alt");
  }, []);
  return altLabel;
}

type HotkeyHintProps = {
  action: "save" | "cancel" | "novo" | "focusFind";
  /** Botão primário (verde #primary): contraste com o preto do botão. */
  variant?: "primary" | "neutral";
  /**
   * `floating-end`: fixa o chip à direita do botão pai (`relative` + `lg:pr-[4.75rem]` recomendado).
   * Evita atalho “colado” na borda em botões full-width com texto centralizado.
   */
  layout?: "inline" | "floating-end";
};

/**
 * Atalho visual (só `lg+`). Chip único alinhado ao `data-theme` do dashboard.
 */
export function HotkeyHint({ action, variant = "neutral", layout = "inline" }: HotkeyHintProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const altLabel = useAltLabel();
  const letter =
    action === "save"
      ? "S"
      : action === "cancel"
        ? "C"
        : action === "novo"
          ? "N"
          : "U";

  const chipClass = cn(
    "hidden select-none items-center gap-1.5 lg:inline-flex",
    layout === "inline" && "shrink-0",
    layout === "floating-end" && "absolute right-2.5 top-1/2 z-[1] -translate-y-1/2 sm:right-3",
    "rounded-lg border px-2.5 py-1 font-sans text-xs font-semibold leading-none tabular-nums tracking-tight",
    "transition-[color,background-color,border-color] duration-150",
    variant === "primary"
      ? "border-black/25 bg-black/[0.14] text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[2px]"
      : isDark
        ? "border-white/[0.14] bg-white/[0.07] text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        : "border-gray-200 bg-gray-100/95 text-gray-600 shadow-sm shadow-gray-900/[0.04]",
  );

  return (
    <span className={chipClass} aria-hidden>
      <kbd className="pointer-events-none font-[inherit] text-[inherit]">{altLabel}</kbd>
      <span className="text-[0.7rem] font-medium opacity-40" aria-hidden>
        +
      </span>
      <kbd className="pointer-events-none min-w-[0.75rem] text-center font-[inherit] text-[inherit]">{letter}</kbd>
    </span>
  );
}
