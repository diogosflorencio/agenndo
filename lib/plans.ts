/** 20 degraus de preço (paid_01 … paid_20): mesmo produto; valor mensal conforme escada Stripe. */
export const PAID_PLAN_IDS = [
  "paid_01",
  "paid_02",
  "paid_03",
  "paid_04",
  "paid_05",
  "paid_06",
  "paid_07",
  "paid_08",
  "paid_09",
  "paid_10",
  "paid_11",
  "paid_12",
  "paid_13",
  "paid_14",
  "paid_15",
  "paid_16",
  "paid_17",
  "paid_18",
  "paid_19",
  "paid_20",
] as const;

export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

export type PlanId = "free" | "plan_enterprise" | PaidPlanId;

export const PLANO_LABEL = "Plano";

/** Plano sugerido no checkout quando ainda não há tier definido (piso do catálogo). */
export const DEFAULT_CHECKOUT_PLAN: PaidPlanId = "paid_01";

/**
 * Valores mensais (BRL) por degrau (espelho dos 20 preços recorrentes no Stripe; paid_01 = menor … paid_20 = maior).
 * Piso pensado para micro negócio (perfil de referência no planCalculator). Atualize os Price IDs
 * no Stripe / env quando mudar estes valores.
 */
const LADDER_PRICES: readonly number[] = [
  30, 42, 54, 68, 84, 100, 118, 138, 158, 182,
  208, 236, 268, 302, 340, 382, 428, 478, 532, 585,
];

if (LADDER_PRICES.length !== PAID_PLAN_IDS.length) {
  throw new Error(`plans: escada ${LADDER_PRICES.length} ≠ ${PAID_PLAN_IDS.length} ids`);
}

/**
 * Itens de “O que está incluído”, iguais em qualquer plano (grátis, degraus pagos ou enterprise).
 * O preço varia pelo perfil; o escopo de produto não é limitado por “1 colaborador / 5 serviços” etc.
 */
export const UNIVERSAL_PLAN_INCLUSION: readonly string[] = [
  "Produto completo: página pública de agendamento, painel, clientes, equipe, financeiro e notificações",
  "Uso ilimitado de colaboradores, serviços e agendamentos, coerente com o perfil informado na inscrição",
  "Infraestrutura dedicada dimensionada conforme as características da sua empresa no momento da assinatura",
  "Suporte via WhatsApp",
  "Caso o uso real seja muito diferente do perfil apresentado na inscrição, a YWP reserva-se o direito de intervir ou propor ajustes, conforme os Termos de Serviço.",
];

/** Lista única para qualquer degrau pago: preço muda; mensagem de inclusão é a mesma. */
const PAID_FEATURES: readonly string[] = [...UNIVERSAL_PLAN_INCLUSION];

const PAID_LIMITS = { appointments: Infinity, collaborators: Infinity, services: Infinity } as const;

function buildPaidPlans(): Record<PaidPlanId, Plan> {
  const acc = {} as Record<PaidPlanId, Plan>;
  for (let i = 0; i < PAID_PLAN_IDS.length; i++) {
    const id = PAID_PLAN_IDS[i];
    const price = LADDER_PRICES[i];
    acc[id] = {
      id,
      label: PLANO_LABEL,
      price,
      limits: { ...PAID_LIMITS },
      features: [...PAID_FEATURES],
    };
  }
  return acc;
}

export interface Plan {
  id: PlanId;
  label: string;
  /** null = Enterprise (sob consulta) */
  price: number | null;
  trialDays?: number;
  limits: {
    appointments: number;
    collaborators: number;
    services: number;
  };
  features: string[];
  highlight?: boolean;
  badge?: string;
}

const PAID_PLANS = buildPaidPlans();

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    label: "Grátis",
    price: 0,
    trialDays: 7,
    limits: { appointments: 30, collaborators: 1, services: 5 },
    features: [...UNIVERSAL_PLAN_INCLUSION],
    badge: "7 dias grátis",
  },
  plan_enterprise: {
    id: "plan_enterprise",
    label: "Enterprise",
    price: null,
    limits: { appointments: Infinity, collaborators: Infinity, services: Infinity },
    features: [
      "Operações de grande porte ou necessidades especiais (múltiplas unidades, contrato, SLA): proposta e valor sob consulta",
      ...UNIVERSAL_PLAN_INCLUSION,
    ],
    badge: "Sob consulta",
  },
  ...PAID_PLANS,
};

const PAID_ID_SET = new Set<string>(PAID_PLAN_IDS);

/** Mapeia valores antigos (BD / metadata Stripe / onboarding). */
export function normalizePlanId(raw: string | null | undefined): PlanId {
  if (!raw) return "free";
  const legacy: Record<string, PlanId> = {
    starter: "paid_02",
    growth: "paid_04",
    enterprise: "plan_enterprise",
    plano_1: "paid_02",
    plano_2: "paid_04",
    plano_3: "paid_09",
  };
  /** Migração: versões antigas com paid_21 … paid_28 → último degrau atual. */
  if (/^paid_(2[1-8])$/.test(raw)) return "paid_20";
  const v = legacy[raw] ?? (raw as PlanId);
  if (v === "free" || v === "plan_enterprise") return v;
  if (PAID_ID_SET.has(v)) return v as PaidPlanId;
  return "free";
}

export function isPaidPlanId(v: string | null | undefined): v is PaidPlanId {
  return v != null && PAID_ID_SET.has(v);
}

export const PLAN_ORDER: PlanId[] = ["free", ...PAID_PLAN_IDS, "plan_enterprise"];

export function getPlan(id: PlanId): Plan {
  return PLANS[id] ?? PLANS.free;
}

export function formatPrice(price: number | null): string {
  if (price == null) return "Sob consulta";
  if (price === 0) return "Grátis";
  return `R$ ${price.toFixed(2).replace(".", ",")}`;
}

/** Preço mensal do degrau (para calculadora / lock). */
export function getPaidTierPrice(id: PaidPlanId): number {
  const p = PLANS[id]?.price;
  return typeof p === "number" ? p : 0;
}
