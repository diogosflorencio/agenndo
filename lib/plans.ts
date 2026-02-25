export type PlanId = "free" | "starter" | "growth" | "enterprise";

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
  starter: {
    id: "starter",
    label: "Starter",
    price: 49.9,
    limits: { appointments: 150, collaborators: 2, services: 20 },
    features: [
      "Tudo do Grátis",
      "2 colaboradores",
      "20 serviços",
      "150 agendamentos/mês",
      "Lembretes por e-mail",
      "QR Code da página",
    ],
  },
  growth: {
    id: "growth",
    label: "Growth",
    price: 89.9,
    limits: { appointments: Infinity, collaborators: 8, services: Infinity },
    features: [
      "Tudo do Starter",
      "Agendamentos ilimitados",
      "8 colaboradores",
      "Lembretes WhatsApp",
      "Personalização avançada",
      "Analytics detalhado",
      "Exportação CSV",
    ],
    highlight: true,
    badge: "Mais popular",
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    price: 179.9,
    limits: {
      appointments: Infinity,
      collaborators: Infinity,
      services: Infinity,
    },
    features: [
      "Tudo do Growth",
      "Colaboradores ilimitados",
      "Múltiplos locais",
      "API REST",
      "Suporte VIP",
      "Onboarding assistido",
      "SLA 99.9%",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "growth", "enterprise"];

export function getPlan(id: PlanId): Plan {
  return PLANS[id];
}

export function formatPrice(price: number): string {
  if (price === 0) return "Grátis";
  return `R$ ${price.toFixed(2).replace(".", ",")}`;
}
