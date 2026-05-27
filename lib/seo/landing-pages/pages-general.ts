import type { SeoLandingPageConfig } from "./types";
import { CORE_SEO_LINKS, pickRelatedLinks, SEGMENT_SEO_LINKS } from "./shared-links";

const faqBase = [
  {
    question: "Preciso instalar algum aplicativo?",
    answer:
      "Não. O Agenndo funciona no navegador: você configura pelo painel no computador ou celular e o cliente agenda pela sua página pública, também pelo celular.",
  },
  {
    question: "O cliente paga para agendar?",
    answer:
      "O agendamento em si é gratuito para o seu cliente. Você define preços dos serviços na vitrine; cobrança e PIX podem ser combinados conforme sua operação.",
  },
  {
    question: "Posso testar antes de contratar?",
    answer:
      "Sim. Novos cadastros podem começar com período de teste para validar fluxo, lembretes e página pública antes de escolher um plano.",
  },
];

export const generalLandingPages: SeoLandingPageConfig[] = [
  {
    slug: "plataforma-de-agendamento-online",
    metaTitle: "Plataforma de Agendamento Online | Agenndo",
    metaDescription:
      "Plataforma de agendamento online para prestadores de serviço: página pública 24h, lembretes, equipe e gestão em um só lugar. Teste o Agenndo.",
    keywords: [
      "plataforma de agendamento online",
      "plataforma agendamento",
      "reserva online",
      "agenda digital",
    ],
    h1: "Plataforma de agendamento online para o seu negócio",
    heroSubtitle:
      "Centralize reservas, disponibilidade, serviços e clientes em uma plataforma pensada para quem vive de hora marcada — sem planilha, sem conflito de horário e com atendimento profissional.",
    sections: [
      {
        id: "o-que-e",
        title: "O que é uma plataforma de agendamento online?",
        level: 2,
        paragraphs: [
          "Uma <strong class=\"text-white\">plataforma de agendamento online</strong> vai além de um calendário: ela conecta a vitrine do seu negócio ao fluxo real de reservas. O cliente escolhe serviço, profissional (quando aplicável), data e horário; o sistema valida disponibilidade e registra o compromisso.",
          "No <strong class=\"text-white\">Agenndo</strong>, cada negócio ganha uma página pública com a sua marca. Você gerencia agenda, colaboradores, bloqueios e confirmações em um painel único — ideal para salões, clínicas, barbearias, consultórios e estúdios.",
        ],
      },
      {
        id: "beneficios",
        title: "Benefícios para quem presta serviço",
        level: 2,
        paragraphs: ["Quem migra do WhatsApp ou do caderninho costuma ganhar previsibilidade e tempo:"],
        bullets: [
          "<strong class=\"text-white\">Agendamento 24 horas</strong> — o cliente marca quando quiser, sem esperar resposta.",
          "<strong class=\"text-white\">Menos faltas</strong> — confirmações e lembretes reduzem no-show.",
          "<strong class=\"text-white\">Equipe organizada</strong> — agendas separadas por profissional.",
          "<strong class=\"text-white\">Imagem profissional</strong> — link único para bio, Google e WhatsApp.",
        ],
      },
      {
        id: "funcionalidades",
        title: "Funcionalidades que importam na prática",
        level: 2,
        paragraphs: ["Antes de escolher qualquer ferramenta, valide se ela cobre o dia a dia da sua operação:"],
        bullets: [
          "Página pública personalizada com serviços, preços e duração",
          "Regras de antecedência mínima e horizonte de agenda futura",
          "Bloqueios, folgas e exceções por data",
          "Histórico de clientes e agendamentos",
          "Visão financeira básica ligada aos atendimentos",
        ],
      },
      {
        id: "comparacao",
        title: "Plataforma vs. mensagens soltas",
        level: 3,
        paragraphs: [
          "Atender pedidos de horário só por mensagem gera ruído: prints perdidos, horários duplicados e cliente esperando resposta. Uma plataforma padroniza o fluxo e libera sua equipe para produzir, não para coordenar.",
          "Veja também nosso guia sobre <a href=\"/blog/como-funciona-sistema-de-agendamento-online\" class=\"text-primary hover:underline\">como funciona um sistema de agendamento online</a>.",
        ],
      },
    ],
    faq: [
      ...faqBase,
      {
        question: "A plataforma serve para mais de um profissional?",
        answer: "Sim. Você cadastra colaboradores, define quem executa cada serviço e o cliente pode escolher o profissional ou o primeiro horário disponível na equipe.",
      },
    ],
    relatedLinks: pickRelatedLinks(
      CORE_SEO_LINKS.filter((l) => l.href !== "/plataforma-de-agendamento-online"),
      SEGMENT_SEO_LINKS
    ),
  },
  {
    slug: "sistema-de-agendamento-online",
    metaTitle: "Sistema de Agendamento Online Completo | Agenndo",
    metaDescription:
      "Sistema de agendamento online com página do cliente, gestão de equipe, disponibilidade e confirmações. Conheça o Agenndo para o seu negócio.",
    keywords: ["sistema de agendamento online", "sistema agenda online", "software gestão agendamentos"],
    h1: "Sistema de agendamento online completo",
    heroSubtitle:
      "Do primeiro clique do cliente à confirmação do horário: um sistema integrado para reservas, operação e relacionamento — sem depender de planilhas ou grupos de mensagem.",
    sections: [
      {
        id: "definicao",
        title: "O que um sistema de agendamento precisa entregar",
        level: 2,
        paragraphs: [
          "Um <strong class=\"text-white\">sistema de agendamento online</strong> confiável une três camadas: a experiência do cliente (vitrine e reserva), a regra de negócio (quem atende, quanto tempo dura, quando está aberto) e o controle interno (painel, relatórios, cancelamentos).",
          "O Agenndo foi desenhado para prestadores brasileiros: interface em português, fluxo mobile-first e página pública indexável para quem te encontra no Google.",
        ],
      },
      {
        id: "fluxo",
        title: "Fluxo típico de reserva",
        level: 2,
        paragraphs: ["Na prática, o caminho é simples e repetível:"],
        bullets: [
          "Cliente acessa sua página pelo link ou QR Code",
          "Escolhe serviço e, se houver, variante ou profissional",
          "Vê apenas horários realmente livres",
          "Informa nome e contato; você recebe o agendamento no painel",
        ],
      },
      {
        id: "gestao",
        title: "Gestão além do calendário",
        level: 2,
        paragraphs: [
          "Sistemas fracos viram apenas um calendário bonito. O Agenndo inclui cadastro de serviços, personalização visual, disponibilidade semanal, exceções por data, lista de clientes e visão de operações — tudo alinhado ao mesmo banco de horários.",
          "Compare opções no artigo <a href=\"/blog/melhores-sistemas-de-agendamento-online\" class=\"text-primary hover:underline\">melhores sistemas de agendamento online</a>.",
        ],
      },
    ],
    faq: [
      ...faqBase,
      {
        question: "Substitui o Google Agenda?",
        answer:
          "Para reservas com clientes externos, sim — é o papel da página pública. Muitos negócios mantêm Google Agenda pessoal em paralelo; leia nosso comparativo Google Agenda vs. plataforma de agendamento no blog.",
      },
    ],
    relatedLinks: pickRelatedLinks(
      CORE_SEO_LINKS.filter((l) => l.href !== "/sistema-de-agendamento-online"),
      SEGMENT_SEO_LINKS
    ),
  },
  {
    slug: "software-de-agendamento",
    metaTitle: "Software de Agendamento para Prestadores | Agenndo",
    metaDescription:
      "Software de agendamento online: receba reservas 24h, gerencie equipe e reduza faltas. Página pública profissional com o Agenndo.",
    keywords: ["software de agendamento", "software agenda online", "programa agendamento"],
    h1: "Software de agendamento feito para serviços",
    heroSubtitle:
      "Automatize marcações, organize sua equipe e ofereça ao cliente um canal claro para reservar — com software em nuvem, sem instalação e acessível do celular.",
    sections: [
      {
        id: "por-que-software",
        title: "Por que usar um software em vez de ferramentas genéricas?",
        level: 2,
        paragraphs: [
          "Planilhas e calendários genéricos não entendem <strong class=\"text-white\">duração de serviço</strong>, <strong class=\"text-white\">buffer entre atendimentos</strong> ou <strong class=\"text-white\">múltiplos profissionais</strong>. Um <strong class=\"text-white\">software de agendamento</strong> aplica essas regras automaticamente.",
          "Isso evita overbooking, reduz tempo em mensagens do tipo “tem horário sexta?” e melhora a percepção de organização do seu negócio.",
        ],
      },
      {
        id: "recursos",
        title: "Recursos que o Agenndo oferece",
        level: 2,
        bullets: [
          "Link e QR Code da página pública",
          "Serviços com preço, duração e descrição",
          "Agenda por colaborador ou “primeiro disponível”",
          "Confirmação e política de cancelamento",
          "Tema claro/escuro na vitrine",
        ],
        paragraphs: [],
      },
      {
        id: "quem-usa",
        title: "Quem mais se beneficia",
        level: 3,
        paragraphs: [
          "Salões, barbearias, clínicas de estética, consultórios de saúde, psicólogos, personais, estúdios e qualquer operação com hora marcada. Temos páginas específicas por segmento na seção “Leia também” abaixo.",
        ],
      },
    ],
    faq: [
      ...faqBase,
      {
        question: "Funciona no celular?",
        answer: "Sim. Tanto o painel quanto a página de agendamento do cliente são responsivos e pensados para uso em smartphones.",
      },
    ],
    relatedLinks: pickRelatedLinks(
      CORE_SEO_LINKS.filter((l) => l.href !== "/software-de-agendamento"),
      SEGMENT_SEO_LINKS
    ),
  },
  {
    slug: "agenda-online",
    metaTitle: "Agenda Online Profissional | Agenndo",
    metaDescription:
      "Crie sua agenda online em minutos. Clientes marcam horário 24h; você controla disponibilidade e equipe. Agenda online grátis para começar.",
    keywords: ["agenda online", "agenda digital", "agenda virtual", "criar agenda online"],
    h1: "Agenda online profissional para receber clientes 24h",
    heroSubtitle:
      "Transforme seu link de bio em uma agenda que vende horários: serviços claros, horários reais e confirmação automática — sem troca infinita de mensagens.",
    sections: [
      {
        id: "criar",
        title: "Como criar sua agenda online",
        level: 2,
        paragraphs: [
          "Criar uma <strong class=\"text-white\">agenda online</strong> com o Agenndo leva poucos minutos: cadastre o negócio, liste serviços, configure dias e horários de atendimento e publique o link.",
          "O passo a passo detalhado está no artigo <a href=\"/blog/como-criar-uma-agenda-online-gratis\" class=\"text-primary hover:underline\">como criar uma agenda online grátis</a>.",
        ],
      },
      {
        id: "divulgar",
        title: "Onde divulgar sua agenda",
        level: 2,
        bullets: [
          "Instagram e WhatsApp (bio e mensagem de boas-vindas)",
          "Google Perfil da Empresa",
          "Cartão de visita com QR Code",
          "E-mail de confirmação para clientes recorrentes",
        ],
        paragraphs: [
          "Quanto mais visível for o link, menos você precisa interromper o atendimento para responder pedidos de horário.",
        ],
      },
      {
        id: "organizar",
        title: "Organização e rotina",
        level: 2,
        paragraphs: [
          "Uma agenda online bem configurada reflete sua capacidade real: intervalos, feriados e bloqueios aparecem só para você no painel, enquanto o cliente vê apenas o que pode reservar.",
          "Leia <a href=\"/blog/como-organizar-agendamentos\" class=\"text-primary hover:underline\">como organizar agendamentos</a> para montar uma rotina sustentável.",
        ],
      },
    ],
    faq: [
      ...faqBase,
      {
        question: "A agenda online é a mesma coisa que site?",
        answer:
          "É uma página pública focada em reservas — pode funcionar como “mini site” de agendamento, especialmente para quem ainda não tem site institucional completo.",
      },
    ],
    relatedLinks: pickRelatedLinks(
      CORE_SEO_LINKS.filter((l) => l.href !== "/agenda-online"),
      SEGMENT_SEO_LINKS
    ),
  },
];
