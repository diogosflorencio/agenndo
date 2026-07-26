"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isPlatformOperator } from "@/lib/platform-operator";
import {
  buildOAuthStartUrl,
  buildSupabaseOAuthRedirectUrl,
  getOAuthRedirectOrigin,
  isLocalhostOAuthPopup,
  OAUTH_POPUP_MESSAGE,
  writeOAuthBridgeRedirectState,
} from "@/lib/auth/oauth-popup";

const UNLOCK_CLICKS = 5;
const NEXT_PATH = "/operacoes";

function EntrarInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tapCount, setTapCount] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupHandledRef = useRef(false);
  const popupPollRef = useRef<number | null>(null);

  useEffect(() => {
    if (searchParams.get("error") === "sem_acesso") {
      setUnlocked(true);
      setError("Conta sem permissão de operador.");
    }
  }, [searchParams]);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && (await isPlatformOperator(supabase))) {
        router.replace(NEXT_PATH);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!isLocalhostOAuthPopup()) return;

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const payload = e.data as { type?: string; ok?: boolean; next?: string; error?: string };
      if (payload?.type !== OAUTH_POPUP_MESSAGE) return;
      popupHandledRef.current = true;
      if (popupPollRef.current) {
        clearInterval(popupPollRef.current);
        popupPollRef.current = null;
      }
      setLoading(false);
      if (payload.ok && payload.next) {
        const next = payload.next;
        void (async () => {
          const supabase = createClient();
          if (!(await isPlatformOperator(supabase))) {
            await supabase.auth.signOut();
            setError("Sessão válida, mas sem permissão de operador.");
            setUnlocked(true);
            return;
          }
          router.push(next.startsWith("/") ? next : NEXT_PATH);
          router.refresh();
        })();
      } else {
        setError(payload.error ?? "Não foi possível entrar.");
        setUnlocked(true);
      }
    }

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (popupPollRef.current) {
        clearInterval(popupPollRef.current);
        popupPollRef.current = null;
      }
    };
  }, [router]);

  const handleSurfaceTap = () => {
    if (unlocked) return;
    setTapCount((c) => {
      const next = c + 1;
      if (next >= UNLOCK_CLICKS) setUnlocked(true);
      return next;
    });
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    popupHandledRef.current = false;
    const origin = getOAuthRedirectOrigin() || window.location.origin;

    if (isLocalhostOAuthPopup()) {
      const startUrl = buildOAuthStartUrl(origin, { next: NEXT_PATH });
      const popup = window.open(startUrl, "agenndo-oauth", "width=520,height=720,scrollbars=yes");
      if (!popup) {
        setError("Permita popups para este site.");
        setLoading(false);
        return;
      }
      popup.focus();
      if (popupPollRef.current) clearInterval(popupPollRef.current);
      popupPollRef.current = window.setInterval(() => {
        if (popup.closed && !popupHandledRef.current) {
          if (popupPollRef.current) {
            clearInterval(popupPollRef.current);
            popupPollRef.current = null;
          }
          setLoading(false);
        }
      }, 400);
      return;
    }

    writeOAuthBridgeRedirectState({ next: NEXT_PATH });

    const supabase = createClient();
    const redirectTo = buildSupabaseOAuthRedirectUrl("/auth/callback", {});
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: false,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#020403] text-white flex flex-col cursor-default select-none"
      onClick={handleSurfaceTap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleSurfaceTap();
      }}
      role="presentation"
    >
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/8 blur-[120px] rounded-full pointer-events-none" />

      <header className="relative z-10 py-6 px-6 border-b border-white/5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight" onClick={(e) => e.stopPropagation()}>
            Agenndo
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {!unlocked ? (
          <div className="max-w-sm space-y-4 pointer-events-none">
            <p className="text-gray-500 text-sm">Agendamento online para o seu negócio.</p>
            <p className="text-xs text-gray-600">
              <Link href="/" className="underline hover:text-gray-400 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                Voltar ao início
              </Link>
            </p>
          </div>
        ) : (
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d2316] p-8 space-y-6 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h1 className="text-xl font-bold">Acesso</h1>
              <p className="text-sm text-gray-400 mt-2">Entre com a conta Google autorizada.</p>
            </div>

            {error ? (
              <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={loading}
              onClick={() => void handleGoogleLogin()}
              className="w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="size-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Entrar com Google
                </>
              )}
            </button>

            {isLocalhostOAuthPopup() ? (
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Em localhost o login abre num popup (igual ao resto do app).
              </p>
            ) : null}

            <p className="text-center text-[11px] text-gray-600">
              <Link href="/" className="hover:text-gray-400">
                Site público
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function OperacoesEntrarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020403] flex items-center justify-center">
          <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <EntrarInner />
    </Suspense>
  );
}
