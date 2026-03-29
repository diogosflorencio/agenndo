import { normalizePlanId, isPaidPlanId, type PlanId, type PaidPlanId } from "./plans";
import {
  calculateDynamicPlan,
  getDynamicPlanPresentationForTier,
  type DynamicPlanResult,
} from "./planCalculator";

const STORAGE_KEY = "agenndo_pricing_lock";

export type PricingLockPayload = {
  tier: PlanId;
  priceDisplay: number;
  lockedAt: string;
};

export function readPricingLock(): PricingLockPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PricingLockPayload> & { tier?: string };
    const tier = normalizePlanId(p.tier ?? null);
    if (!isPaidPlanId(tier)) return null;
    if (typeof p.priceDisplay !== "number" || Number.isNaN(p.priceDisplay)) return null;
    return {
      tier,
      priceDisplay: p.priceDisplay,
      lockedAt: typeof p.lockedAt === "string" ? p.lockedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writePricingLock(tier: PlanId, priceDisplay: number): void {
  if (typeof window === "undefined") return;
  if (!isPaidPlanId(tier)) return;
  const payload: PricingLockPayload = {
    tier,
    priceDisplay,
    lockedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function resolveEffectiveDynamicPlan(
  answers: { teamSize: string; dailyAppointments: number; averageTicket: number },
  lock: PricingLockPayload | null,
  profile: {
    recommended_plan: string | null;
    recommended_price_display: number | null;
  } | null
): DynamicPlanResult {
  const fromAnswers = calculateDynamicPlan(
    answers.teamSize,
    answers.dailyAppointments,
    answers.averageTicket
  );

  if (lock && isPaidPlanId(lock.tier)) {
    const base = getDynamicPlanPresentationForTier(lock.tier as PaidPlanId);
    return { ...base, monthlyPrice: lock.priceDisplay };
  }

  if (profile?.recommended_plan != null) {
    const rec = normalizePlanId(profile.recommended_plan);
    if (isPaidPlanId(rec)) {
      const base = getDynamicPlanPresentationForTier(rec);
      const price =
        profile.recommended_price_display != null && !Number.isNaN(Number(profile.recommended_price_display))
          ? Number(profile.recommended_price_display)
          : base.monthlyPrice;
      return { ...base, monthlyPrice: price };
    }
  }

  return fromAnswers;
}
