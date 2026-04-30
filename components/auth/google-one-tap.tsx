"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (r: { credential: string }) => void | Promise<void>;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (momentListener?: (n: {
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
            getDismissedReason: () => string;
            getMomentType: () => string;
          }) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

function loadGsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gsi load"));
    document.head.appendChild(s);
  });
}

type Props = {
  /** Caminho interno após sessão criada (ex.: `/dashboard` ou `?next=`). */
  nextPath: string;
  onError?: (message: string) => void;
  /** Desliga One Tap (ex.: fluxo popup localhost ou botão Google em loading). */
  disabled?: boolean;
};

/**
 * Google Identity Services (One Tap). Requer o mesmo **Client ID** Web configurado no Supabase (Auth → Google).
 * Env: `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`
 */
export function GoogleOneTap({ nextPath, onError, disabled }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (disabled) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
    if (!clientId) return;

    let cancelled = false;

    void (async () => {
      try {
        await loadGsiScript();
        if (cancelled || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: async (resp) => {
            if (!resp?.credential) return;
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: resp.credential,
            });
            if (error) {
              onError?.(error.message);
              return;
            }
            const dest =
              nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
            router.push(dest);
            router.refresh();
          },
        });

        window.google.accounts.id.prompt();
      } catch {
        /* script bloqueado / rede */
      }
    })();

    return () => {
      cancelled = true;
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [disabled, nextPath, onError, router]);

  return null;
}
