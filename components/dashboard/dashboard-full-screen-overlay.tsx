"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  useRegisterDashboardHotkeys,
  type DashboardHotkeyHandlers,
} from "@/lib/dashboard-hotkeys";
import { useAppAlert } from "@/components/app-alert-provider";

const FullScreenOverlayRequestCloseContext = createContext<(() => Promise<void>) | null>(null);

/** Para botões “Cancelar” / fechar dentro do overlay usar isto em vez de `onClose` direto (respeita alterações não salvas). */
export function useFullScreenOverlayRequestClose(): () => Promise<void> {
  const fn = useContext(FullScreenOverlayRequestCloseContext);
  return (
    fn ??
    (async () => {
      /* noop - fora do overlay */
    })
  );
}

export type DashboardFullScreenOverlayProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Bloco opcional logo abaixo do título (ex.: erro) */
  banner?: ReactNode;
  className?: string;
  /** Largura máxima da área rolável (default ~1152px) */
  contentMaxWidthClass?: string;
  /** Fecha com Escape (default true) */
  closeOnEscape?: boolean;
  /** Desktop (lg+): Alt+S / Alt+C quando definidos */
  hotkeys?: DashboardHotkeyHandlers;
  /** Se true, fechar (X, Esc, Alt+C) pergunta salvar / descartar / continuar */
  dirty?: boolean;
  /** Chamado quando o usuário escolhe “Salvar” no diálogo; deve persistir e devolver se salvou com sucesso */
  onSaveBeforeClose?: () => Promise<boolean>;
  /** Impede fechamento (ex.: salvando) - também ignorado o diálogo de alterações */
  closeBlocked?: boolean;
};

/**
 * Painel em tela cheia para formulários do dashboard (mobile e desktop).
 * Respeita `data-theme` do shell (globals.css).
 */
export function DashboardFullScreenOverlay({
  title,
  subtitle,
  onClose,
  children,
  footer,
  banner,
  className,
  contentMaxWidthClass = "max-w-6xl",
  closeOnEscape = true,
  hotkeys,
  dirty = false,
  onSaveBeforeClose,
  closeBlocked = false,
}: DashboardFullScreenOverlayProps) {
  const titleId = useId();
  const overlayHotkeyId = `fullscreen-overlay-${titleId}`;
  const { showUnsavedChangesPrompt } = useAppAlert();

  const onCloseRef = useRef(onClose);
  const onSaveBeforeCloseRef = useRef(onSaveBeforeClose);
  onCloseRef.current = onClose;
  onSaveBeforeCloseRef.current = onSaveBeforeClose;

  const requestClose = useCallback(async () => {
    if (closeBlocked) return;
    if (typeof document !== "undefined" && document.querySelector("[data-app-alert-dialog]")) return;

    if (!dirty) {
      onCloseRef.current();
      return;
    }

    const choice = await showUnsavedChangesPrompt({
      title: "Sair sem salvar?",
      message:
        "Existem alterações neste formulário. Você pode salvar antes de sair, descartá-las ou continuar editando.",
    });

    if (choice === "cancel") return;

    if (choice === "discard") {
      onCloseRef.current();
      return;
    }

    const saveFn = onSaveBeforeCloseRef.current;
    if (!saveFn) {
      onCloseRef.current();
      return;
    }
    const ok = await saveFn();
    if (ok) onCloseRef.current();
  }, [closeBlocked, dirty, showUnsavedChangesPrompt]);

  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  const mergedHotkeys = useMemo((): DashboardHotkeyHandlers => {
    if (!hotkeys) return {};
    return {
      save: hotkeys.save,
      cancel: () => void requestCloseRef.current(),
      novo: hotkeys.novo,
      focusSearch: hotkeys.focusSearch,
    };
  }, [hotkeys]);

  const hotkeysActive = Boolean(
    hotkeys && (hotkeys.save || hotkeys.cancel || hotkeys.novo || hotkeys.focusSearch)
  );

  useRegisterDashboardHotkeys(hotkeysActive, overlayHotkeyId, mergedHotkeys);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.querySelector("[data-app-alert-dialog]")) return;
      e.preventDefault();
      void requestCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeOnEscape]);

  return (
    <FullScreenOverlayRequestCloseContext.Provider value={requestClose}>
      <div
        className={cn(
          "fixed inset-0 z-[70] flex min-h-0 min-w-0 flex-col bg-gray-50 text-left",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header
          className={cn(
            "sticky top-0 z-10 flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6",
            "pt-[max(1rem,env(safe-area-inset-top))]"
          )}
        >
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-lg font-bold text-gray-900 sm:text-xl">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm leading-snug text-gray-500">{subtitle}</p>
            ) : null}
            {banner ? <div className="mt-3">{banner}</div> : null}
          </div>
          <button
            type="button"
            onClick={() => void requestClose()}
            disabled={closeBlocked}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className={cn("mx-auto w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8", contentMaxWidthClass)}>
            {children}
          </div>
        </div>

        {footer ? (
          <footer
            className={cn(
              "sticky bottom-0 z-10 shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6",
              "pb-[max(1rem,env(safe-area-inset-bottom))]"
            )}
          >
            <div
              className={cn(
                "mx-auto flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end",
                contentMaxWidthClass
              )}
            >
              {footer}
            </div>
          </footer>
        ) : null}
      </div>
    </FullScreenOverlayRequestCloseContext.Provider>
  );
}
