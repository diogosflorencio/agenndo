import {
  type PlanId,
  type PaidPlanId,
  isPaidPlanId,
  PAID_PLAN_IDS,
  getPaidTierPrice,
} from "./plans";

type TeamSize = "1" | "2-5" | "6-15" | "16+";

interface RecommendationInput {
  teamSize: TeamSize;
  dailyAppointments: number;
  averageTicket: number;
}

/** Qual dos 20 degraus (paid_01…paid_20) melhor reflete o perfil — produto idêntico em todos. */
function recommendedTierIndex(input: RecommendationInput): number {
  const { teamSize, dailyAppointments, averageTicket } = input;

  if (teamSize === "1") {
    if (averageTicket > 85 || dailyAppointments > 25) return 3;
    if (averageTicket > 55 || dailyAppointments > 12) return 2;
    if (averageTicket > 35 || dailyAppointments > 5) return 1;
    return 0;
  }

  if (teamSize === "2-5") {
    const load = dailyAppointments * 3;
    if (load > 80 || averageTicket > 190) return 9;
    if (load > 50 || averageTicket > 140) return 7;
    if (load > 25 || averageTicket > 90) return 5;
    return 4;
  }

  if (teamSize === "6-15") {
    const load = dailyAppointments * 7;
    if (load > 120 || averageTicket > 220) return 16;
    if (load > 70 || averageTicket > 160) return 13;
    if (load > 35) return 10;
    return 8;
  }

  const load = dailyAppointments * 12;
  if (load > 150 || averageTicket > 280) return 19;
  if (load > 90 || averageTicket > 200) return 17;
  if (load > 45) return 15;
  return 12;
}

export function calculateRecommendedPlan(input: RecommendationInput): PlanId {
  const idx = Math.min(PAID_PLAN_IDS.length - 1, Math.max(0, recommendedTierIndex(input)));
  return PAID_PLAN_IDS[idx];
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
    highlight:
      "Mensalidade conforme o perfil do negócio; produto completo e uso ilimitado no escopo declarado. Após o teste, cobrança no cartão (Stripe).",
    features: [
      {
        title: "Tudo ilimitado no produto",
        sub: "Colaboradores, serviços e agendamentos — alinhados ao que você informou na inscrição.",
      },
      {
        title: "Infraestrutura dedicada",
        sub: "Dimensionada conforme as características da sua empresa no momento da assinatura.",
      },
      {
        title: "Suporte via WhatsApp",
        sub: "Atendimento direto pelo WhatsApp quando precisar.",
      },
      {
        title: "Uso coerente com o declarado",
        sub: "Se o uso for muito diferente do apresentado, a YWP reserva-se o direito de intervir, conforme os Termos de Serviço.",
      },
      {
        title: "Teste grátis e cobrança recorrente",
        sub: "7 dias para avaliar; em seguida mensalidade no cartão, no degrau indicado para o seu perfil.",
      },
    ],
  };
}

export function calculateDynamicPlan(
  teamSize: string,
  dailyVolume: number,
  avgTicket: number
): DynamicPlanResult {
  const ts =
    teamSize === "1"
      ? "1"
      : teamSize === "2-5"
        ? "2-5"
        : teamSize === "6-15"
          ? "6-15"
          : "16+";
  const idx = recommendedTierIndex({
    teamSize: ts as TeamSize,
    dailyAppointments: dailyVolume,
    averageTicket: avgTicket,
  });
  const tier = PAID_PLAN_IDS[idx];
  return { tier, monthlyPrice: getPaidTierPrice(tier), ...planOfferCopy() };
}

export function getDynamicPlanPresentationForTier(tier: PaidPlanId): DynamicPlanResult {
  return {
    tier,
    monthlyPrice: getPaidTierPrice(tier),
    ...planOfferCopy(),
  };
}
