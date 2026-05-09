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

/** Painel tela cheia (mobile e desktop); tema escuro fixo para contraste sobre qualquer página. */
const panelClass =
  "relative z-[1] mt-auto flex w-full max-h-[96dvh] min-h-[80dvh] flex-1 flex-col overflow-hidden rounded-t-2xl border border-white/10 border-b-0 bg-[#14221A] shadow-[0_-12px_48px_rgba(0,0,0,0.45)] outline-none animate-fade-in sm:mt-0 sm:h-[100dvh] sm:max-h-none sm:min-h-0 sm:rounded-none sm:border-0 sm:shadow-none";

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [phraseInput, setPhraseInput] = useState("");
  const [mounted, setMounted] = useState(false);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

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
          modal.type === "unsaved" ||
            (modal.type === "confirm" && modal.presentation === "dialog")
            ? "items-center justify-center p-4 sm:p-6"
            : ""
        )}
        data-app-alert-dialog=""
      >
        <button
          type="button"
          className="absolute inset-0 z-0 bg-black/55 backdrop-blur-[2px] transition-opacity"
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
          <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} className={panelClass}>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10 sm:pb-8 sm:pt-10">
              <h2 id={titleId} className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {modal.title}
              </h2>
              <p className="mt-4 max-w-prose text-base leading-relaxed text-gray-300 whitespace-pre-wrap break-words sm:text-lg">
                {modal.message}
              </p>
            </div>
            <div className="flex shrink-0 justify-stretch border-t border-white/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-6">
              <button
                ref={primaryBtnRef}
                type="button"
                onClick={closeAlert}
                className="min-h-12 w-full rounded-xl bg-primary px-6 text-base font-bold text-black transition-opacity hover:opacity-90 active:opacity-80 sm:min-h-11 sm:max-w-xs sm:mx-auto"
              >
                OK
              </button>
            </div>
          </div>
        ) : modal.type === "confirm" && modal.presentation === "sheet" ? (
          <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} className={panelClass}>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10 sm:pb-8 sm:pt-10">
              <h2 id={titleId} className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {modal.title}
              </h2>
              <p className="mt-4 max-w-prose text-base leading-relaxed text-gray-300 whitespace-pre-wrap break-words sm:text-lg">
                {modal.message}
              </p>
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-white/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-10 sm:py-6">
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="min-h-12 w-full rounded-xl border border-white/20 px-5 text-base font-semibold text-white hover:bg-white/5 sm:w-auto sm:min-w-[140px]"
              >
                {modal.cancelLabel}
              </button>
              <button
                ref={primaryBtnRef}
                type="button"
                onClick={handleConfirmOk}
                className={cn(
                  "min-h-12 w-full rounded-xl px-6 text-base font-bold transition-opacity sm:w-auto sm:min-w-[160px]",
                  modal.variant === "danger"
                    ? "bg-red-600 text-white hover:opacity-90"
                    : "bg-primary text-black hover:opacity-90"
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
            className="relative z-[2] w-[min(100%,26rem)] rounded-2xl border border-white/12 bg-[#14221A] shadow-[0_24px_80px_rgba(0,0,0,0.55)] outline-none animate-fade-in"
          >
            <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
              <h2 id={titleId} className="text-lg font-bold tracking-tight text-white sm:text-xl">
                {modal.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-300 whitespace-pre-wrap break-words">
                {modal.message}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:pb-5">
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="min-h-11 w-full rounded-xl border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/5 sm:w-auto sm:min-w-[120px]"
              >
                {modal.cancelLabel}
              </button>
              <button
                ref={primaryBtnRef}
                type="button"
                onClick={handleConfirmOk}
                className={cn(
                  "min-h-11 w-full rounded-xl px-5 text-sm font-bold transition-opacity sm:w-auto sm:min-w-[140px]",
                  modal.variant === "danger"
                    ? "bg-red-600 text-white hover:opacity-90"
                    : "bg-primary text-black hover:opacity-90"
                )}
              >
                {modal.confirmLabel}
              </button>
            </div>
          </div>
        ) : modal.type === "unsaved" ? (
          <div
            className="relative z-[2] flex min-h-0 w-[min(100%,26rem)] flex-col rounded-2xl border border-white/12 bg-[#14221A] shadow-[0_24px_80px_rgba(0,0,0,0.55)] outline-none animate-fade-in"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
              <h2 id={titleId} className="text-lg font-bold tracking-tight text-white">
                {modal.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-300">{modal.message}</p>
              <p className="mt-2 text-xs text-gray-500">
                <kbd className="rounded border border-white/15 px-1 py-0.5 font-mono text-[11px] text-gray-400">Esc</kbd>{" "}
                continua editando
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:flex-wrap sm:justify-end sm:px-6">
              <button
                ref={primaryBtnRef}
                type="button"
                onClick={handleUnsavedCancel}
                className="min-h-11 w-full rounded-xl border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/5 sm:w-auto sm:min-w-[9rem]"
              >
                {modal.cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleUnsavedDiscard}
                className="min-h-11 w-full rounded-xl border border-red-500/45 bg-red-950/35 px-4 text-sm font-semibold text-red-100 hover:bg-red-950/55 sm:w-auto sm:min-w-[8rem]"
              >
                {modal.discardLabel}
              </button>
              <button
                type="button"
                onClick={handleUnsavedSave}
                className="min-h-11 w-full rounded-xl bg-primary px-5 text-sm font-bold text-black transition-opacity hover:opacity-90 sm:w-auto sm:min-w-[8rem]"
              >
                {modal.saveLabel}
              </button>
            </div>
          </div>
        ) : modal.type === "phrase" ? (
          <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} className={panelClass}>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10 sm:pb-8 sm:pt-10">
              <h2 id={titleId} className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {modal.title}
              </h2>
              <p className="mt-4 max-w-prose text-base leading-relaxed text-gray-300 whitespace-pre-wrap break-words sm:text-lg">
                {modal.message}
              </p>
              <label className="mt-6 block max-w-md">
                <span className="text-xs font-medium text-gray-400">{modal.inputPlaceholder}</span>
                <input
                  type="text"
                  value={phraseInput}
                  onChange={(e) => setPhraseInput(e.target.value)}
                  autoComplete="off"
                  className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-base text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={modal.phrase}
                />
              </label>
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-white/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-10 sm:py-6">
              <button
                type="button"
                onClick={handlePhraseCancel}
                className="min-h-12 w-full rounded-xl border border-white/20 px-5 text-base font-semibold text-white hover:bg-white/5 sm:w-auto sm:min-w-[140px]"
              >
                {modal.cancelLabel}
              </button>
              <button
                ref={primaryBtnRef}
                type="button"
                disabled={phraseInput.trim() !== modal.phrase}
                onClick={handlePhraseOk}
                className="min-h-12 w-full rounded-xl bg-red-600 px-6 text-base font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-[160px]"
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
