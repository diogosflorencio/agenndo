import { type PlanId, type PaidPlanId, isPaidPlanId } from "./plans";

type TeamSize = "1" | "2-5" | "6-15" | "16+";

interface RecommendationInput {
  teamSize: TeamSize;
  dailyAppointments: number;
  averageTicket: number;
}

export function calculateRecommendedPlan(input: RecommendationInput): PlanId {
  const { teamSize, dailyAppointments, averageTicket } = input;

  const isLargeTeam = teamSize === "16+" || teamSize === "6-15";
  const isHighVolume = dailyAppointments > 30;
  const isHighTicket = averageTicket > 150;

  const isMediumTeam = teamSize === "2-5";
  const isMediumVolume = dailyAppointments >= 10 && dailyAppointments <= 30;
  const isMediumTicket = averageTicket >= 50 && averageTicket <= 150;

  if (isLargeTeam || isHighVolume || isHighTicket) {
    return "plano_3";
  }

  if (isMediumTeam || isMediumVolume || isMediumTicket) {
    return "plano_2";
  }

  return "plano_1";
}

export interface DynamicPlanResult {
  tier: PlanId;
  monthlyPrice: number;
  infrastructure: string;
  highlight: string;
  features: { title: string; sub: string }[];
}

function planOfferCopy(): Pick<DynamicPlanResult, "infrastructure" | "highlight" | "features"> {
  return {
    infrastructure: "",
    highlight: "Valor mensal após o período de teste.",
    features: [
      { title: "Plano completo", sub: "Tudo que você precisa para receber agendamentos online." },
      { title: "Cobrança recorrente", sub: "Cartão via Stripe quando você assinar." },
      { title: "Teste grátis", sub: "Experimente antes de pagar." },
    ],
  };
}

export function calculateDynamicPlan(
  teamSize: string,
  dailyVolume: number,
  avgTicket: number
): DynamicPlanResult {
  const collaborators = teamSize === "1" ? 1 : teamSize === "2-5" ? 3 : 7;
  const load = collaborators * dailyVolume;

  if (load <= 10 && avgTicket < 80) {
    return { tier: "plano_1", monthlyPrice: 49.9, ...planOfferCopy() };
  }
  if (load <= 30 && avgTicket < 200) {
    return { tier: "plano_2", monthlyPrice: 89.9, ...planOfferCopy() };
  }
  if (load <= 70) {
    return { tier: "plano_2", monthlyPrice: 149.9, ...planOfferCopy() };
  }
  return { tier: "plano_3", monthlyPrice: 229.9, ...planOfferCopy() };
}

export function getDynamicPlanPresentationForTier(tier: PaidPlanId): DynamicPlanResult {
  const monthlyPrice =
    tier === "plano_1" ? 49.9 : tier === "plano_2" ? 89.9 : 229.9;
  return { tier, monthlyPrice, ...planOfferCopy() };
}
