import { type PlanId, type PaidPlanId, PAID_PLAN_IDS, getPaidTierPrice } from "./plans";

type TeamSize = "1" | "2-5" | "6-15" | "16+";

interface RecommendationInput {
  teamSize: TeamSize;
  dailyAppointments: number;
  averageTicket: number;
}

/**
 * Perfil de referência para o degrau mais acessível (paid_01 ≈ R$ 30):
 * 1 pessoa na equipe, ~8 atendimentos/dia, ticket médio ~R$ 30.
 *
 * O “volume econômico” não é só daily × ticket com peso igual: o ticket médio tem expoente
 * maior (impacto no faturamento típico); atendimentos/dia têm expoente menor (volume alto nem
 * sempre significa margem alta).
 */
const REF_DAILY_APPOINTMENTS = 8;
const REF_AVERAGE_TICKET = 30;
/** Expoentes: ticket > daily para refletir peso maior do valor do serviço. */
const DAILY_EXP = 0.62;
const TICKET_EXP = 1.22;

function economicSignal(dailyAppointments: number, averageTicket: number): number {
  const d = Math.max(1, Number(dailyAppointments) || 0);
  const t = Math.max(1, Number(averageTicket) || 0);
  return Math.pow(d, DAILY_EXP) * Math.pow(t, TICKET_EXP);
}

const REF_SIGNAL = economicSignal(REF_DAILY_APPOINTMENTS, REF_AVERAGE_TICKET);

/** Razão do sinal econômico em relação ao perfil de referência (1 ≈ ancoragem paid_01). */
function volumeRatio(dailyAppointments: number, averageTicket: number): number {
  const num = economicSignal(dailyAppointments, averageTicket);
  return REF_SIGNAL > 0 ? num / REF_SIGNAL : 0;
}

/** Até 8 passos pelo volume/ticket (antes do “empurrão” da equipe). */
function volumeStepsFromRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  if (ratio <= 1.08) return 0;
  if (ratio <= 1.32) return 1;
  if (ratio <= 1.62) return 2;
  if (ratio <= 2.0) return 3;
  if (ratio <= 2.48) return 4;
  if (ratio <= 3.05) return 5;
  if (ratio <= 3.85) return 6;
  return 7;
}

/**
 * Peso da equipe: equipes maiores sobem degraus, com incrementos mais suaves que o modelo antigo
 * para não punir quem é pequeno.
 */
function teamTierBase(teamSize: TeamSize): number {
  switch (teamSize) {
    case "1":
      return 0;
    case "2-5":
      return 2;
    case "6-15":
      return 5;
    case "16+":
      return 10;
    default:
      return 0;
  }
}

/** Qual dos 20 degraus (paid_01…paid_20) melhor reflete o perfil (produto idêntico em todos). */
function recommendedTierIndex(input: RecommendationInput): number {
  const { teamSize, dailyAppointments, averageTicket } = input;
  const r = volumeRatio(dailyAppointments, averageTicket);
  const steps = volumeStepsFromRatio(r);
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
      "Mensalidade conforme o perfil informado; produto completo e uso ilimitado no escopo declarado. Após o teste, cobrança no cartão (Stripe).",
    features: [
      {
        title: "Você já vê o valor mensal",
        sub: "O investimento é calculado a partir da equipe, ticket médio e volume declarados; o mesmo plano para todos os recursos.",
      },
      {
        title: "Teste sem pressa",
        sub: "Use tudo por pelo menos 7 dias grátis. Precisa de mais tempo para avaliar? Fale com o suporte e peça extensão do trial por até 1 mês em casos combinados.",
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
