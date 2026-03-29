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

/**
 * Referência do paid_01 (R$ 29,90): ~1 trabalhador, ~5 atendimentos/dia, ticket médio ~R$ 30.
 * Volume diário de referência = 5 × 30. Os outros degraus sobem conforme esse múltiplo e o tamanho da equipe.
 */
const REF_DAILY_APPOINTMENTS = 5;
const REF_AVERAGE_TICKET = 30;
const REF_DAILY_VOLUME = REF_DAILY_APPOINTMENTS * REF_AVERAGE_TICKET;

/** Índice 0…7 dentro do “bloco” de volume (múltiplos da referência 5×30). */
function volumeStepsFromBaseline(dailyAppointments: number, averageTicket: number): number {
  const daily = Math.max(0, Number(dailyAppointments) || 0);
  const ticket = Math.max(0, Number(averageTicket) || 0);
  const volume = daily * ticket;
  const v = volume <= 0 ? 0 : volume / REF_DAILY_VOLUME;

  if (v <= 1.12) return 0;
  if (v <= 1.45) return 1;
  if (v <= 1.95) return 2;
  if (v <= 2.65) return 3;
  if (v <= 3.6) return 4;
  if (v <= 5) return 5;
  if (v <= 7.5) return 6;
  return 7;
}

/** Piso do degrau conforme tamanho da equipe (progressão além do solo “5×30”). */
function teamTierBase(teamSize: TeamSize): number {
  switch (teamSize) {
    case "1":
      return 0;
    case "2-5":
      return 3;
    case "6-15":
      return 7;
    case "16+":
      return 12;
    default:
      return 0;
  }
}

/** Qual dos 20 degraus (paid_01…paid_20) melhor reflete o perfil — produto idêntico em todos. */
function recommendedTierIndex(input: RecommendationInput): number {
  const { teamSize, dailyAppointments, averageTicket } = input;
  const steps = volumeStepsFromBaseline(dailyAppointments, averageTicket);
  const base = teamTierBase(teamSize);
  return base + steps;
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
