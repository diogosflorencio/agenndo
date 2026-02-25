import type { PlanId } from "./plans";

type TeamSize = "1" | "2-5" | "6-15" | "16+";

interface RecommendationInput {
  teamSize: TeamSize;
  dailyAppointments: number;
  averageTicket: number;
}

export function calculateRecommendedPlan(
  input: RecommendationInput
): PlanId {
  const { teamSize, dailyAppointments, averageTicket } = input;

  const isLargeTeam = teamSize === "16+" || teamSize === "6-15";
  const isHighVolume = dailyAppointments > 30;
  const isHighTicket = averageTicket > 150;

  const isMediumTeam = teamSize === "2-5";
  const isMediumVolume = dailyAppointments >= 10 && dailyAppointments <= 30;
  const isMediumTicket = averageTicket >= 50 && averageTicket <= 150;

  if (isLargeTeam || isHighVolume || isHighTicket) {
    return "enterprise";
  }

  if (isMediumTeam || isMediumVolume || isMediumTicket) {
    return "growth";
  }

  return "starter";
}

// ─── Plano dinâmico: usuário só vê a opção destinada ao perfil (preço + infra) ───
export interface DynamicPlanResult {
  tier: PlanId;
  monthlyPrice: number;
  infrastructure: string;
  highlight: string;
  features: { title: string; sub: string }[];
}

export function calculateDynamicPlan(
  teamSize: string,
  dailyVolume: number,
  avgTicket: number
): DynamicPlanResult {
  const collaborators = teamSize === "1" ? 1 : teamSize === "2-5" ? 3 : 7;
  const load = collaborators * dailyVolume;

  if (load <= 10 && avgTicket < 80) {
    return {
      tier: "starter",
      monthlyPrice: 49.9,
      infrastructure: "Infraestrutura compartilhada otimizada",
      highlight: "Ideal para quem está começando a digitalizar o negócio",
      features: [
        { title: "Agendamentos ilimitados", sub: "Sem limite de marcações por mês" },
        { title: "Página pública personalizada", sub: "Seu link profissional para clientes" },
        { title: "Notificações automáticas", sub: "Push e alertas em tempo real" },
      ],
    };
  }
  if (load <= 30 && avgTicket < 200) {
    return {
      tier: "growth",
      monthlyPrice: 89.9,
      infrastructure: "Infraestrutura dedicada com alta disponibilidade",
      highlight: "Para negócios em crescimento que não podem parar",
      features: [
        { title: "Todos os recursos da plataforma", sub: "Preço definido conforme seu uso" },
        { title: "Analytics completo 90 dias", sub: "Histórico detalhado por cliente e serviço" },
        { title: "Relatórios exportáveis", sub: "CSV e PDF com dados financeiros" },
      ],
    };
  }
  if (load <= 70) {
    return {
      tier: "growth",
      monthlyPrice: 149.9,
      infrastructure: "Infraestrutura dedicada de alta performance",
      highlight: "Para equipes consolidadas com volume expressivo",
      features: [
        { title: "Todos os recursos da plataforma", sub: "Preço conforme o volume do seu negócio" },
        { title: "Colaboradores ilimitados", sub: "Cadastre toda a equipe sem restrições" },
        { title: "Suporte prioritário", sub: "Atendimento em até 2h via WhatsApp" },
      ],
    };
  }
  return {
    tier: "enterprise",
    monthlyPrice: 229.9,
    infrastructure: "Infraestrutura enterprise com SLA garantido",
    highlight: "Para operações de alto volume com exigência máxima",
    features: [
      { title: "Todos os recursos da plataforma", sub: "Preço sob medida para alto volume" },
      { title: "SLA 99.9% de uptime", sub: "Garantia contratual de disponibilidade" },
      { title: "Gerente de conta dedicado", sub: "Acompanhamento personalizado do negócio" },
    ],
  };
}
