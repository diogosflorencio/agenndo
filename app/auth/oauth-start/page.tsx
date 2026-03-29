"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  buildSupabaseOAuthRedirectUrl,
  getOAuthRedirectOrigin,
  OAUTH_POPUP_MESSAGE,
} from "@/lib/auth/oauth-popup";

function OAuthStartInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hint, setHint] = useState("Abrindo Google…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const nextRaw = searchParams.get("next") ?? "/dashboard";
    const nextPath = nextRaw.startsWith("/") ? nextRaw : `/${nextRaw}`;
    const context = searchParams.get("context") === "cliente" ? "cliente" : undefined;

    const origin = getOAuthRedirectOrigin() || window.location.origin;
    const redirectTo = buildSupabaseOAuthRedirectUrl("/auth/oauth-bridge", {
      next: nextPath,
      ...(context ? { context } : {}),
    });

    void (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
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

      if (error) {
        setHint("Erro ao iniciar login");
        const op = window.opener;
        if (op && !op.closed) {
          op.postMessage(
            { type: OAUTH_POPUP_MESSAGE, ok: false, error: error.message },
            window.location.origin
          );
        }
        window.setTimeout(() => {
          window.close();
          if (!op || op.closed) {
            router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          }
        }, 200);
      }
    })();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[#020403] flex flex-col items-center justify-center text-gray-400 text-sm px-6 text-center gap-3">
      <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p>{hint}</p>
      <p className="text-xs text-gray-600 max-w-sm">
        Se o site abrir em outro domínio, adicione em Supabase → Authentication → URL Configuration a URL exata de redirect (localhost + /auth/oauth-bridge).
      </p>
    </div>
  );
}

export default function OAuthStartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020403] flex items-center justify-center">
          <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <OAuthStartInner />
    </Suspense>
  );
}
