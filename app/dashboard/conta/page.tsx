"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
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
import { useAppAlert } from "@/components/app-alert-provider";
import { BillingDocumentForm, hasBillingDocument } from "@/components/billing-fiscal-form";
import {
  clearImpersonationSession,
  regenerateImpersonateToken,
  startImpersonation,
} from "@/lib/auth/impersonation-client";
import { formatDateTimePtBr, getAuthHeaders } from "@/lib/utils";
import { copyTextToClipboard } from "@/lib/clipboard";
import { useTheme } from "@/lib/theme-context";
import {
  getSupportContactUrl,
  isYwpSupportActorEmail,
  SHARED_ACCESS_UNRECOGNIZED_MESSAGE,
  YWP_UNRECOGNIZED_ACCESS_MESSAGE,
} from "@/lib/ywp-support";

type Tab = "plano" | "seguranca";

/** Paid plan checkout: server must expose price env for the tier. */
type StripePlanPricing = "loading" | "ok" | "missing" | "error";

const INVOICES: { id: string; date: string; amount: number; status: string }[] = [];

const TOKEN_GENERATE_COOLDOWN_MS = 45_000;
const IMPERSONATE_RETRY_COOLDOWN_MS = 4_000;

type ImpersonationSessionApi = {
  id: string;
  perspective: "supporter" | "target";
  other_user_id: string;
  other_email: string | null;
  other_name: string | null;
  expires_at: string;
  created_at: string;
};

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
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { showAlert, showConfirm, showPhraseConfirm } = useAppAlert();
  const { business, profile, user } = useDashboard();
  const supportContactUrl = getSupportContactUrl();
  const [tab, setTab] = useState<Tab>("plano");
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [countdownTick, setCountdownTick] = useState(0);
  const [stripePlanPricing, setStripePlanPricing] = useState<StripePlanPricing>("loading");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [impersonateInput, setImpersonateInput] = useState("");
  const [impersonateBusy, setImpersonateBusy] = useState(false);
  const [tokenCooldownUntil, setTokenCooldownUntil] = useState<number | null>(null);
  const [impersonateRetryUntil, setImpersonateRetryUntil] = useState<number | null>(null);
  const [impersonationSessions, setImpersonationSessions] = useState<ImpersonationSessionApi[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [copyTokenDone, setCopyTokenDone] = useState(false);
  const [lastSignInLabel, setLastSignInLabel] = useState<string | null>(null);

  const loadImpersonationSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const r = await fetch("/api/impersonation/sessions", { credentials: "include" });
      const j = (await r.json()) as { sessions?: ImpersonationSessionApi[] };
      if (Array.isArray(j.sessions)) setImpersonationSessions(j.sessions);
      else setImpersonationSessions([]);
    } catch {
      setImpersonationSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const tokenCooldownSec =
    tokenCooldownUntil != null && Date.now() < tokenCooldownUntil
      ? Math.max(0, Math.ceil((tokenCooldownUntil - Date.now()) / 1000))
      : 0;
  const impersonateRetrySec =
    impersonateRetryUntil != null && Date.now() < impersonateRetryUntil
      ? Math.max(0, Math.ceil((impersonateRetryUntil - Date.now()) / 1000))
      : 0;

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

  const fullAccess = business ? hasFullServiceAccess(business) : true;
  const paidActive = business ? isPaidSubscriptionActive(business) : false;
  const deadlineMs = business ? primaryBillingDeadlineMs(business) : null;
  const remainingMs = deadlineMs != null ? deadlineMs - Date.now() : null;

  useEffect(() => {
    const id = window.setInterval(() => setCountdownTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isPaidPlanId(planForCheckout)) {
      setStripePlanPricing("ok");
      return;
    }
    setStripePlanPricing("loading");
    void fetch(`/api/stripe/pricing-config?planId=${encodeURIComponent(planForCheckout)}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          if (!cancelled) setStripePlanPricing("error");
          return;
        }
        const j = (await r.json()) as { configured?: boolean };
        if (!cancelled) setStripePlanPricing(j.configured === true ? "ok" : "missing");
      })
      .catch(() => {
        if (!cancelled) setStripePlanPricing("error");
      });
    return () => {
      cancelled = true;
    };
  }, [planForCheckout]);

  useEffect(() => {
    if (tab !== "seguranca") return;
    void loadImpersonationSessions();
    void createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (user?.last_sign_in_at) {
          setLastSignInLabel(formatDateTimePtBr(new Date(user.last_sign_in_at)));
        } else {
          setLastSignInLabel(null);
        }
      });
  }, [tab, loadImpersonationSessions]);

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
    stripePlanPricing === "ok" &&
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
      return "Assinatura em período de teste no Stripe (assinaturas antigas). Ao encerrar, a cobrança mensal segue no cartão cadastrado.";
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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
      try {
        await clearImpersonationSession();
      } catch {
        /* best-effort: evita ficar preso na impersonação ao voltar a entrar */
      }
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
    if (user?.isImpersonating) {
      showAlert("Encerre o acesso compartilhado (voltar à sua conta) antes de excluir a conta.", {
        title: "Exclusão indisponível",
      });
      return;
    }
    const step1 = await showConfirm({
      title: "Excluir conta",
      message:
        "Isso apaga sua conta e todos os dados do negócio (agenda, clientes, etc.). Esta ação não pode ser desfeita. Deseja continuar?",
      confirmLabel: "Continuar",
      cancelLabel: "Cancelar",
      variant: "danger",
    });
    if (!step1) return;
    const step2 = await showPhraseConfirm({
      title: "Confirmação final",
      message: "Para apagar permanentemente, digite a palavra indicada abaixo.",
      phrase: "EXCLUIR",
      confirmLabel: "Excluir definitivamente",
      cancelLabel: "Cancelar",
      inputPlaceholder: "Digite EXCLUIR em letras maiúsculas",
    });
    if (!step2) return;
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
              <div
                className={`rounded-xl border px-3 py-2.5 text-sm mb-3 ${
                  isLight
                    ? "border-red-300 bg-red-50 text-red-900"
                    : "border-red-500/40 bg-red-950/55 text-red-50"
                }`}
              >
                <p className={`font-bold ${isLight ? "text-red-900" : "text-red-100"}`}>Acesso limitado</p>
                <p className={`mt-1 text-xs leading-relaxed ${isLight ? "text-red-900/95" : "text-red-200/95"}`}>
                  Sua página pública não aceita novos agendamentos e o uso completo está suspenso até o plano estar ativo
                  ou o pagamento regularizado.
                </p>
              </div>
            )}

            {fullAccess && remainingMs != null && remainingMs > 0 && (
              <div
                className={`rounded-xl border px-3 py-3 mb-3 ${
                  isLight
                    ? "border-sky-200 bg-sky-50"
                    : "border-sky-400/35 bg-sky-950/50"
                }`}
              >
                <p
                  className={`text-[10px] font-bold uppercase tracking-wide ${
                    isLight ? "text-sky-800" : "text-sky-300"
                  }`}
                >
                  Contagem regressiva
                </p>
                <p
                  className={`text-xl font-extrabold tabular-nums ${
                    isLight ? "text-sky-950" : "text-sky-50"
                  }`}
                >
                  {formatCountdownPt(remainingMs)}
                </p>
                <p className={`text-xs mt-1 leading-relaxed ${isLight ? "text-sky-900" : "text-sky-200/95"}`}>
                  {deadlineHint}
                </p>
                {periodEnd && (
                  <p className={`text-[11px] mt-1 ${isLight ? "text-sky-800/80" : "text-sky-300/90"}`}>
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
                Cobrança via Stripe. O valor no checkout é o mesmo mensal (BRL) do plano acima. O teste de 7 dias é só o
                do app; não há trial adicional na assinatura Stripe.
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
            {stripePlanPricing === "missing" && !paidActive && !isEnterprisePlan && (
              <p
                className={`text-[11px] mt-2 ${isLight ? "text-amber-800" : "text-amber-200/95"}`}
              >
                Checkout indisponível: defina STRIPE_PRICE_PAID_01 … STRIPE_PRICE_PAID_20 (uma env por degrau com o ID{" "}
                <code className="font-mono">price_…</code> do Stripe).
              </p>
            )}
            {stripePlanPricing === "error" && !paidActive && !isEnterprisePlan && (
              <p
                className={`text-[11px] mt-2 ${isLight ? "text-amber-800" : "text-amber-200/95"}`}
              >
                Não foi possível verificar o Stripe no servidor (resposta inesperada). Recarregue a página; se persistir,
                confira se o dev server está íntegro (<code className="font-mono">.next</code> no mesmo volume que{" "}
                <code className="font-mono">node_modules</code>).
              </p>
            )}
            {hasPortal && (
              <p className="text-[11px] text-gray-500 mt-2">
                Para cancelar ou mudar cartão, use &quot;Fatura e método de pagamento&quot; (portal Stripe).
              </p>
            )}
          </div>

          {paidActive && business?.id && !hasBillingDocument(business) && (
            <p
              className={`text-[11px] rounded-lg border px-3 py-2 ${
                isLight
                  ? "text-amber-800 border-amber-200 bg-amber-50"
                  : "text-amber-100 border-amber-500/40 bg-amber-950/45"
              }`}
            >
              Para fins de nota fiscal e declaração de imposto, informe seu <strong>CPF ou CNPJ</strong> no bloco abaixo
              (nome e endereço ficam no cadastro do Stripe).
            </p>
          )}

          {paidActive && business?.id ? (
            <BillingDocumentForm businessId={business.id} business={business} />
          ) : null}

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
          {!user?.isImpersonating && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Acesso compartilhado ao dashboard</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Esta funcionalidade permite que mais pessoas administrem sua conta. Basta compartilhar seu token de acesso
                com quem você autorizar. Gerar um novo token invalida o anterior para novas entradas; quem já estiver com o
                painel aberto na sua conta continua até a sessão expirar (até 8 horas) ou até sair.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <label className="text-xs font-medium text-gray-600 sm:pt-0.5 sm:flex-1 sm:min-w-0">
                  Seu token de acesso (compartilhe para alguém acessar sua conta)
                </label>
                <button
                  type="button"
                  disabled={
                    shareBusy ||
                    (tokenCooldownUntil != null && Date.now() < tokenCooldownUntil)
                  }
                  onClick={() => {
                    if (tokenCooldownUntil != null && Date.now() < tokenCooldownUntil) return;
                    setShareBusy(true);
                    void regenerateImpersonateToken()
                      .then((t) => {
                        setShareToken(t);
                        setTokenCooldownUntil(Date.now() + TOKEN_GENERATE_COOLDOWN_MS);
                        void loadImpersonationSessions();
                      })
                      .catch((e) =>
                        showAlert(e instanceof Error ? e.message : "Não foi possível gerar o token.", {
                          title: "Token",
                        })
                      )
                      .finally(() => setShareBusy(false));
                  }}
                  className="w-full sm:w-auto shrink-0 px-4 py-2.5 bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-800 text-sm font-semibold rounded-xl transition-all disabled:opacity-60 text-center sm:text-left"
                >
                  {shareBusy
                    ? "Gerando…"
                    : tokenCooldownSec > 0
                      ? `Aguarde ${tokenCooldownSec}s`
                      : shareToken
                        ? "Gerar novo token (invalida o anterior)"
                        : "Gerar token de acesso"}
                </button>
              </div>
              {shareToken ? (
                <div className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
                    <input
                      readOnly
                      value={shareToken}
                      className="flex-1 min-h-10 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs font-mono text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          const ok = await copyTextToClipboard(shareToken);
                          if (ok) {
                            setCopyTokenDone(true);
                            window.setTimeout(() => setCopyTokenDone(false), 2000);
                          } else {
                            showAlert(
                              "Não foi possível copiar automaticamente. Selecione o texto no campo ao lado e use Ctrl+C (ou copiar no menu).",
                              { title: "Copiar token" }
                            );
                          }
                        })();
                      }}
                      className="px-4 py-2 min-h-10 bg-primary hover:bg-primary/90 text-black text-sm font-bold rounded-xl shrink-0 w-full sm:w-auto"
                    >
                      {copyTokenDone ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    O token antigo deixa de funcionar para novas conexões. Sessões já abertas com o token anterior não são
                    encerradas automaticamente.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {!user?.isImpersonating && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Acessar a conta de outro usuário</h3>
              <label className="text-xs font-medium text-gray-600">Acessar a conta de outro usuário (cole o token)</label>
              <input
                type="text"
                value={impersonateInput}
                onChange={(e) => setImpersonateInput(e.target.value.replace(/\s/g, "").toLowerCase())}
                placeholder="ex.: a1b2c3d4e5f6789012345678abcdef01"
                autoComplete="off"
                spellCheck={false}
                className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm font-mono"
              />
              <p className="text-xs text-gray-500">Aceita token de acesso (hash de 32 caracteres).</p>
              <button
                type="button"
                disabled={
                  impersonateBusy ||
                  impersonateRetrySec > 0 ||
                  !/^[0-9a-f]{32}$/.test(impersonateInput.trim())
                }
                onClick={() => {
                  if (impersonateRetrySec > 0) return;
                  setImpersonateBusy(true);
                  void startImpersonation(impersonateInput.trim())
                    .catch((e) => {
                      showAlert(e instanceof Error ? e.message : "Falha ao entrar na conta.", {
                        title: "Acesso compartilhado",
                      });
                      setImpersonateRetryUntil(Date.now() + IMPERSONATE_RETRY_COOLDOWN_MS);
                      setImpersonateBusy(false);
                    });
                }}
                className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-black font-bold rounded-xl text-sm transition-all"
              >
                {impersonateBusy
                  ? "Entrando…"
                  : impersonateRetrySec > 0
                    ? `Aguarde ${impersonateRetrySec}s para tentar de novo`
                    : "Entrar nesta conta"}
              </button>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Conta vinculada</h3>
            {user?.isImpersonating ? (
              <div
                className={`rounded-lg border px-3 py-2.5 text-xs mb-3 leading-relaxed ${
                  isLight
                    ? "border-amber-200 bg-amber-50 text-amber-950"
                    : "border-amber-500/40 bg-amber-950/45 text-amber-50"
                }`}
              >
                <p className={`font-bold ${isLight ? "text-amber-950" : "text-amber-100"}`}>
                  Acesso compartilhado (conta de outro usuário)
                </p>
                <p className={`mt-1 ${isLight ? "text-amber-950" : "text-amber-100/95"}`}>
                  Painel do negócio: <strong>{business?.name}</strong> — {profile?.email}
                </p>
                <p className={`mt-1 ${isLight ? "text-amber-900/95" : "text-amber-200/90"}`}>
                  Sessão na conta (Google): {user.email ?? user.realUserId}
                </p>
                <p
                  className={`mt-2 pt-2 border-t text-[11px] leading-relaxed ${
                    isLight ? "border-amber-300/70 text-amber-900/90" : "border-amber-500/30 text-amber-100/90"
                  }`}
                >
                  {SHARED_ACCESS_UNRECOGNIZED_MESSAGE}{" "}
                  {supportContactUrl ? (
                    <a
                      href={supportContactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`font-semibold underline underline-offset-2 ${
                        isLight ? "text-amber-950 hover:text-amber-800" : "text-amber-50 hover:text-white"
                      }`}
                    >
                      Suporte Agenndo
                    </a>
                  ) : null}
                </p>
              </div>
            ) : null}
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

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Sessão e acesso compartilhado</h3>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="material-symbols-outlined text-primary text-xl">computer</span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm font-medium">Este navegador</p>
                <p className="text-gray-500 text-xs">
                  {lastSignInLabel ? (
                    <>Último login nesta sessão: {lastSignInLabel}</>
                  ) : (
                    <>Sessão ativa (Supabase Auth)</>
                  )}
                </p>
              </div>
              <span className="size-2 rounded-full bg-primary shrink-0" title="Sessão ativa" />
            </div>

            <div>
              <p
                className={`text-xs font-semibold mb-2 ${isLight ? "text-gray-700" : "text-white/90"}`}
              >
                Painel aberto via token (até expirar ou sair)
              </p>
              {sessionsLoading ? (
                <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>Carregando…</p>
              ) : impersonationSessions.length === 0 ? (
                <p className={`text-xs leading-relaxed ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                  Nenhuma sessão de acesso compartilhado ativa no momento (ou a lista não pôde ser carregada no servidor).
                </p>
              ) : (
                <ul className="space-y-2">
                  {impersonationSessions.map((s) => {
                    const label = s.other_name?.trim() || s.other_email || `${s.other_user_id.slice(0, 8)}…`;
                    const otherIsYwp = isYwpSupportActorEmail(s.other_email);
                    return (
                      <li
                        key={s.id}
                        className={`text-xs leading-relaxed rounded-lg border px-3 py-2 ${
                          isLight
                            ? "border-gray-100 bg-gray-50 text-gray-700"
                            : "border-white/[0.08] bg-white/[0.05] text-gray-200"
                        }`}
                      >
                        {s.perspective === "supporter" ? (
                          <>
                            <span className={isLight ? "font-semibold text-gray-900" : "font-semibold text-white"}>
                              Você está no painel de:
                            </span>{" "}
                            {label}
                            <span
                              className={`block mt-1 ${isLight ? "text-gray-500" : "text-gray-400"}`}
                            >
                              Expira em {formatDateTimePtBr(s.expires_at)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className={isLight ? "font-semibold text-gray-900" : "font-semibold text-white"}>
                              Alguém está no seu painel:
                            </span>{" "}
                            <span className="font-medium">{label}</span>
                            {otherIsYwp ? (
                              <span className="text-[11px] opacity-90"> (Suporte técnico YWP)</span>
                            ) : null}
                            <span
                              className={`block mt-1 ${isLight ? "text-gray-500" : "text-gray-400"}`}
                            >
                              Expira em {formatDateTimePtBr(s.expires_at)}
                            </span>
                            <span
                              className={`block mt-1.5 text-[10px] leading-snug ${isLight ? "text-gray-600" : "text-gray-400"}`}
                            >
                              {YWP_UNRECOGNIZED_ACCESS_MESSAGE}{" "}
                              {supportContactUrl ? (
                                <a
                                  href={supportContactUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`font-semibold underline underline-offset-2 ${
                                    isLight ? "text-gray-800" : "text-primary"
                                  }`}
                                >
                                  Canais oficiais YWP
                                </a>
                              ) : null}
                            </span>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p
                className={`text-[11px] mt-2 leading-relaxed ${isLight ? "text-gray-400" : "text-gray-500"}`}
              >
                Gerar novo token não encerra essas sessões; só impede novas entradas com o hash antigo.
              </p>
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
