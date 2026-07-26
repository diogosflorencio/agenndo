/** Slides da seção “Veja na prática”. Adicione prints em `public/landing/` e preencha `image`. */
export type PublicShowcaseSlide = {
  id: string;
  segment: string;
  businessName: string;
  description: string;
  /** Caminho em /public, ex.: /landing/showcase-barber.webp */
  image?: string;
  /** URL ao vivo (slug real ou demo). */
  liveUrl?: string;
  /** Mock embutido quando não há imagem. */
  mock: "vitrine" | "agendar" | "painel";
};

export const PUBLIC_SHOWCASE_SLIDES: PublicShowcaseSlide[] = [
  {
    id: "barber",
    segment: "Barbearia",
    businessName: "Barbearia Exemplo",
    description: "Vitrine com serviços, equipe e botão de agendar - link único para bio e WhatsApp.",
    mock: "vitrine",
    liveUrl: undefined,
  },
  {
    id: "clinic",
    segment: "Estética · Clínica",
    businessName: "Clínica Harmonia",
    description: "Fluxo de reserva: serviço, profissional, data e horário em poucos toques no celular.",
    mock: "agendar",
  },
  {
    id: "salon",
    segment: "Salão",
    businessName: "Studio Bella",
    description: "Painel do prestador: agenda do dia, status e visão rápida dos agendamentos.",
    mock: "painel",
  },
];
