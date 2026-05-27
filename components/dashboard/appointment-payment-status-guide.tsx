"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";
import { getDashboardSurfaces } from "@/lib/dashboard-surfaces";
import { PAYMENT_POLICY_LABELS, type PaymentPolicy } from "@/lib/business-payment-policy";

type Props = {
  businessId: string | undefined;
};

type PaymentConfig = {
  payment_policy: PaymentPolicy;
  mp_checkout_enabled: boolean;
  mp_connected: boolean;
  public_pix_suggest_enabled: boolean;
};

export function AppointmentPaymentStatusGuide({ businessId }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const surfaces = getDashboardSurfaces(isDark);
  const [cfg, setCfg] = useState<PaymentConfig | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    const supabase = createClient();
    void supabase
      .from("businesses")
      .select(
        "payment_policy, mp_checkout_enabled, mp_user_id, mp_connected_at, public_pix_suggest_enabled, public_pix_key"
      )
      .eq("id", businessId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const policy = (data.payment_policy as PaymentPolicy) ?? "off";
        const pixOn = Boolean(data.public_pix_suggest_enabled && data.public_pix_key);
        setCfg({
          payment_policy:
            policy === "optional" || policy === "required_deposit" || policy === "required_full"
              ? policy
              : "off",
          mp_checkout_enabled: Boolean(data.mp_checkout_enabled),
          mp_connected: Boolean(data.mp_user_id && data.mp_connected_at),
          public_pix_suggest_enabled: pixOn,
        });
      });
  }, [businessId]);

  const mpActive = Boolean(cfg?.mp_connected && cfg.mp_checkout_enabled);
  const currentLabel = cfg
    ? !mpActive
      ? cfg.public_pix_suggest_enabled
        ? "Só Pix manual na vitrine (Mercado Pago desligado ou não conectado)"
        : "Sem cobrança online na vitrine"
      : cfg.payment_policy === "off"
        ? PAYMENT_POLICY_LABELS.off +
          (cfg.public_pix_suggest_enabled ? " — Pix manual ainda aparece na confirmação" : "")
        : PAYMENT_POLICY_LABELS[cfg.payment_policy]
    : null;

  return (
    <div
      className={cn(
        "mb-5 rounded-xl border overflow-hidden",
        isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-gray-50"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
          isDark ? "hover:bg-white/[0.04]" : "hover:bg-gray-100"
        )}
      >
        <span className={cn("material-symbols-outlined text-xl text-primary shrink-0")}>info</span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-bold", surfaces.title)}>Status e pagamento online</p>
          <p className={cn("text-xs mt-0.5", surfaces.muted)}>
            O que significa cada situação na agenda — conforme você configura em Receber pagamentos
          </p>
        </div>
        <span className={cn("material-symbols-outlined text-lg shrink-0", surfaces.muted)}>
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open ? (
        <div className={cn("px-4 pb-4 pt-0 space-y-4 border-t", isDark ? "border-white/10" : "border-gray-200")}>
          {currentLabel ? (
            <p className={cn("text-xs rounded-lg px-3 py-2", isDark ? "bg-primary/10 text-primary" : "bg-primary/15 text-gray-900")}>
              <span className="font-semibold">Sua configuração agora:</span> {currentLabel}
              {" · "}
              <Link href="/dashboard/pagamentos" className="font-semibold underline hover:no-underline">
                Alterar em Receber pagamentos
              </Link>
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <table className={cn("w-full text-xs text-left border-collapse min-w-[520px]", surfaces.subtitle)}>
              <thead>
                <tr className={cn("border-b", isDark ? "border-white/10" : "border-gray-200")}>
                  <th className={cn("py-2 pr-3 font-semibold", surfaces.title)}>Se você ativar…</th>
                  <th className={cn("py-2 pr-3 font-semibold", surfaces.title)}>Na agenda</th>
                  <th className={cn("py-2 font-semibold", surfaces.title)}>O que acontece</th>
                </tr>
              </thead>
              <tbody className="align-top">
                <ScenarioRow
                  surfaces={surfaces}
                  active={
                    (!mpActive && !cfg?.public_pix_suggest_enabled) ||
                    (mpActive && cfg?.payment_policy === "off" && !cfg?.public_pix_suggest_enabled)
                  }
                  when="Sem cobrança online (MP desligado ou política desativada)"
                  status="Confirmado"
                  statusTone="ok"
                  detail="Cliente agenda e o horário já vale. Pagamento combina no local (dinheiro, Pix fora do sistema, etc.)."
                />
                <ScenarioRow
                  surfaces={surfaces}
                  active={Boolean(
                    cfg?.public_pix_suggest_enabled &&
                      (!mpActive || cfg.payment_policy === "off")
                  )}
                  when="Só Pix manual (chave na confirmação)"
                  status="Confirmado"
                  statusTone="ok"
                  detail="Horário confirmado na hora. A vitrine só mostra sua chave Pix — o sistema não confere se pagou."
                />
                <ScenarioRow
                  surfaces={surfaces}
                  active={mpActive && cfg?.payment_policy === "optional"}
                  when="MP conectado + cobrança opcional"
                  status="Confirmado"
                  statusTone="ok"
                  detail="Horário já confirmado sem pagar. Se o cliente pagar antecipado no MP, aparece badge de pago online após confirmação do Mercado Pago."
                />
                <ScenarioRow
                  surfaces={surfaces}
                  active={mpActive && cfg?.payment_policy === "required_deposit"}
                  when="MP + sinal obrigatório"
                  status="Agendado → Confirmado"
                  statusTone="warn"
                  detail="Fica Agendado (reservado) até o cliente pagar o sinal. Só vira Confirmado quando o Mercado Pago aprovar. Restante do valor no local."
                />
                <ScenarioRow
                  surfaces={surfaces}
                  active={mpActive && cfg?.payment_policy === "required_full"}
                  when="MP + pagamento integral obrigatório"
                  status="Agendado → Confirmado"
                  statusTone="warn"
                  detail="Igual ao sinal, mas exige 100% online antes de confirmar. Sem pagamento aprovado, o horário não fecha."
                />
              </tbody>
            </table>
          </div>

          <div className={cn("grid sm:grid-cols-2 gap-2 text-[11px]", surfaces.muted)}>
            <p className="flex items-start gap-1.5">
              <span className="inline-block size-2 rounded-full bg-amber-500 mt-1 shrink-0" />
              <span>
                <strong className={surfaces.title}>Agendado + aguardando MP:</strong> reservado, pagamento ainda não
                confirmado pelo Mercado Pago.
              </span>
            </p>
            <p className="flex items-start gap-1.5">
              <span className="inline-block size-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
              <span>
                <strong className={surfaces.title}>Pago via MP:</strong> no detalhe do agendamento você vê valor e ID
                da transação quando disponível.
              </span>
            </p>
          </div>

          <p className={cn("text-[11px] leading-relaxed", surfaces.muted)}>
            O cliente não precisa criar conta para agendar nem para pagar. Conta Agenndo é opcional para ele acompanhar
            histórico.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ScenarioRow({
  surfaces,
  active,
  when,
  status,
  statusTone,
  detail,
}: {
  surfaces: ReturnType<typeof getDashboardSurfaces>;
  active?: boolean;
  when: string;
  status: string;
  statusTone: "ok" | "warn";
  detail: string;
}) {
  return (
    <tr
      className={cn(
        "border-b last:border-0",
        active ? "bg-primary/5" : undefined
      )}
    >
      <td className={cn("py-2.5 pr-3 font-medium", surfaces.title)}>
        {when}
        {active ? (
          <span className="ml-1.5 text-[10px] font-bold uppercase text-primary">(você)</span>
        ) : null}
      </td>
      <td className="py-2.5 pr-3">
        <span
          className={cn(
            "inline-flex px-2 py-0.5 rounded-md font-semibold text-[10px]",
            statusTone === "warn"
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
          )}
        >
          {status}
        </span>
      </td>
      <td className={cn("py-2.5", surfaces.muted)}>{detail}</td>
    </tr>
  );
}
