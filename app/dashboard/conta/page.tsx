"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import {
  getPlan,
  formatPrice,
  normalizePlanId,
  isPaidPlanId,
  DEFAULT_CHECKOUT_PLAN,
  type PaidPlanId,
} from "@/lib/plans";
import { describeSubscriptionStatus, formatPeriodEnd } from "@/lib/subscription-ui";
import {
  formatCountdownPt,
  hasFullServiceAccess,
  isPaidSubscriptionActive,
  primaryBillingDeadlineMs,
} from "@/lib/billing-access";
import { isStripeConfiguredForPlan } from "@/lib/stripe/prices";
import { useAppAlert } from "@/components/app-alert-provider";

type Tab = "plano" | "seguranca";

const INVOICES: { id: string; date: string; amount: number; status: string }[] = [];

function StripeQuerySync() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const s = searchParams.get("stripe");
    if (s === "success" || s === "cancel") {
      window.history.replaceState({}, "", "/dashboard/conta");
    }
  }, [searchParams]);
  return null;
}

export default function ContaPage() {
  const { showAlert } = useAppAlert();
  const { business, profile } = useDashboard();
  const [tab, setTab] = useState<Tab>("plano");
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [countdownTick, setCountdownTick] = useState(0);

  const safePlan = normalizePlanId(business?.plan ?? null);
  const planInfo = getPlan(safePlan);

  const subUi = describeSubscriptionStatus(safePlan, business?.subscription_status);
  const periodEnd = formatPeriodEnd(business?.subscription_current_period_end ?? null);
  const hasPortal = Boolean(business?.stripe_customer_id);

  const recommendedPlan = normalizePlanId(profile?.recommended_plan ?? null);
  const planForCheckout: PaidPlanId = isPaidPlanId(safePlan)
    ? safePlan
    : isPaidPlanId(recommendedPlan)
      ? recommendedPlan
      : DEFAULT_CHECKOUT_PLAN;
  const checkoutPlanInfo = getPlan(planForCheckout);
  const stripeOk = isStripeConfiguredForPlan(planForCheckout);

  const fullAccess = business ? hasFullServiceAccess(business) : true;
  const paidActive = business ? isPaidSubscriptionActive(business) : false;
  const deadlineMs = business ? primaryBillingDeadlineMs(business) : null;
  const remainingMs = deadlineMs != null ? deadlineMs - Date.now() : null;

  useEffect(() => {
    const id = window.setInterval(() => setCountdownTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  void countdownTick;

  const st = business?.subscription_status?.trim();
  const inPaymentGrace =
    Boolean(
      business?.stripe_subscription_id &&
        (st === "past_due" || st === "unpaid") &&
        business?.billing_issue_deadline &&
        new Date(business.billing_issue_deadline).getTime() > Date.now()
    );

  const isEnterprisePlan = safePlan === "plan_enterprise";

  const showSubscribeCta =
    !isEnterprisePlan &&
    stripeOk &&
    !paidActive &&
    !inPaymentGrace &&
    !(st === "past_due" || st === "unpaid");

  const periodRowLabel = (() => {
    if (st === "trialing") return "Fim do trial / próxima cobrança";
    if (st === "active") return "Próxima renovação";
    if (st === "past_due" || st === "unpaid") return "Prazo para regularizar pagamento";
    if (!business?.stripe_subscription_id) return "Fim do teste grátis";
    return "Fim do período / próxima renovação";
  })();

  const deadlineHint = (() => {
    if (st === "trialing") {
      return "Você está no trial da assinatura (Stripe). Quando acabar, a cobrança mensal será feita no cartão cadastrado.";
    }
    if (st === "active") {
      return "Assinatura ativa. A renovação ocorre automaticamente na data ao lado.";
    }
    if (st === "past_due" || st === "unpaid") {
      return "Houve falha na cobrança. Você tem até 5 dias para corrigir o cartão no portal — depois disso, agendamentos pela página pública e novas ações críticas ficam bloqueados.";
    }
    if (!business?.stripe_subscription_id || !st) {
      return "Teste grátis de 7 dias desde a criação do negócio. Depois, é preciso assinar para manter agendamentos online e o painel liberados.";
    }
    return subUi.detail;
  })();

  async function openPortal() {
    if (!business?.id) return;
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ businessId: business.id }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (res.ok && json.url) {
        window.location.href = json.url;
        return;
      }
      showAlert(json.error ?? "Portal indisponível.", { title: "Faturamento" });
    } finally {
      setPortalLoading(false);
    }
  }

  async function startCheckout() {
    if (!business?.id) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ businessId: business.id, planId: planForCheckout }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (res.ok && json.url) {
        window.location.href = json.url;
        return;
      }
      showAlert(json.error ?? "Não foi possível abrir o checkout.", { title: "Assinatura" });
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleSignOut() {
    if (signOutLoading) return;
    setSignOutLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch {
      setSignOutLoading(false);
      showAlert("Não foi possível sair. Tente de novo.", { title: "Sair" });
    }
  }

  async function handleDeleteAccount() {
    if (deleteLoading) return;
    if (
      !window.confirm(
        "Isso apaga sua conta e todos os dados do negócio (agenda, clientes, etc.). Esta ação não pode ser desfeita. Deseja continuar?"
      )
    ) {
      return;
    }
    const typed = window.prompt('Digite EXCLUIR em letras maiúsculas para confirmar:');
    if (typed !== "EXCLUIR") {
      if (typed !== null) showAlert("Confirmação incorreta. Nada foi alterado.", { title: "Excluir conta" });
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        showAlert(json.error ?? "Não foi possível excluir a conta.", { title: "Excluir conta" });
        setDeleteLoading(false);
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      showAlert("Erro de rede. Tente de novo.", { title: "Excluir conta" });
      setDeleteLoading(false);
    }
  }

  return (
    <div className="w-full">
      <Suspense fallback={null}>
        <StripeQuerySync />
      </Suspense>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conta</h1>
        <p className="text-gray-600 text-sm mt-1">
          Plano, faturamento e segurança da conta.
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl mb-6 shadow-sm">
        {[
          { key: "plano", label: "Meu plano", icon: "workspace_premium" },
          { key: "seguranca", label: "Segurança", icon: "security" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              tab === t.key ? "bg-primary text-black" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <span className="material-symbols-outlined text-sm hidden sm:block">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "plano" && (
        <div className="space-y-5">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-900">Seu plano</h2>
                  <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-semibold">
                    {subUi.badge}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  {paidActive
                    ? "Assinatura em dia. Detalhes no portal Stripe."
                    : safePlan === "free"
                      ? "Teste grátis ou plano sem cobrança ativa — assine para manter tudo liberado após o período."
                      : "Conclua ou regularize a assinatura para não perder agendamentos online."}
                </p>
                <p className="text-2xl font-extrabold text-gray-900">
                  {formatPrice(planInfo.price)}
                  {typeof planInfo.price === "number" && planInfo.price > 0 && (
                    <span className="text-sm text-gray-500 font-normal">/mês</span>
                  )}
                </p>
                {isEnterprisePlan && (
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                    Grandes operações, franquias e redes: fale com a equipe para proposta, SLA e onboarding dedicado.
                  </p>
                )}
                {subUi.detail && st !== "trialing" && st !== "active" && (
                  <p className="text-xs text-gray-500 mt-2">{subUi.detail}</p>
                )}
              </div>
              <span className="material-symbols-outlined text-primary text-4xl shrink-0">workspace_premium</span>
            </div>

            {!fullAccess && (
              <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-900 mb-3">
                <p className="font-bold">Acesso limitado</p>
                <p className="mt-1 text-xs leading-relaxed">
                  Sua página pública não aceita novos agendamentos e o uso completo está suspenso até o plano estar ativo
                  ou o pagamento regularizado.
                </p>
              </div>
            )}

            {fullAccess && remainingMs != null && remainingMs > 0 && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-sky-800">Contagem regressiva</p>
                <p className="text-xl font-extrabold text-sky-950 tabular-nums">{formatCountdownPt(remainingMs)}</p>
                <p className="text-xs text-sky-900 mt-1 leading-relaxed">{deadlineHint}</p>
                {periodEnd && (
                  <p className="text-[11px] text-sky-800/80 mt-1">
                    Data de referência: <span className="font-semibold">{periodEnd}</span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-gray-600 shrink-0">{periodRowLabel}</span>
                <span className="text-gray-900 font-semibold text-right">{periodEnd ?? "—"}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Cobrança via Stripe. O valor exibido acima é o do seu plano no app; no checkout você verá o mesmo preço
                mensal (BRL). Novas assinaturas incluem trial de 7 dias no cartão quando o Stripe estiver configurado
                assim.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              {showSubscribeCta && (
                <button
                  type="button"
                  disabled={checkoutLoading}
                  onClick={() => void startCheckout()}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-black font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">shopping_cart</span>
                  {checkoutLoading
                    ? "Redirecionando…"
                    : typeof checkoutPlanInfo.price === "number"
                      ? `Assinar — ${formatPrice(checkoutPlanInfo.price)}/mês`
                      : "Assinar"}
                </button>
              )}
              {hasPortal && (
                <button
                  type="button"
                  disabled={portalLoading}
                  onClick={() => void openPortal()}
                  className={`flex-1 py-2.5 disabled:opacity-60 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 ${
                    inPaymentGrace || (st === "past_due" || st === "unpaid")
                      ? "bg-amber-400 hover:bg-amber-500 text-black"
                      : "bg-white border border-gray-200 hover:bg-gray-50 text-gray-800"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">payments</span>
                  {portalLoading ? "Abrindo…" : "Fatura e método de pagamento"}
                </button>
              )}
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">support_agent</span>
                Suporte
              </a>
            </div>
            {!stripeOk && !paidActive && !isEnterprisePlan && (
              <p className="text-[11px] text-amber-800 mt-2">
                Checkout indisponível: defina STRIPE_PRICE_PAID_01 … STRIPE_PRICE_PAID_20 (uma env por degrau com o ID{" "}
                <code className="font-mono">price_…</code> do Stripe).
              </p>
            )}
            {hasPortal && (
              <p className="text-[11px] text-gray-500 mt-2">
                Para cancelar ou mudar cartão, use &quot;Fatura e método de pagamento&quot; (portal Stripe).
              </p>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">O que está incluído</h3>
            <div className="space-y-2">
              {planInfo.features.map((line) => (
                <div key={line} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="material-symbols-outlined text-primary text-base shrink-0">check_circle</span>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Histórico de faturas</h3>
              <p className="text-xs text-gray-500 mt-1">Use o portal Stripe para PDF e histórico completo.</p>
            </div>
            <div className="divide-y divide-gray-100">
              {INVOICES.length === 0 && (
                <p className="p-4 text-sm text-gray-500">Nenhuma fatura local — veja no portal Stripe.</p>
              )}
              {INVOICES.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-gray-900">{inv.date}</p>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {inv.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">
                      R$ {inv.amount.toFixed(2).replace(".", ",")}
                    </span>
                    <button className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                      <span className="material-symbols-outlined text-base">download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "seguranca" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Conta vinculada</h3>
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <GoogleIcon />
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-semibold text-sm">{profile?.full_name ?? "Usuário"}</p>
                <p className="text-gray-500 text-xs">{profile?.email ?? ""}</p>
                <p className="text-xs text-primary mt-0.5">Conta Google vinculada</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Sessão ativa</h3>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="material-symbols-outlined text-primary text-xl">computer</span>
              <div className="flex-1">
                <p className="text-gray-900 text-sm font-medium">Neste dispositivo</p>
                <p className="text-gray-500 text-xs">Último acesso: agora</p>
              </div>
              <span className="size-2 rounded-full bg-primary" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
            <button
              type="button"
              disabled={signOutLoading}
              onClick={() => void handleSignOut()}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 transition-all disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span className="text-sm font-medium">{signOutLoading ? "Saindo…" : "Sair da conta"}</span>
            </button>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">warning</span>
              Zona de perigo
            </h3>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Excluir sua conta é uma ação irreversível. Todos os dados, agendamentos e configurações serão permanentemente removidos.
            </p>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={() => void handleDeleteAccount()}
              className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-600 text-sm font-semibold rounded-xl border border-red-200 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-sm">delete_forever</span>
              {deleteLoading ? "Excluindo…" : "Excluir minha conta"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
