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
import { getDashboardDialogUi } from "@/lib/dashboard-dialog-ui";
import { useTheme } from "@/lib/theme-context";
import {
  useRegisterDashboardHotkeys,
  type DashboardHotkeyHandlers,
} from "@/lib/dashboard-hotkeys";
import { useAppAlert } from "@/components/app-alert-provider";

const DialogRequestCloseContext = createContext<(() => Promise<void>) | null>(null);

export function useDashboardDialogRequestClose(): () => Promise<void> {
  const fn = useContext(DialogRequestCloseContext);
  return (
    fn ??
    (async () => {
      /* fora do diálogo */
    })
  );
}

export type DashboardDialogProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClass?: string;
  closeOnEscape?: boolean;
  closeBlocked?: boolean;
  dirty?: boolean;
  onSaveBeforeClose?: () => Promise<boolean>;
  hotkeys?: DashboardHotkeyHandlers;
};

export function DashboardDialog({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidthClass = "max-w-lg",
  closeOnEscape = true,
  closeBlocked = false,
  dirty = false,
  onSaveBeforeClose,
  hotkeys,
}: DashboardDialogProps) {
  const titleId = useId();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const ui = getDashboardDialogUi(isDark);
  const { showUnsavedChangesPrompt } = useAppAlert();
  const overlayHotkeyId = `dashboard-dialog-${titleId}`;

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
    open && hotkeys && (hotkeys.save || hotkeys.cancel || hotkeys.novo || hotkeys.focusSearch)
  );

  useRegisterDashboardHotkeys(hotkeysActive, overlayHotkeyId, mergedHotkeys);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [open, dirty]);

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.querySelector("[data-app-alert-dialog]")) return;
      e.preventDefault();
      void requestCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeOnEscape]);

  if (!open) return null;

  return (
    <DialogRequestCloseContext.Provider value={requestClose}>
      <div
        className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6"
        role="presentation"
      >
        <button
          type="button"
          className={cn("absolute inset-0", ui.backdrop)}
          aria-label="Fechar"
          onClick={() => void requestClose()}
        />
        <div
          className={cn(
            "relative flex w-full flex-col max-h-[min(92dvh,640px)] rounded-t-2xl sm:rounded-2xl border",
            maxWidthClass,
            ui.panel
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
        >
          <header
            className={cn(
              "flex shrink-0 items-start justify-between gap-3 border-b px-4 py-4 sm:px-5",
              ui.header,
              "pt-[max(1rem,env(safe-area-inset-top))] sm:pt-4"
            )}
          >
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className={cn("text-base font-bold sm:text-lg", ui.title)}>
                {title}
              </h2>
              {subtitle ? (
                <p className={cn("mt-1 text-sm leading-snug", ui.subtitle)}>{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void requestClose()}
              disabled={closeBlocked}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-40",
                ui.closeBtn
              )}
              aria-label="Fechar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
            {children}
          </div>

          {footer ? (
            <footer
              className={cn(
                "shrink-0 border-t px-4 py-3 sm:px-5 sm:py-4",
                ui.footer,
                "pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4"
              )}
            >
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                {footer}
              </div>
            </footer>
          ) : null}
        </div>
      </div>
    </DialogRequestCloseContext.Provider>
  );
}
