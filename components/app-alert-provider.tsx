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

type ShowOptions = { title?: string };

type AlertContextValue = {
  showAlert: (message: string, options?: ShowOptions) => void;
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
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("Aviso");
  const [mounted, setMounted] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const showAlert = useCallback((msg: string, options?: ShowOptions) => {
    setMessage(msg);
    setTitle(options?.title?.trim() || "Aviso");
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  const dialog =
    open ? (
      <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center p-4 sm:p-6">
        <button
          type="button"
          className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity"
          aria-label="Fechar"
          onClick={handleClose}
        />
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative mb-[max(0px,env(safe-area-inset-bottom))] sm:mb-0 w-full max-w-[min(100%,24rem)] rounded-2xl border border-white/10 bg-[#14221A] shadow-2xl shadow-black/50 outline-none ring-1 ring-white/5 animate-fade-in"
        >
          <div className="px-5 pt-5 pb-1 sm:px-6 sm:pt-6 max-h-[min(70vh,28rem)] overflow-y-auto overscroll-contain">
            <h2 id={titleId} className="text-base font-semibold text-white tracking-tight">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-300 whitespace-pre-wrap break-words">
              {message}
            </p>
          </div>
          <div className="flex justify-stretch sm:justify-end px-5 py-4 sm:px-6 border-t border-white/10">
            <button
              ref={closeBtnRef}
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto min-h-11 min-w-[5.5rem] px-6 rounded-xl bg-primary text-black text-sm font-bold hover:opacity-90 active:opacity-80 transition-opacity"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <AppAlertContext.Provider value={{ showAlert }}>
      {children}
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </AppAlertContext.Provider>
  );
}
