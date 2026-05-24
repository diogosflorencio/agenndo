"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const REFRESH_MS = 10 * 60 * 1000;

/** Sincroniza sessão do painel /operacoes ao voltar à aba ou renovar token. */
export function OperacoesSessionKeepAlive() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const sync = () => {
      void supabase.auth.getSession().then(() => router.refresh());
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        router.refresh();
      }
    });

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", sync);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") sync();
    }, REFRESH_MS);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", sync);
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
