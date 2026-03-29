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

type ModalState =
  | { type: "alert"; title: string; message: string }
  | {
      type: "confirm";
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      variant: "default" | "danger";
      resolve: (v: boolean) => void;
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
};

const AppAlertContext = createContext<AlertContextValue | null>(null);

export function useAppAlert() {
  const ctx = useContext(AppAlertContext);
  if (!ctx) {
    throw new Error("useAppAlert must be used within AppAlertProvider");
  }
  return ctx;
}

const shellClass =
  "relative mb-[max(0px,env(safe-area-inset-bottom))] sm:mb-0 w-full max-w-[min(100%,24rem)] rounded-2xl border border-white/10 bg-[#14221A] shadow-2xl shadow-black/50 outline-none ring-1 ring-white/5 animate-fade-in";

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
        if (modal.type === "alert") {
          setModal(null);
        } else {
          modal.resolve(false);
          setModal(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
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

  const closeAlert = useCallback(() => setModal(null), []);

  const handleConfirmCancel = useCallback(() => {
    if (!modal || modal.type === "alert") return;
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

  const dialog =
    modal && mounted ? (
      <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center p-4 sm:p-6">
        <button
          type="button"
          className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity"
          aria-label="Fechar"
          onClick={() => {
            if (modal.type === "alert") closeAlert();
            else {
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
            className={shellClass}
          >
            <div className="px-5 pt-5 pb-1 sm:px-6 sm:pt-6 max-h-[min(70vh,28rem)] overflow-y-auto overscroll-contain">
              <h2 id={titleId} className="text-base font-semibold text-white tracking-tight">
                {modal.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-300 whitespace-pre-wrap break-words">
                {modal.message}
              </p>
            </div>
            <div className="flex justify-stretch sm:justify-end px-5 py-4 sm:px-6 border-t border-white/10">
              <button
                ref={primaryBtnRef}
                type="button"
                onClick={closeAlert}
                className="w-full sm:w-auto min-h-11 min-w-[5.5rem] px-6 rounded-xl bg-primary text-black text-sm font-bold hover:opacity-90 active:opacity-80 transition-opacity"
              >
                OK
              </button>
            </div>
          </div>
        ) : modal.type === "confirm" ? (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={shellClass}
          >
            <div className="px-5 pt-5 pb-1 sm:px-6 sm:pt-6 max-h-[min(70vh,28rem)] overflow-y-auto overscroll-contain">
              <h2 id={titleId} className="text-base font-semibold text-white tracking-tight">
                {modal.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-300 whitespace-pre-wrap break-words">
                {modal.message}
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-4 sm:px-6 border-t border-white/10">
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="w-full sm:w-auto min-h-11 px-5 rounded-xl border border-white/20 text-white text-sm font-semibold hover:bg-white/5"
              >
                {modal.cancelLabel}
              </button>
              <button
                ref={primaryBtnRef}
                type="button"
                onClick={handleConfirmOk}
                className={cn(
                  "w-full sm:w-auto min-h-11 min-w-[5.5rem] px-6 rounded-xl text-sm font-bold transition-opacity",
                  modal.variant === "danger"
                    ? "bg-red-600 text-white hover:opacity-90"
                    : "bg-primary text-black hover:opacity-90"
                )}
              >
                {modal.confirmLabel}
              </button>
            </div>
          </div>
        ) : (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={shellClass}
          >
            <div className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6 max-h-[min(70vh,28rem)] overflow-y-auto overscroll-contain">
              <h2 id={titleId} className="text-base font-semibold text-white tracking-tight">
                {modal.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-300 whitespace-pre-wrap break-words">
                {modal.message}
              </p>
              <label className="block mt-4">
                <span className="text-[11px] font-medium text-gray-400">{modal.inputPlaceholder}</span>
                <input
                  type="text"
                  value={phraseInput}
                  onChange={(e) => setPhraseInput(e.target.value)}
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={modal.phrase}
                />
              </label>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-4 sm:px-6 border-t border-white/10">
              <button
                type="button"
                onClick={handlePhraseCancel}
                className="w-full sm:w-auto min-h-11 px-5 rounded-xl border border-white/20 text-white text-sm font-semibold hover:bg-white/5"
              >
                {modal.cancelLabel}
              </button>
              <button
                ref={primaryBtnRef}
                type="button"
                disabled={phraseInput.trim() !== modal.phrase}
                onClick={handlePhraseOk}
                className="w-full sm:w-auto min-h-11 min-w-[5.5rem] px-6 rounded-xl bg-red-600 text-white text-sm font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {modal.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    ) : null;

  return (
    <AppAlertContext.Provider value={{ showAlert, showConfirm, showPhraseConfirm }}>
      {children}
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </AppAlertContext.Provider>
  );
}
