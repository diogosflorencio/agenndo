"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { GoogleOneTap } from "@/components/auth/google-one-tap";
import {
  buildOAuthStartUrl,
  buildSupabaseOAuthRedirectUrl,
  getOAuthRedirectOrigin,
  isLocalhostOAuthPopup,
  OAUTH_POPUP_MESSAGE,
  type OAuthLoginContext,
} from "@/lib/auth/oauth-popup";
import { resolveProviderLoginDestination } from "@/lib/auth/resolve-login-destination";
import { createClient } from "@/lib/supabase/client";
import { trialDaysShortLabel } from "@/lib/trial-config";

function safeLoginNext(raw: string | null): string {
  const n = raw?.trim();
  if (n && n.startsWith("/") && !n.startsWith("//")) return n;
  return "/dashboard";
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeLoginNext(searchParams.get("next"));
  const loginContext: OAuthLoginContext | null =
    searchParams.get("context") === "staff"
      ? "staff"
      : nextPath.includes("minhas-comissoes")
        ? "staff"
        : null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupHandledRef = useRef(false);
  const popupPollRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;
      const dest = await resolveProviderLoginDestination(supabase, nextPath);
      router.replace(dest);
    })();
    return () => {
      cancelled = true;
    };
  }, [nextPath, router]);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(decodeURIComponent(err));
  }, [searchParams]);

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
        router.push(payload.next);
        router.refresh();
      } else {
        setError(payload.error ?? "Não foi possível entrar.");
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    popupHandledRef.current = false;
    const origin = getOAuthRedirectOrigin() || window.location.origin;

    if (isLocalhostOAuthPopup()) {
      const startUrl = buildOAuthStartUrl(origin, {
        next: nextPath,
        ...(loginContext ? { context: loginContext } : {}),
      });
      const popup = window.open(startUrl, "agenndo-oauth", "width=520,height=720,scrollbars=yes");
      if (!popup) {
        setError("Permita popups para este site ou use outro navegador.");
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

    const supabase = createClient();
    const redirectTo = buildSupabaseOAuthRedirectUrl("/auth/callback", {
      next: nextPath,
      ...(loginContext ? { context: loginContext } : {}),
    });

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: false,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col lg:flex-row">
      <GoogleOneTap nextPath={nextPath} onError={setError} disabled={loading || isLocalhostOAuthPopup()} />

      <aside className="hidden lg:flex lg:w-[42%] xl:w-[44%] lg:min-h-screen flex-col border-r border-gray-200 bg-white">
        <div className="flex flex-col flex-1 justify-center px-12 xl:px-16 py-16">
          <Link href="/" className="text-lg font-semibold tracking-tight text-gray-900 mb-10">
            Agenndo
          </Link>
          <h2 className="text-2xl xl:text-3xl font-semibold leading-tight tracking-tight text-gray-900 max-w-sm mb-4">
            Acesso para prestadores
          </h2>
          <p className="text-gray-600 text-base leading-relaxed max-w-sm mb-8">
            Entre com Google para gerenciar agenda, serviços, equipe e clientes.
          </p>
          <ul className="space-y-3 text-sm text-gray-600 max-w-sm">
            <li className="flex gap-2">
              <span className="text-emerald-600 shrink-0">·</span>
              Painel web e celular (PWA)
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-600 shrink-0">·</span>
              Página pública de agendamento
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-600 shrink-0">·</span>
              Teste grátis ({trialDaysShortLabel()})
            </li>
          </ul>
          <p className="text-xs text-gray-500 mt-10 max-w-sm leading-relaxed">
            Se você é <strong className="font-medium text-gray-700">cliente</strong> de um estabelecimento, use o link
            &quot;Entrar&quot; na página de agendamento desse negócio - não este login.
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 lg:flex lg:items-center lg:justify-center lg:py-10">
        <header className="py-4 px-6 border-b border-gray-200 lg:border-0 lg:absolute lg:top-0 lg:left-[42%] lg:right-0">
          <div className="max-w-sm mx-auto flex items-center justify-between lg:max-w-md">
            <Link href="/" className="text-base font-semibold text-gray-900 lg:hidden">
              Agenndo
            </Link>
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 ml-auto">
              Voltar ao site
            </Link>
          </div>
        </header>

        <main className="w-full max-w-sm mx-auto px-6 flex-1 flex flex-col justify-center py-10 lg:py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Entrar</h1>
              <p className="text-gray-600 text-sm">Use sua conta Google para acessar o painel.</p>
            </div>

            {error ? (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
            ) : null}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-900 font-semibold rounded-lg transition-colors border border-gray-300"
            >
              {loading ? (
                <div className="size-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              <span>
                {loading && isLocalhostOAuthPopup()
                  ? "Aguarde o popup…"
                  : loading
                    ? "Redirecionando..."
                    : "Continuar com Google"}
              </span>
            </button>

            <p className="text-xs text-gray-500 text-center mt-6 leading-relaxed">
              Ao entrar, você concorda com os{" "}
              <Link href="/termos" className="text-gray-700 underline hover:text-gray-900">
                Termos
              </Link>{" "}
              e a{" "}
              <Link href="/politicas" className="text-gray-700 underline hover:text-gray-900">
                Política de Privacidade
              </Link>
              .
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-gray-500 leading-relaxed px-2">
            Novo por aqui? O cadastro começa após o login -{" "}
            <span className="text-gray-700 font-medium">{trialDaysShortLabel()} de teste</span> sem cartão.
          </p>
        </main>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginContent />
    </Suspense>
  );
}
