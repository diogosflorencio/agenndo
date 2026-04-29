import type { PlanId } from "@/lib/plans";

function env(name: string): string | undefined {
  return process.env[name]?.trim();
}

/**
 * 20 preços Stripe (`price_…`), um por degrau `paid_01` … `paid_20` (menor → maior valor).
 * Env: `STRIPE_PRICE_PAID_01` … `STRIPE_PRICE_PAID_20`.
 *
 * **Só use isto no servidor** (rotas API, RSC, `getServerSideProps`). Em Client Components o
 * `process.env` não inclui estas chaves; use `GET /api/stripe/pricing-config?planId=…`.
 */
export function getStripePriceIdForPlan(planId: PlanId): string | null {
  if (planId === "free" || planId === "plan_enterprise") return null;

  const m = /^paid_(0[1-9]|1[0-9]|20)$/.exec(planId);
  if (!m) return null;
  const key = `STRIPE_PRICE_PAID_${m[1]}`;
  const id = env(key);
  return id?.startsWith("price_") ? id : null;
}

export function isStripeConfiguredForPlan(planId: PlanId): boolean {
  return planId === "free" || planId === "plan_enterprise" || getStripePriceIdForPlan(planId) !== null;
}
