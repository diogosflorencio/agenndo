import type { PlanId } from "@/lib/plans";

/**
 * `price_...` no Stripe por variante interna plano_1 | plano_2 | plano_3.
 * Ordem: STRIPE_PRICE_PLANO_1/2/3 → legados (infra / perfil / starter…).
 */
export function getStripePriceIdForPlan(planId: PlanId): string | null {
  if (planId === "free") return null;
  const raw =
    planId === "plano_1"
      ? process.env.STRIPE_PRICE_PLANO_1 ??
        process.env.STRIPE_PRICE_PLANO_UNICO_INFRAESTRUTURA_1 ??
        process.env.STRIPE_PRICE_PERFIL_LEVE ??
        process.env.STRIPE_PRICE_STARTER
      : planId === "plano_2"
        ? process.env.STRIPE_PRICE_PLANO_2 ??
          process.env.STRIPE_PRICE_PLANO_UNICO_INFRAESTRUTURA_2 ??
          process.env.STRIPE_PRICE_PERFIL_PADRAO ??
          process.env.STRIPE_PRICE_GROWTH
        : planId === "plano_3"
          ? process.env.STRIPE_PRICE_PLANO_3 ??
            process.env.STRIPE_PRICE_PLANO_UNICO_INFRAESTRUTURA_3 ??
            process.env.STRIPE_PRICE_PERFIL_INTENSO ??
            process.env.STRIPE_PRICE_ENTERPRISE
          : undefined;
  const id = raw?.trim();
  return id && id.startsWith("price_") ? id : null;
}

export function isStripeConfiguredForPlan(planId: PlanId): boolean {
  return planId === "free" || getStripePriceIdForPlan(planId) !== null;
}
