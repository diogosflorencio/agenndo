"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MercadoPagoLogo } from "@/components/ui/icons/MercadoPagoLogo";

type Props = {
  appointmentId: string;
  preferenceId: string;
  publicKey: string;
  amountCents: number;
  amountLabel: string;
  payerEmail?: string | null;
  onPaid?: (status: string) => void;
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
        ) => Promise<{ unmount?: () => void }>;
      };
    };
  }
}

function loadMpSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.MercadoPago) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("SDK Mercado Pago")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("SDK Mercado Pago"));
    document.body.appendChild(s);
  });
}

/**
 * Payment Brick embutido - exige `amount` + `preferenceId` (MP) e processa via /checkout/process.
 */
export function MercadoPagoPaymentBrick({
  appointmentId,
  preferenceId,
  publicKey,
  amountCents,
  amountLabel,
  payerEmail,
  onPaid,
  onError,
}: Props) {
  const containerId = useId().replace(/:/g, "");
  const controllerRef = useRef<{ unmount?: () => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const amount = amountCents > 0 ? amountCents / 100 : 0;

  useEffect(() => {
    if (!preferenceId || !publicKey || !appointmentId || amount <= 0) return;

    let cancelled = false;
    setReady(false);
    setErr(null);

    void (async () => {
      try {
        await loadMpSdk();
        if (cancelled || !window.MercadoPago) return;

        controllerRef.current?.unmount?.();
        controllerRef.current = null;

        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        const bricks = mp.bricks();

        const initialization: Record<string, unknown> = {
          amount,
          preferenceId,
        };
        if (payerEmail?.trim()) {
          initialization.payer = { email: payerEmail.trim() };
        }

        const controller = await bricks.create("payment", containerId, {
          initialization,
          customization: {
            visual: { style: { theme: "dark" } },
            paymentMethods: {
              creditCard: "all",
              debitCard: "all",
              ticket: "all",
              bankTransfer: "all",
              mercadoPago: "all",
            },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) setReady(true);
            },
            onSubmit: ({ formData }: { formData: Record<string, unknown> }) => {
              setProcessing(true);
              return fetch("/api/mercadopago/checkout/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ appointmentId, formData }),
              })
                .then(async (res) => {
                  const j = (await res.json()) as { error?: string; status?: string };
                  if (!res.ok) throw new Error(j.error ?? "Pagamento recusado");
                  onPaid?.(j.status ?? "approved");
                })
                .catch((e: unknown) => {
                  const msg = e instanceof Error ? e.message : "Erro ao processar pagamento";
                  setErr(msg);
                  onError?.(msg);
                  throw e;
                })
                .finally(() => {
                  if (!cancelled) setProcessing(false);
                });
            },
            onError: (e: { message?: string }) => {
              const msg = e?.message ?? "Erro no formulário de pagamento";
              if (!cancelled) {
                setErr(msg);
                onError?.(msg);
              }
            },
          },
        });

        if (!cancelled) controllerRef.current = controller;
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Não foi possível carregar o pagamento.";
          setErr(msg);
          onError?.(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      controllerRef.current?.unmount?.();
      controllerRef.current = null;
    };
  }, [appointmentId, preferenceId, publicKey, amount, payerEmail, containerId, onPaid, onError]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MercadoPagoLogo className="h-6 w-auto" />
        <div>
          <p className="text-sm font-semibold text-white">Pagar com Mercado Pago</p>
          <p className="text-xs text-gray-400">{amountLabel} - Pix, cartão e outros meios</p>
        </div>
      </div>
      {err ? <p className="text-xs text-red-400">{err}</p> : null}
      {!ready && !err ? (
        <p className="text-xs text-gray-500 py-6 text-center">Carregando formas de pagamento…</p>
      ) : null}
      {processing ? (
        <p className="text-xs text-amber-300/90 text-center py-1">Processando pagamento…</p>
      ) : null}
      <div id={containerId} className="min-h-[280px]" />
      <p className="text-[10px] text-gray-600 leading-relaxed">
        Se o formulário não carregar, desative bloqueadores de anúncio nesta página (o Mercado Pago usa rastreamento
        interno).
      </p>
    </div>
  );
}
