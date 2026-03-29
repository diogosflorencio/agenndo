"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { consumeOAuthBridgeRedirectState, OAUTH_POPUP_MESSAGE } from "@/lib/auth/oauth-popup";

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

/** Evita processar o mesmo retorno OAuth 2x (React 18 Strict Mode em dev). */
const oauthBridgeDedupe = new Set<string>();

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

function OAuthBridgeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Conectando…");

  useEffect(() => {
    const code = searchParams.get("code");
    const oauthError =
      searchParams.get("error_description") ?? searchParams.get("error") ?? null;

    const dedupeKey = code ?? `nocode-${searchParams.toString()}`;
    if (oauthBridgeDedupe.has(dedupeKey)) {
      return;
    }
    oauthBridgeDedupe.add(dedupeKey);

    const stored = consumeOAuthBridgeRedirectState();
    const nextFromUrl = searchParams.get("next");
    const nextPath = stored?.next
      ? stored.next
      : nextFromUrl
        ? nextFromUrl.startsWith("/")
          ? nextFromUrl
          : `/${nextFromUrl}`
        : "/dashboard";
    const context =
      stored?.context === "cliente" || searchParams.get("context") === "cliente" ? "cliente" : null;
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

      const { error: ex1 } = await supabase.auth.exchangeCodeForSession(code);
      if (ex1) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setStatus("Falha na sessão");
          if (hasOpener) notifyOpener(false, ex1.message);
          else router.replace(`/login?error=${encodeURIComponent(ex1.message)}`);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("Usuário não encontrado");
        if (hasOpener) notifyOpener(false, "no_user_after_exchange");
        else router.replace("/login?error=no_user_after_exchange");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single();
      if (!profile) {
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: user.email ?? undefined,
            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? undefined,
            avatar_url: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? undefined,
            role: "provider",
          },
          { onConflict: "id" }
        );
      }

      let path = nextPath;
      if (context !== "cliente") {
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("profile_id", user.id)
          .limit(1)
          .maybeSingle();

        if (!business) {
          path = "/setup";
        }
      }

      setStatus("Pronto");
      if (hasOpener) {
        notifyOpener(true, path);
      } else {
        router.replace(path);
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

export default function OAuthBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020403] flex items-center justify-center">
          <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <OAuthBridgeInner />
    </Suspense>
  );
}
