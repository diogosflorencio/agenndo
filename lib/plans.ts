export type PlanId = "free" | "plano_1" | "plano_2" | "plano_3";

/** Texto único em qualquer lugar público */
export const PLANO_LABEL = "Plano";

export const PAID_PLAN_IDS = ["plano_1", "plano_2", "plano_3"] as const;
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

/** Normaliza valores antigos (starter/growth/enterprise) vindos do BD ou metadata Stripe. */
export function normalizePlanId(raw: string | null | undefined): PlanId {
  if (!raw) return "free";
  const legacy: Record<string, PlanId> = {
    starter: "plano_1",
    growth: "plano_2",
    enterprise: "plano_3",
  };
  const v = legacy[raw] ?? (raw as PlanId);
  if (v === "free" || PAID_PLAN_IDS.includes(v as PaidPlanId)) return v as PlanId;
  return "free";
}

export function isPaidPlanId(v: string | null | undefined): v is PaidPlanId {
  return v != null && PAID_PLAN_IDS.includes(v as PaidPlanId);
}

export interface Plan {
  id: PlanId;
  label: string;
  price: number;
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

const PAID_FEATURES = [
  "Página pública e agendamentos online",
  "Gestão de agenda, clientes e equipe no painel",
  "Notificações e acompanhamento no app",
];

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    label: "Grátis",
    price: 0,
    trialDays: 7,
    limits: { appointments: 30, collaborators: 1, services: 5 },
    features: [
      "Página pública",
      "1 colaborador",
      "5 serviços",
      "30 agendamentos/mês",
      "Suporte por e-mail",
    ],
    badge: "7 dias grátis",
  },
  plano_1: {
    id: "plano_1",
    label: PLANO_LABEL,
    price: 49.9,
    limits: { appointments: 150, collaborators: 2, services: 20 },
    features: PAID_FEATURES,
  },
  plano_2: {
    id: "plano_2",
    label: PLANO_LABEL,
    price: 89.9,
    limits: { appointments: Infinity, collaborators: 8, services: Infinity },
    features: PAID_FEATURES,
  },
  plano_3: {
    id: "plano_3",
    label: PLANO_LABEL,
    price: 179.9,
    limits: {
      appointments: Infinity,
      collaborators: Infinity,
      services: Infinity,
    },
    features: PAID_FEATURES,
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "plano_1", "plano_2", "plano_3"];

export function getPlan(id: PlanId): Plan {
  return PLANS[id];
}

export function formatPrice(price: number): string {
  if (price === 0) return "Grátis";
  return `R$ ${price.toFixed(2).replace(".", ",")}`;
}
