"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { generateGoogleAuthNonce } from "@/lib/auth/google-nonce";
import { syncAccountOnLogin } from "@/lib/auth/sync-account-on-login";
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
            nonce?: string;
            use_fedcm_for_prompt?: boolean;
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
  const nonceRef = useRef<string | null>(null);

  useEffect(() => {
    if (disabled) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
    if (!clientId) return;

    let cancelled = false;

    void (async () => {
      try {
        await loadGsiScript();
        if (cancelled || !window.google?.accounts?.id) return;

        const { nonce, hashedNonce } = await generateGoogleAuthNonce();
        nonceRef.current = nonce;

        window.google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
          callback: async (resp) => {
            if (!resp?.credential) return;
            const rawNonce = nonceRef.current;
            if (!rawNonce) {
              onError?.("Falha de segurança no login. Tente de novo.");
              return;
            }
            const supabase = createClient();
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: resp.credential,
              nonce: rawNonce,
            });
            if (error) {
              onError?.(error.message);
              return;
            }
            const user = data.user;
            if (user) {
              await syncAccountOnLogin(supabase, user.id, {
                email: user.email,
                fullName: (user.user_metadata?.full_name ?? user.user_metadata?.name) as string | undefined,
                avatarUrl: (user.user_metadata?.avatar_url ?? user.user_metadata?.picture) as string | undefined,
                loginContext: null,
              });
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
