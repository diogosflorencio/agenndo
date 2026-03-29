"use client";

import { useMemo, useState, useEffect } from "react";
import { ArrowRight, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type WidgetContext = "landing" | "dashboard";

/** Suporte oficial da plataforma (YWP). Opcional: NEXT_PUBLIC_AGENNDO_SUPPORT_WHATSAPP (só dígitos, ex.: 5513981740870). */
const SUPPORT_NUMBER =
  process.env.NEXT_PUBLIC_AGENNDO_SUPPORT_WHATSAPP?.replace(/\D/g, "") || "5513981740870";

const LANDING_MESSAGE =
  "Olá! Tenho interesse no Agenndo e gostaria de mais informações.";
const DASHBOARD_MESSAGE =
  "Olá! Estou usando o Agenndo e tenho algumas dúvidas sobre meu painel.";

const SUPPORT_POPUP_STORAGE_KEY = "agenndo_whatsapp_support_popup";
const POPUP_OPEN_SESSION_KEY = "agenndo_whatsapp_popup_open";
const MAX_AUTO_SHOW_DAYS = 3;

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getSupportPopupState(): { dismissCount: number; lastShowDate: string } {
  if (typeof window === "undefined") return { dismissCount: 0, lastShowDate: "" };
  try {
    const raw = localStorage.getItem(SUPPORT_POPUP_STORAGE_KEY);
    if (!raw) return { dismissCount: 0, lastShowDate: "" };
    const data = JSON.parse(raw) as { dismissCount?: number; lastShowDate?: string };
    return {
      dismissCount: Math.min(Number(data.dismissCount) || 0, MAX_AUTO_SHOW_DAYS),
      lastShowDate: typeof data.lastShowDate === "string" ? data.lastShowDate : "",
    };
  } catch {
    return { dismissCount: 0, lastShowDate: "" };
  }
}

function setSupportPopupState(state: { dismissCount: number; lastShowDate: string }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SUPPORT_POPUP_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* */
  }
}

/** Auto-abrir só no dashboard: no máx. 1x/dia até 3 fechamentos no X. */
function shouldAutoShowSupportPopup(): boolean {
  const { dismissCount, lastShowDate } = getSupportPopupState();
  if (dismissCount >= MAX_AUTO_SHOW_DAYS) return false;
  const today = getToday();
  if (lastShowDate === today) return false;
  return true;
}

interface WhatsAppSupportWidgetProps {
  context: WidgetContext;
}

export function WhatsAppSupportWidget({ context }: WhatsAppSupportWidgetProps) {
  const [open, setOpen] = useState(false);
  const isLanding = context === "landing";

  useEffect(() => {
    if (context !== "dashboard" || typeof window === "undefined") return;
    if (sessionStorage.getItem(POPUP_OPEN_SESSION_KEY) === "1") setOpen(true);
  }, [context]);

  useEffect(() => {
    if (context !== "dashboard" || typeof window === "undefined") return;
    if (!shouldAutoShowSupportPopup()) return;
    setOpen(true);
    sessionStorage.setItem(POPUP_OPEN_SESSION_KEY, "1");
    const today = getToday();
    const state = getSupportPopupState();
    const timeoutId = setTimeout(() => {
      setSupportPopupState({ ...state, lastShowDate: today });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [context]);

  const handleClosePopup = () => {
    if (context === "dashboard") {
      const state = getSupportPopupState();
      const today = getToday();
      setSupportPopupState({
        dismissCount: Math.min(state.dismissCount + 1, MAX_AUTO_SHOW_DAYS),
        lastShowDate: today,
      });
      sessionStorage.removeItem(POPUP_OPEN_SESSION_KEY);
    }
    setOpen(false);
  };

  const handleTogglePopup = () => {
    setOpen((prev) => {
      const next = !prev;
      if (context === "dashboard" && typeof window !== "undefined") {
        if (next) sessionStorage.setItem(POPUP_OPEN_SESSION_KEY, "1");
        else sessionStorage.removeItem(POPUP_OPEN_SESSION_KEY);
      }
      return next;
    });
  };

  const config = isLanding
    ? {
        title: "Ainda tem dúvidas?",
        description: "Fale com nosso time em poucos segundos pelo WhatsApp.",
        message: LANDING_MESSAGE,
        cta: "Conversar no WhatsApp",
      }
    : {
        title: "Precisa de ajuda?",
        description: "Suporte rápido para tirar dúvidas sobre o sistema.",
        message: DASHBOARD_MESSAGE,
        cta: "Falar com o suporte",
      };

  const whatsappLink = useMemo(
    () => `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(config.message)}`,
    [config.message]
  );

  const accentColor = isLanding ? "#22c55e" : "var(--button-bg, var(--primary))";
  const accentHover = isLanding ? "#16a34a" : "var(--button-hover, var(--primary))";
  const foregroundColor = isLanding ? "#ffff" : "var(--foreground)";
  const containerPosition = isLanding
    ? "bottom-6 right-4 sm:right-6"
    : "bottom-24 right-4 sm:right-6 md:bottom-8";

  return (
    <div className={cn("fixed z-50 flex flex-col items-end gap-3", containerPosition)}>
    {open && (
      <div
        className="w-[280px] sm:w-[320px] rounded-2xl border shadow-2xl backdrop-blur bg-white/95 dark:bg-slate-900/95"
        style={{
          borderColor: isLanding
            ? "rgba(15, 23, 42, 0.08)"
            : "var(--border-color, rgba(15,23,42,0.12))",
        }}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="space-y-1">
            <p
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: accentColor }}
            >
              WhatsApp · YWP
            </p>
            <p className="text-sm font-bold" style={{ color: foregroundColor }}>
              {config.title}
            </p>
            <p
              className="text-xs leading-relaxed text-foreground/70"
              style={{ color:  "#8693a6"  }}
            >
              {config.description}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClosePopup}
            className="rounded-full p-1.5 transition hover:bg-foreground/5"
            aria-label="Fechar chat do WhatsApp"
          >
            <X className="h-4 w-4 text-foreground/60" />
          </button>
        </div>

        <div className="px-4 pb-4 pt-3">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition"
            style={{ backgroundColor: accentColor, color: "#ffffff" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = accentColor)}
          >
            <span className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              {config.cta}
            </span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    )}

    <button
      type="button"
      onClick={handleTogglePopup}
      className="flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition hover:scale-105 focus:outline-none"
      style={{ backgroundColor: accentColor, color: "#ffffff" }}
      aria-label="Abrir conversa no WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  </div>
  );
}
