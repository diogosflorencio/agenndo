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

const SCENARIOS = [
  {
    id: "none",
    when: "Sem cobrança online",
    hint: "MP desligado ou política desativada",
    status: "Confirmado",
    statusTone: "ok" as const,
    detail: "Horário confirmado na hora. Pagamento combina no local.",
  },
  {
    id: "pix",
    when: "Só Pix manual",
    hint: "Chave na tela de confirmação",
    status: "Confirmado",
    statusTone: "ok" as const,
    detail: "Confirmado na hora. O sistema não verifica se o Pix foi pago.",
  },
  {
    id: "optional",
    when: "Mercado Pago opcional",
    hint: "Cliente pode pagar antes ou no local",
    status: "Confirmado",
    statusTone: "ok" as const,
    detail: "Já confirmado sem pagar. Se pagar no MP, aparece badge após aprovação.",
  },
  {
    id: "deposit",
    when: "Sinal obrigatório (MP)",
    hint: "Parte do valor online",
    status: "Agendado → Confirmado",
    statusTone: "warn" as const,
    detail: "Reservado até o MP aprovar o sinal. Restante no estabelecimento.",
  },
  {
    id: "full",
    when: "Pagamento integral (MP)",
    hint: "100% online para fechar",
    status: "Agendado → Confirmado",
    statusTone: "warn" as const,
    detail: "Só confirma depois que o Mercado Pago aprovar o valor total.",
  },
] as const;

function isScenarioActive(id: (typeof SCENARIOS)[number]["id"], cfg: PaymentConfig | null, mpActive: boolean) {
  if (!cfg) return false;
  switch (id) {
    case "none":
      return (
        (!mpActive && !cfg.public_pix_suggest_enabled) ||
        (mpActive && cfg.payment_policy === "off" && !cfg.public_pix_suggest_enabled)
      );
    case "pix":
      return Boolean(cfg.public_pix_suggest_enabled && (!mpActive || cfg.payment_policy === "off"));
    case "optional":
      return mpActive && cfg.payment_policy === "optional";
    case "deposit":
      return mpActive && cfg.payment_policy === "required_deposit";
    case "full":
      return mpActive && cfg.payment_policy === "required_full";
    default:
      return false;
  }
}

export function AppointmentPaymentStatusGuide({ businessId }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const surfaces = getDashboardSurfaces(isDark);
  const [cfg, setCfg] = useState<PaymentConfig | null>(null);
  const [open, setOpen] = useState(false);

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
        ? "Pix manual na vitrine"
        : "Sem cobrança online"
      : cfg.payment_policy === "off"
        ? PAYMENT_POLICY_LABELS.off
        : PAYMENT_POLICY_LABELS[cfg.payment_policy]
    : null;

  return (
    <div
      className={cn(
        "mb-4 rounded-xl border",
        isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200/80 bg-white"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left rounded-xl transition-colors",
          isDark ? "hover:bg-white/[0.03]" : "hover:bg-gray-50"
        )}
      >
        <span className="material-symbols-outlined text-lg text-primary/80 shrink-0">help</span>
        <span className={cn("text-sm font-medium flex-1 min-w-0", surfaces.title)}>
          Como o status na agenda funciona
        </span>
        {currentLabel && !open ? (
          <span
            className={cn(
              "hidden sm:inline text-[11px] truncate max-w-[200px] px-2 py-0.5 rounded-full",
              isDark ? "bg-white/5 text-white/50" : "bg-gray-100 text-gray-500"
            )}
          >
            {currentLabel}
          </span>
        ) : null}
        <span className={cn("material-symbols-outlined text-base shrink-0", surfaces.muted)}>
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open ? (
        <div className={cn("px-3.5 pb-3.5 space-y-3 border-t", isDark ? "border-white/8" : "border-gray-100")}>
          {currentLabel ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-xs">
              <span className={cn("font-medium", surfaces.muted)}>Hoje:</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full font-medium",
                  isDark ? "bg-primary/15 text-primary" : "bg-primary/10 text-gray-800"
                )}
              >
                {currentLabel}
              </span>
              <Link
                href="/dashboard/pagamentos"
                className={cn("text-primary hover:underline", surfaces.muted)}
              >
                Receber pagamentos →
              </Link>
            </div>
          ) : null}

          <ul className="space-y-1.5">
            {SCENARIOS.map((s) => {
              const active = isScenarioActive(s.id, cfg, mpActive);
              return (
                <li
                  key={s.id}
                  className={cn(
                    "rounded-lg px-3 py-2.5 border transition-colors",
                    active
                      ? isDark
                        ? "border-primary/30 bg-primary/[0.06]"
                        : "border-primary/25 bg-primary/[0.04]"
                      : isDark
                        ? "border-transparent bg-white/[0.02]"
                        : "border-transparent bg-gray-50/80"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={cn("text-xs font-medium", surfaces.title)}>
                      {s.when}
                      {active ? (
                        <span className="ml-1 text-[10px] font-semibold text-primary normal-case">
                          · sua config
                        </span>
                      ) : null}
                    </span>
                    <StatusPill tone={s.statusTone} label={s.status} />
                  </div>
                  <p className={cn("text-[11px] mt-0.5", surfaces.muted)}>{s.hint}</p>
                  <p className={cn("text-[11px] mt-1 leading-snug", surfaces.subtitle)}>{s.detail}</p>
                </li>
              );
            })}
          </ul>

          <footer
            className={cn(
              "pt-3 mt-1 border-t space-y-2",
              isDark ? "border-white/8" : "border-gray-100"
            )}
          >
            <p className={cn("text-[10px] uppercase tracking-wide font-semibold", surfaces.muted)}>
              Legenda na agenda
            </p>
            <ul className={cn("space-y-1.5 text-[11px] leading-snug", surfaces.muted)}>
              <LegendItem
                dotClass="bg-emerald-500"
                title="Confirmado"
                surfaces={surfaces}
                text="Horário válido. Cliente pode comparecer (com ou sem ter pago online, conforme sua regra)."
              />
              <LegendItem
                dotClass="bg-amber-500"
                title="Agendado · aguardando MP"
                surfaces={surfaces}
                text="Reserva feita; pagamento obrigatório ainda não aprovado pelo Mercado Pago."
              />
              <LegendItem
                dotClass="bg-sky-500"
                title="Pago via Mercado Pago"
                surfaces={surfaces}
                text="Badge no agendamento quando o pagamento online foi confirmado (valor e ID no detalhe)."
              />
            </ul>
            <p className={cn("text-[11px] pt-1", surfaces.muted)}>
              O cliente agenda e paga sem conta obrigatória. Conta Agenndo é opcional para histórico.
            </p>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ tone, label }: { tone: "ok" | "warn"; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex px-1.5 py-px rounded text-[10px] font-medium",
        tone === "warn"
          ? "bg-amber-500/12 text-amber-800 dark:text-amber-200/90"
          : "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200/90"
      )}
    >
      {label}
    </span>
  );
}

function LegendItem({
  dotClass,
  title,
  text,
  surfaces,
}: {
  dotClass: string;
  title: string;
  text: string;
  surfaces: ReturnType<typeof getDashboardSurfaces>;
}) {
  return (
    <li className="flex gap-2">
      <span className={cn("size-1.5 rounded-full mt-1.5 shrink-0", dotClass)} />
      <span>
        <span className={cn("font-medium", surfaces.title)}>{title}</span>
        {" - "}
        {text}
      </span>
    </li>
  );
}
