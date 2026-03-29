/**
 * Regras: acesso completo a agendamentos (painel + página pública) quando:
 * - Assinatura Stripe active ou trialing; ou
 * - past_due/unpaid dentro de billing_issue_deadline (5 dias após primeira falha); ou
 * - Sem assinatura ativa e ainda antes de trial_ends_at (7 dias desde criação do negócio).
 */

export type BusinessBillingFields = {
  plan?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
  trial_ends_at?: string | null;
  billing_issue_deadline?: string | null;
  created_at?: string | null;
};

function effectiveTrialEndMs(b: BusinessBillingFields): number | null {
  if (b.trial_ends_at) {
    const t = new Date(b.trial_ends_at).getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (b.created_at) {
    const c = new Date(b.created_at).getTime();
    if (Number.isNaN(c)) return null;
    return c + 7 * 864e5 * 1000;
  }
  return null;
}

export function hasFullServiceAccess(b: BusinessBillingFields): boolean {
  const now = Date.now();
  const subId = b.stripe_subscription_id?.trim();
  const st = b.subscription_status?.trim();

  if (subId && (st === "active" || st === "trialing")) return true;

  if (subId && (st === "past_due" || st === "unpaid")) {
    const grace = b.billing_issue_deadline ? new Date(b.billing_issue_deadline).getTime() : 0;
    if (!Number.isNaN(grace) && grace > now) return true;
    return false;
  }

  const trialEnd = effectiveTrialEndMs(b);
  if (trialEnd != null && trialEnd > now) return true;
  return false;
}

export type PublicBookingLockInfo = {
  blocked: boolean;
  message: string;
};

export function getPublicBookingLockInfo(b: BusinessBillingFields): PublicBookingLockInfo {
  if (hasFullServiceAccess(b)) {
    return { blocked: false, message: "" };
  }

  const subId = b.stripe_subscription_id?.trim();
  const st = b.subscription_status?.trim();
  const now = Date.now();

  if (subId && (st === "past_due" || st === "unpaid")) {
    const grace = b.billing_issue_deadline ? new Date(b.billing_issue_deadline).getTime() : 0;
    if (!Number.isNaN(grace) && grace <= now) {
      return {
        blocked: true,
        message:
          "Agendamentos online estão suspensos: o pagamento não foi confirmado no prazo. O responsável pode regularizar em Conta → Meu plano.",
      };
    }
  }

  if (subId && st && st !== "canceled") {
    return {
      blocked: true,
      message:
        "Agendamentos online estão temporariamente indisponíveis. O responsável deve concluir a assinatura em Conta → Meu plano.",
    };
  }

  return {
    blocked: true,
    message:
      "O período de teste gratuito deste negócio terminou. Agendamentos online voltam quando o plano for ativado.",
  };
}

/** Prazo principal para UI (conta): trial Stripe, trial app ou fim da tolerância de pagamento. */
export function primaryBillingDeadlineMs(b: BusinessBillingFields): number | null {
  const subId = b.stripe_subscription_id?.trim();
  const st = b.subscription_status?.trim();

  if (subId && (st === "trialing" || st === "active")) {
    const p = b.subscription_current_period_end ? new Date(b.subscription_current_period_end).getTime() : NaN;
    return Number.isNaN(p) ? null : p;
  }

  if (subId && (st === "past_due" || st === "unpaid")) {
    const g = b.billing_issue_deadline ? new Date(b.billing_issue_deadline).getTime() : NaN;
    return Number.isNaN(g) ? null : g;
  }

  return effectiveTrialEndMs(b);
}

export function formatCountdownPt(msRemaining: number): string {
  if (msRemaining <= 0) return "Encerrado";
  const sec = Math.floor(msRemaining / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d} dia${d === 1 ? "" : "s"} e ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m} min`;
  return "Menos de 1 min";
}

export function isPaidSubscriptionActive(b: BusinessBillingFields): boolean {
  const st = b.subscription_status?.trim();
  return Boolean(b.stripe_subscription_id?.trim() && (st === "active" || st === "trialing"));
}
