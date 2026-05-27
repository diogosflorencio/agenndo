"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MercadoPagoLogo } from "@/components/ui/icons/MercadoPagoLogo";

type Props = {
  preferenceId: string;
  publicKey: string;
  amountLabel: string;
  onPaid?: () => void;
  onError?: (message: string) => void;
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, opts?: { locale: string }) => {
      bricks: () => {
        create: (
          brick: string,
          container: string,
          settings: Record<string, unknown>
        ) => Promise<unknown>;
      };
    };
  }
}

function loadMpSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.MercadoPago) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("SDK Mercado Pago"));
    document.body.appendChild(s);
  });
}

/**
 * Pagamento embutido (Payment Brick) — sem redirecionar para Checkout Pro.
 * Requer preferenceId criado no servidor.
 */
export function MercadoPagoPaymentBrick({
  preferenceId,
  publicKey,
  amountLabel,
  onPaid,
  onError,
}: Props) {
  const containerId = useId().replace(/:/g, "");
  const mountedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!preferenceId || !publicKey || mountedRef.current) return;
    let cancelled = false;

    void (async () => {
      try {
        await loadMpSdk();
        if (cancelled || !window.MercadoPago) return;
        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        const bricks = mp.bricks();
        await bricks.create("payment", containerId, {
          initialization: { preferenceId },
          customization: {
            visual: { style: { theme: "dark" } },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) setReady(true);
            },
            onSubmit: () => {
              onPaid?.();
            },
            onError: (e: { message?: string }) => {
              const msg = e?.message ?? "Erro no pagamento";
              setErr(msg);
              onError?.(msg);
            },
          },
        });
        mountedRef.current = true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Não foi possível carregar o pagamento.";
        setErr(msg);
        onError?.(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [preferenceId, publicKey, containerId, onPaid, onError]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MercadoPagoLogo className="h-6 w-auto" />
        <div>
          <p className="text-sm font-semibold text-white">Pagar com Mercado Pago</p>
          <p className="text-xs text-gray-400">{amountLabel} — ambiente seguro do Mercado Pago</p>
        </div>
      </div>
      {err ? <p className="text-xs text-red-400">{err}</p> : null}
      {!ready && !err ? (
        <p className="text-xs text-gray-500 py-6 text-center">Carregando formas de pagamento…</p>
      ) : null}
      <div id={containerId} className="min-h-[220px]" />
    </div>
  );
}
