"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const DISMISS_PREFIX = "agenndo_pwa_install_dismiss_";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PublicPwaInstallPrompt({
  slug,
  businessName,
  accentColor,
  isDark,
}: {
  slug: string;
  businessName: string;
  accentColor: string;
  isDark: boolean;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    try {
      setDismissed(localStorage.getItem(`${DISMISS_PREFIX}${slug}`) === "1");
    } catch {
      setDismissed(false);
    }
    setHydrated(true);
    return () => mq.removeEventListener("change", update);
  }, [slug]);

  useEffect(() => {
    if (!hydrated || !isMobile || isStandaloneDisplay()) return;
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [hydrated, isMobile]);

  useEffect(() => {
    if (!hydrated || !isMobile || isStandaloneDisplay()) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-public.js", { scope: "/" }).catch(() => {});
    }
  }, [hydrated, isMobile]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(`${DISMISS_PREFIX}${slug}`, "1");
    } catch {
      /* */
    }
    setDismissed(true);
    setDeferred(null);
  }, [slug]);

  const runInstall = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* */
    }
    setDeferred(null);
    dismiss();
  }, [deferred, dismiss]);

  if (!hydrated || !isMobile || isStandaloneDisplay() || dismissed) return null;

  const showIOS = isIOS() && !deferred;
  const showAndroid = Boolean(deferred);

  return (
    <div
      className={cn(
        "fixed z-[38] max-w-[min(100vw-1.5rem,20rem)] rounded-2xl border shadow-xl backdrop-blur-md p-3.5",
        "bottom-[5.25rem] left-3 sm:left-4",
        isDark ? "bg-[#0c1210]/95 border-white/10 text-white" : "bg-white/95 border-gray-200 text-gray-900"
      )}
      role="dialog"
      aria-label="Instalar atalho no celular"
    >
      <div className="flex items-start gap-2.5">
        <span
          className="material-symbols-outlined text-xl shrink-0 mt-0.5"
          style={{ color: accentColor }}
          aria-hidden
        >
          install_mobile
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[13px] font-bold leading-tight">
            Acesso rápido no celular
          </p>
          <p className={cn("text-[11px] leading-snug", isDark ? "text-white/65" : "text-gray-600")}>
            {showAndroid
              ? `Instale o atalho de ${businessName.slice(0, 36)}${businessName.length > 36 ? "…" : ""} para abrir o agendamento em tela cheia com um toque.`
              : showIOS
                ? "No iPhone/iPad: toque em Compartilhar (□↑) e em Adicionar à Tela de Início. Assim você volta ao agendamento como um app."
                : "Use o menu do navegador (⋮ ou Compartilhar) e escolha Instalar app ou Adicionar à tela inicial, se aparecer."}
          </p>
          <p className={cn("text-[10px] leading-snug", isDark ? "text-white/45" : "text-gray-500")}>
            Notificação de lembrete depende do negócio e do navegador; o atalho deixa esta página sempre à mão.
          </p>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {showAndroid && (
              <button
                type="button"
                onClick={() => void runInstall()}
                className="px-3 py-2 rounded-xl text-xs font-bold text-black"
                style={{ backgroundColor: accentColor }}
              >
                Instalar atalho
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-semibold",
                isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-800"
              )}
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className={cn(
            "shrink-0 rounded-lg p-1 -mr-1 -mt-1",
            isDark ? "hover:bg-white/10 text-white/50" : "hover:bg-gray-100 text-gray-400"
          )}
          aria-label="Fechar"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  );
}
