"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { publicMaterialIconClass } from "@/lib/public-book-ui";
import { MercadoPagoPaymentBrick } from "@/components/public/mercadopago-payment-brick";
import { PublicPwaInstallPrompt } from "@/components/public-pwa-install-prompt";

type CollabRow = { id: string; name: string };

type Props = {
  serviceName: string;
  bookedPriceCents: number;
  collab: CollabRow | "any" | null;
  collaboratorName: string | null;
  date: string | null;
  time: string | null;
  slug: string;
  businessName: string;
  accentColor: string;
  appointmentId: string | null;
  paymentDueCents: number;
  paymentRequired: boolean;
  authUserId: string | null;
};

export function PublicBookingSuccessScreen({
  serviceName,
  bookedPriceCents,
  collab,
  collaboratorName,
  date,
  time,
  slug,
  businessName,
  accentColor,
  appointmentId,
  paymentDueCents,
  paymentRequired,
  authUserId,
}: Props) {
  const [checkout, setCheckout] = useState<{
    preferenceId: string;
    publicKey: string;
    amountCents: number;
  } | null>(null);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [mpConfirmed, setMpConfirmed] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [mpPaymentId, setMpPaymentId] = useState<string | null>(null);

  const showPayment = paymentDueCents > 0 && Boolean(appointmentId);
  const waitingWebhook = showPayment && (paymentRequired || paymentSubmitted) && !mpConfirmed;
  const paidOk = mpConfirmed;

  useEffect(() => {
    if (!appointmentId || paymentDueCents <= 0) return;
    let cancelled = false;
    setCheckoutLoading(true);
    setCheckoutErr(null);
    void (async () => {
      try {
        const res = await fetch("/api/mercadopago/checkout/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            appointmentId,
            successUrl: typeof window !== "undefined" ? window.location.href : undefined,
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Não foi possível iniciar o pagamento");
        if (cancelled) return;
        if (typeof j.preferenceId === "string" && typeof j.publicKey === "string") {
          setCheckout({
            preferenceId: j.preferenceId,
            publicKey: j.publicKey,
            amountCents: typeof j.amountCents === "number" ? j.amountCents : paymentDueCents,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setCheckoutErr(e instanceof Error ? e.message : "Erro ao carregar pagamento");
        }
      } finally {
        if (!cancelled) setCheckoutLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, paymentDueCents]);

  useEffect(() => {
    if (!appointmentId) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/public/appointment-status?appointmentId=${encodeURIComponent(appointmentId)}`,
          { credentials: "include" }
        );
        const j = await res.json();
        if (cancelled || !res.ok) return;
        if (j.mpConfirmed) {
          setMpConfirmed(true);
          if (typeof j.mpPaymentId === "string") setMpPaymentId(j.mpPaymentId);
        }
      } catch {
        /* ignore */
      }
    };

    void poll();
    const id = window.setInterval(() => {
      attempts += 1;
      if (mpConfirmed || attempts > 40) {
        window.clearInterval(id);
        return;
      }
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [appointmentId, mpConfirmed, paymentSubmitted, paymentRequired]);

  const profName =
    collaboratorName ??
    (collab === "any" ? "Equipe (definida no agendamento)" : (collab as CollabRow)?.name ?? "-");

  const dateLabel = date
    ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "-";

  return (
    <div
      className="min-h-screen bg-[#020403] text-white px-4 py-8 sm:py-12"
      style={{ ["--public-accent"]: accentColor } as CSSProperties}
    >
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[min(100%,28rem)] h-72 bg-[color-mix(in_srgb,var(--public-accent)_12%,transparent)] blur-[90px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto space-y-6">
        <header className="text-center space-y-3">
          <div
            className={cn(
              "mx-auto size-16 rounded-2xl flex items-center justify-center border",
              waitingWebhook
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-[color-mix(in_srgb,var(--public-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--public-accent)_10%,transparent)]"
            )}
          >
            <span
              className={cn(
                publicMaterialIconClass("xl", false),
                waitingWebhook ? "text-amber-400" : "text-[var(--public-accent)]",
                "!text-4xl"
              )}
            >
              {waitingWebhook ? "schedule" : "check_circle"}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {paidOk
              ? "Agendamento confirmado!"
              : waitingWebhook
                ? paymentRequired
                  ? "Horário reservado"
                  : "Pagamento enviado"
                : "Agendamento registrado"}
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
            {paidOk
              ? "Pagamento confirmado pelo Mercado Pago. O estabelecimento já vê seu horário como confirmado."
              : waitingWebhook
                ? paymentSubmitted
                  ? "Estamos aguardando a confirmação do Mercado Pago (pode levar alguns segundos). Não feche esta página ainda."
                  : paymentRequired
                    ? "Conclua o pagamento abaixo. O horário só será confirmado após o Mercado Pago aprovar."
                    : "Se quiser, pague antecipado abaixo. Também pode combinar no estabelecimento."
                : showPayment
                  ? "Se quiser, pague antecipado abaixo. Também pode combinar no estabelecimento."
                  : "Guarde data e horário. Compareça no horário combinado com o estabelecimento."}
          </p>
          {mpPaymentId && paidOk ? (
            <p className="text-[11px] text-gray-500 font-mono">Transação MP #{mpPaymentId}</p>
          ) : null}
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Resumo</p>
          </div>
          <dl className="divide-y divide-white/8">
            {[
              { label: "Estabelecimento", value: businessName },
              { label: "Serviço", value: serviceName },
              { label: "Profissional", value: profName },
              { label: "Data", value: dateLabel },
              { label: "Horário", value: time ?? "-" },
              {
                label: "Valor do serviço",
                value: formatCurrency(bookedPriceCents / 100),
                highlight: true,
              },
            ].map((row) => (
              <div key={row.label} className="flex justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-gray-500 shrink-0">{row.label}</dt>
                <dd
                  className={cn(
                    "font-semibold text-right",
                    row.highlight ? "text-[var(--public-accent)]" : "text-white"
                  )}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {showPayment && !paidOk ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className={cn(publicMaterialIconClass("sm", false), "text-[var(--public-accent)]")}>
                lock
              </span>
              <p className="text-sm font-semibold">
                {paymentRequired ? "Pagamento para confirmar" : "Pagamento antecipado (opcional)"}
              </p>
            </div>
            {checkoutLoading ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 py-10 text-center">
                <div className="size-8 border-2 border-white/20 border-t-[var(--public-accent)] rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-gray-500">Abrindo Mercado Pago…</p>
              </div>
            ) : checkoutErr ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {checkoutErr}
                <p className="text-xs text-red-400/80 mt-2">
                  Seu horário continua reservado. Tente recarregar ou fale com o estabelecimento.
                </p>
              </div>
            ) : checkout && appointmentId ? (
              <MercadoPagoPaymentBrick
                appointmentId={appointmentId}
                preferenceId={checkout.preferenceId}
                publicKey={checkout.publicKey}
                amountCents={checkout.amountCents}
                amountLabel={formatCurrency(checkout.amountCents / 100)}
                onPaid={() => setPaymentSubmitted(true)}
              />
            ) : null}
          </section>
        ) : null}

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Em breve</p>
          <ul className="space-y-2 text-xs text-gray-400">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-sm text-gray-600 shrink-0">mail</span>
              Confirmação por e-mail - em desenvolvimento
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-sm text-gray-600 shrink-0">calendar_add_on</span>
              Adicionar ao Google Calendar - em desenvolvimento
            </li>
          </ul>
        </section>

        {!authUserId ? (
          <section className="rounded-2xl border border-[color-mix(in_srgb,var(--public-accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--public-accent)_6%,transparent)] px-4 py-4">
            <p className="text-sm font-semibold text-white mb-1">Conta gratuita (opcional)</p>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              Crie uma conta para ver histórico de agendamentos, acompanhar pagamentos e ter mais controle no futuro.
              Não é obrigatório para agendar nem para pagar agora.
            </p>
            <Link
              href={`/entrar?slug=${encodeURIComponent(slug)}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--public-accent)] hover:underline"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Criar conta ou entrar
            </Link>
          </section>
        ) : null}

        <div className="flex flex-col gap-2 pt-2">
          {authUserId ? (
            <Link
              href="/conta"
              prefetch
              className="w-full py-3.5 bg-[var(--public-accent)] hover:brightness-95 text-black font-bold rounded-xl text-sm text-center transition-all"
            >
              Meus agendamentos
            </Link>
          ) : null}
          <Link
            href={`/${slug}`}
            className="w-full py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-sm text-center transition-all"
          >
            Voltar à página do negócio
          </Link>
        </div>
      </div>

      <PublicPwaInstallPrompt slug={slug} businessName={businessName} accentColor={accentColor} isDark={true} />
    </div>
  );
}
