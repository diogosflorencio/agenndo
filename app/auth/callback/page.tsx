"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { finishOAuthSession } from "@/lib/auth/finish-oauth-session";
import {
  consumeOAuthBridgeRedirectState,
  OAUTH_POPUP_MESSAGE,
  type OAuthLoginContext,
} from "@/lib/auth/oauth-popup";

/** Evita processar o mesmo retorno OAuth 2x (React Strict Mode em dev). */
const oauthCallbackDedupe = new Set<string>();

function postMessageTargetOrigin(): string {
  try {
    const op = window.opener as Window | null;
    if (op && op !== window && op.location?.href) {
      return new URL(op.location.href).origin;
    }
  } catch {
    /* opener pode ser outra origem em fluxos incorretos */
  }
  return window.location.origin;
}

function notifyOpener(ok: boolean, payload: string) {
  const op = window.opener;
  const targetOrigin = postMessageTargetOrigin();
  if (op && typeof op.postMessage === "function" && !op.closed) {
    if (ok) {
      op.postMessage({ type: OAUTH_POPUP_MESSAGE, ok: true, next: payload }, targetOrigin);
    } else {
      op.postMessage({ type: OAUTH_POPUP_MESSAGE, ok: false, error: payload }, targetOrigin);
    }
    window.setTimeout(() => window.close(), 120);
  }
}

function OAuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Conectando…");

  useEffect(() => {
    const code = searchParams.get("code");
    const oauthError =
      searchParams.get("error_description") ?? searchParams.get("error") ?? null;

    const dedupeKey = code ?? `nocode-${searchParams.toString()}`;
    if (oauthCallbackDedupe.has(dedupeKey)) {
      return;
    }
    oauthCallbackDedupe.add(dedupeKey);

    const stored = consumeOAuthBridgeRedirectState();
    const nextFromUrl = searchParams.get("next");
    const nextPath = stored?.next
      ? stored.next
      : nextFromUrl
        ? nextFromUrl.startsWith("/")
          ? nextFromUrl
          : `/${nextFromUrl}`
        : "/dashboard";
    const ctxParam = stored?.context ?? searchParams.get("context");
    const context: OAuthLoginContext | null =
      ctxParam === "cliente" || ctxParam === "staff" ? ctxParam : null;
    const hasOpener = typeof window !== "undefined" && window.opener && !window.opener.closed;

    async function finish() {
      if (oauthError) {
        setStatus("Erro no login");
        if (hasOpener) notifyOpener(false, oauthError);
        else router.replace(`/login?error=${encodeURIComponent(oauthError)}`);
        return;
      }

      if (!code) {
        setStatus("Código ausente");
        if (hasOpener) notifyOpener(false, "missing_oauth_code");
        else router.replace("/login?error=missing_oauth_code");
        return;
      }

      const supabase = createClient();
      const result = await finishOAuthSession({
        supabase,
        code,
        nextPath,
        loginContext: context,
      });

      if (!result.ok) {
        setStatus("Falha na sessão");
        if (hasOpener) notifyOpener(false, result.error);
        else router.replace(`/login?error=${encodeURIComponent(result.error)}`);
        return;
      }

      setStatus("Pronto");
      if (hasOpener) {
        notifyOpener(true, result.path);
      } else {
        router.replace(result.path);
        router.refresh();
      }
    }

    void finish();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[#020403] flex items-center justify-center text-gray-400 text-sm px-4 text-center">
      {status}
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020403] flex items-center justify-center">
          <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
