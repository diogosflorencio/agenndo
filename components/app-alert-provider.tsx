"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { getAppAlertModalUi } from "@/lib/app-alert-modal-ui";
import { useDashboardChromeTheme } from "@/lib/use-dashboard-chrome-theme";
import { cn } from "@/lib/utils";

type ShowOptions = { title?: string };

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` = botão de confirmação vermelho */
  variant?: "default" | "danger";
  /**
   * `dialog` = cartão central (confirmações curtas).
   * `sheet` = painel alto estilo mobile (legado).
   */
  presentation?: "dialog" | "sheet";
};

export type PhraseConfirmOptions = {
  title?: string;
  message: string;
  /** Texto exato que o usuário deve digitar (ex.: EXCLUIR) */
  phrase: string;
  confirmLabel?: string;
  cancelLabel?: string;
  inputPlaceholder?: string;
};

export type UnsavedChangesChoice = "save" | "discard" | "cancel";

export type UnsavedChangesPromptOptions = {
  title?: string;
  message?: string;
  saveLabel?: string;
  discardLabel?: string;
  cancelLabel?: string;
};

type ModalState =
  | { type: "alert"; title: string; message: string }
  | {
      type: "confirm";
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      variant: "default" | "danger";
      presentation: "dialog" | "sheet";
      resolve: (v: boolean) => void;
    }
  | {
      type: "unsaved";
      title: string;
      message: string;
      saveLabel: string;
      discardLabel: string;
      cancelLabel: string;
      resolve: (v: UnsavedChangesChoice) => void;
    }
  | {
      type: "phrase";
      title: string;
      message: string;
      phrase: string;
      confirmLabel: string;
      cancelLabel: string;
      inputPlaceholder: string;
      resolve: (v: boolean) => void;
    };

type AlertContextValue = {
  showAlert: (message: string, options?: ShowOptions) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showPhraseConfirm: (options: PhraseConfirmOptions) => Promise<boolean>;
  showUnsavedChangesPrompt: (options?: UnsavedChangesPromptOptions) => Promise<UnsavedChangesChoice>;
};

const AppAlertContext = createContext<AlertContextValue | null>(null);

export function useAppAlert() {
  const ctx = useContext(AppAlertContext);
  if (!ctx) {
    throw new Error("useAppAlert must be used within AppAlertProvider");
  }
  return ctx;
}

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [phraseInput, setPhraseInput] = useState("");
  const [mounted, setMounted] = useState(false);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const { isDark: dashboardIsDark, inDashboard, brandEdgeBorder } = useDashboardChromeTheme();
  const isDark = inDashboard && dashboardIsDark;
  const ui = getAppAlertModalUi(isDark);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!modal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modal]);

  useEffect(() => {
    if (!modal || modal.type !== "phrase") return;
    setPhraseInput("");
  }, [modal]);

  useEffect(() => {
    if (!modal) return;
    const t = window.setTimeout(() => primaryBtnRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (modal.type === "alert") {
          setModal(null);
        } else if (modal.type === "unsaved") {
          modal.resolve("cancel");
          setModal(null);
        } else {
          modal.resolve(false);
          setModal(null);
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [modal]);

  const showAlert = useCallback((msg: string, options?: ShowOptions) => {
    setModal({
      type: "alert",
      message: msg,
      title: options?.title?.trim() || "Aviso",
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setModal({
        type: "confirm",
        message: options.message,
        title: options.title?.trim() || "Confirmar",
        confirmLabel: options.confirmLabel?.trim() || "Confirmar",
        cancelLabel: options.cancelLabel?.trim() || "Cancelar",
        variant: options.variant ?? "default",
        presentation: options.presentation ?? "dialog",
        resolve,
      });
    });
  }, []);

  const showPhraseConfirm = useCallback((options: PhraseConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setModal({
        type: "phrase",
        message: options.message,
        title: options.title?.trim() || "Confirmar",
        phrase: options.phrase,
        confirmLabel: options.confirmLabel?.trim() || "Confirmar",
        cancelLabel: options.cancelLabel?.trim() || "Cancelar",
        inputPlaceholder: options.inputPlaceholder?.trim() || `Digite ${options.phrase}`,
        resolve,
      });
    });
  }, []);

  const showUnsavedChangesPrompt = useCallback((options?: UnsavedChangesPromptOptions) => {
    return new Promise<UnsavedChangesChoice>((resolve) => {
      setModal({
        type: "unsaved",
        title: options?.title?.trim() || "Alterações não salvas",
        message:
          options?.message?.trim() ||
          "Você alterou este formulário. O que deseja fazer antes de sair?",
        saveLabel: options?.saveLabel?.trim() || "Salvar",
        discardLabel: options?.discardLabel?.trim() || "Descartar",
        cancelLabel: options?.cancelLabel?.trim() || "Continuar editando",
        resolve,
      });
    });
  }, []);

  const closeAlert = useCallback(() => setModal(null), []);

  const handleConfirmCancel = useCallback(() => {
    if (!modal || modal.type !== "confirm") return;
    modal.resolve(false);
    setModal(null);
  }, [modal]);

  const handleConfirmOk = useCallback(() => {
    if (!modal || modal.type !== "confirm") return;
    modal.resolve(true);
    setModal(null);
  }, [modal]);

  const handlePhraseCancel = useCallback(() => {
    if (!modal || modal.type !== "phrase") return;
    modal.resolve(false);
    setModal(null);
  }, [modal]);

  const handlePhraseOk = useCallback(() => {
    if (!modal || modal.type !== "phrase") return;
    if (phraseInput.trim() !== modal.phrase) return;
    modal.resolve(true);
    setModal(null);
  }, [modal, phraseInput]);

  const handleUnsavedCancel = useCallback(() => {
    if (!modal || modal.type !== "unsaved") return;
    modal.resolve("cancel");
    setModal(null);
  }, [modal]);

  const handleUnsavedDiscard = useCallback(() => {
    if (!modal || modal.type !== "unsaved") return;
    modal.resolve("discard");
    setModal(null);
  }, [modal]);

  const handleUnsavedSave = useCallback(() => {
    if (!modal || modal.type !== "unsaved") return;
    modal.resolve("save");
    setModal(null);
  }, [modal]);

  const dialog =
    modal && mounted ? (
      <div
        className={cn(
          "fixed inset-0 z-[300] flex min-h-[100dvh] flex-col",
          modal.type === "alert" ||
            modal.type === "unsaved" ||
            (modal.type === "confirm" && modal.presentation === "dialog")
            ? "items-center justify-center p-4 sm:p-6"
            : ""
        )}
        data-app-alert-dialog=""
        {...(inDashboard ? { "data-dashboard-brand-root": true } : {})}
        {...(inDashboard && brandEdgeBorder ? { "data-brand-edge-border": "true" } : {})}
        data-theme={isDark ? "dark" : "light"}
      >
        <button
          type="button"
          className={cn("absolute inset-0 z-0 transition-opacity", ui.backdrop)}
          aria-label="Fechar"
          onClick={() => {
            if (modal.type === "alert") closeAlert();
            else if (modal.type === "unsaved") {
              modal.resolve("cancel");
              setModal(null);
            } else {
              modal.resolve(false);
              setModal(null);
            }
          }}
        />
        {modal.type === "alert" ? (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(ui.dialogCard, ui.panel)}
          >
            <div className={ui.body}>
              <div className="mb-3 flex items-center gap-3">
                <div className={ui.iconWrap}>
                  <span className={ui.icon}>check_circle</span>
                </div>
                <h2 id={titleId} className={cn("text-lg font-bold tracking-tight", ui.title)}>
                  {modal.title}
                </h2>
              </div>
              <p className={cn("whitespace-pre-wrap break-words text-sm leading-relaxed", ui.message)}>
                {modal.message}
              </p>
            </div>
            <div className={cn("flex", ui.footer)}>
              <button ref={primaryBtnRef} type="button" onClick={closeAlert} className={ui.btnPrimaryWide}>
                OK
              </button>
            </div>
          </div>
        ) : modal.type === "confirm" && modal.presentation === "sheet" ? (
          <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} className={ui.sheetPanel}>
            <div className={ui.sheetBody}>
              <h2 id={titleId} className={ui.sheetTitle}>
                {modal.title}
              </h2>
              <p className={ui.sheetMessage}>{modal.message}</p>
            </div>
            <div className={ui.sheetFooter}>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className={cn("min-h-12 w-full sm:w-auto sm:min-w-[140px]", ui.btnCancel)}
              >
                {modal.cancelLabel}
              </button>
              <button
                ref={primaryBtnRef}
                type="button"
                onClick={handleConfirmOk}
                className={cn(
                  "min-h-12 w-full rounded-xl px-6 text-base font-bold transition-opacity sm:w-auto sm:min-w-[160px]",
                  modal.variant === "danger" ? ui.btnDanger : ui.btnPrimary,
                )}
              >
                {modal.confirmLabel}
              </button>
            </div>
          </div>
        ) : modal.type === "confirm" && modal.presentation === "dialog" ? (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(ui.dialogCard, ui.panel)}
          >
            <div className={ui.body}>
              <h2 id={titleId} className={cn("text-lg font-bold tracking-tight sm:text-xl", ui.title)}>
                {modal.title}
              </h2>
              <p className={cn("mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed", ui.message)}>
                {modal.message}
              </p>
            </div>
            <div className={ui.footerRow}>
              <button type="button" onClick={handleConfirmCancel} className={ui.btnCancelWide}>
                {modal.cancelLabel}
              </button>
              <button
                ref={primaryBtnRef}
                type="button"
                onClick={handleConfirmOk}
                className={cn(
                  "min-h-11 w-full rounded-xl px-5 text-sm font-bold transition-opacity sm:w-auto sm:min-w-[140px]",
                  modal.variant === "danger" ? ui.btnDanger : ui.btnPrimary,
                )}
              >
                {modal.confirmLabel}
              </button>
            </div>
          </div>
        ) : modal.type === "unsaved" ? (
          <div
            className={cn(ui.dialogCard, ui.panel, "flex min-h-0 flex-col")}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className={ui.body}>
              <h2 id={titleId} className={cn("text-lg font-bold tracking-tight", ui.title)}>
                {modal.title}
              </h2>
              <p className={cn("mt-3 text-sm leading-relaxed", ui.message)}>{modal.message}</p>
              <p className={cn("mt-2 text-xs", ui.hint)}>
                <kbd className={ui.kbd}>Esc</kbd> continua editando
              </p>
            </div>
            <div className={ui.footerUnsaved}>
              <button ref={primaryBtnRef} type="button" onClick={handleUnsavedCancel} className={ui.btnCancelWide}>
                {modal.cancelLabel}
              </button>
              <button type="button" onClick={handleUnsavedDiscard} className={ui.btnDiscard}>
                {modal.discardLabel}
              </button>
              <button type="button" onClick={handleUnsavedSave} className={cn(ui.btnPrimary, "w-full sm:w-auto sm:min-w-[8rem]")}>
                {modal.saveLabel}
              </button>
            </div>
          </div>
        ) : modal.type === "phrase" ? (
          <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} className={ui.sheetPanel}>
            <div className={ui.sheetBody}>
              <h2 id={titleId} className={ui.sheetTitle}>
                {modal.title}
              </h2>
              <p className={ui.sheetMessage}>{modal.message}</p>
              <label className="mt-6 block max-w-md">
                <span className={cn("text-xs font-medium", ui.inputLabel)}>{modal.inputPlaceholder}</span>
                <input
                  type="text"
                  value={phraseInput}
                  onChange={(e) => setPhraseInput(e.target.value)}
                  autoComplete="off"
                  className={ui.input}
                  placeholder={modal.phrase}
                />
              </label>
            </div>
            <div className={ui.sheetFooter}>
              <button
                type="button"
                onClick={handlePhraseCancel}
                className={cn("min-h-12 w-full sm:w-auto sm:min-w-[140px]", ui.btnCancel)}
              >
                {modal.cancelLabel}
              </button>
              <button
                ref={primaryBtnRef}
                type="button"
                disabled={phraseInput.trim() !== modal.phrase}
                onClick={handlePhraseOk}
                className={cn(
                  "min-h-12 w-full rounded-xl px-6 text-base font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-[160px]",
                  ui.btnDanger,
                )}
              >
                {modal.confirmLabel}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <AppAlertContext.Provider
      value={{ showAlert, showConfirm, showPhraseConfirm, showUnsavedChangesPrompt }}
    >
      {children}
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </AppAlertContext.Provider>
  );
}
