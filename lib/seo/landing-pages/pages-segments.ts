import type { SeoLandingPageConfig } from "./types";
import { CORE_SEO_LINKS, pickRelatedLinks, SEGMENT_SEO_LINKS } from "./shared-links";

const segmentFaq = [
  {
    question: "O cliente precisa criar conta para agendar?",
    answer:
      "Não é obrigatório ter conta Agenndo. O cliente informa nome e contato na reserva; você vê tudo no painel e mantém histórico.",
  },
  {
    question: "Posso ter vários profissionais na mesma agenda?",
    answer:
      "Sim. Cada colaborador pode ter disponibilidade própria e serviços associados.",
  },
];

export const segmentLandingPages: SeoLandingPageConfig[] = [
  {
    slug: "agenda-online-para-salao",
    metaTitle: "Agenda Online para Salão de Beleza | Agenndo",
    metaDescription:
      "Agenda online para salão: coloração, corte, manicure e equipe em um link. Reduza faltas e receba agendamentos 24h com o Agenndo.",
    keywords: ["agenda online salão", "agendamento salão beleza", "sistema salão"],
    h1: "Agenda online para salão de beleza",
    heroSubtitle:
      "Organize cortes, químicas, manicure e design em uma página profissional. Cada profissional com sua agenda; o cliente escolhe serviço e horário sem lotar seu WhatsApp.",
    sections: [
      {
        id: "desafios",
        title: "Desafios comuns em salões",
        level: 2,
        paragraphs: [
          "Salões lidam com serviços de durações muito diferentes, combo de profissionais e alta demanda em fins de semana. Sem <strong class=\"text-white\">agenda online para salão</strong>, o risco de overbooking e faltas aumenta.",
        ],
        bullets: [
          "Serviços longos (progressiva, mechas) ocupando cadeira por horas",
          "Cliente que marca e não aparece no sábado",
          "Recepção sobrecarregada respondendo horários",
        ],
      },
      {
        id: "solucao",
        title: "Como o Agenndo ajuda seu salão",
        level: 2,
        bullets: [
          "Cadastro de serviços com tempo e preço realistas",
          "Agenda por cabeleireiro, manicure ou esteticista",
          "Página com fotos, banner e identidade visual",
          "Lembretes para reduzir no-show",
        ],
        paragraphs: [],
      },
      {
        id: "dicas",
        title: "Dicas para divulgar",
        level: 3,
        paragraphs: [
          "Coloque o link na bio do Instagram, no status do WhatsApp e no Google. Ofereça QR Code na recepção para clientes que chegam sem horário.",
          "Guia relacionado: <a href=\"/blog/agenda-online-salao-de-beleza\" class=\"text-primary hover:underline\">agenda online para salão de beleza</a>.",
        ],
      },
    ],
    faq: [
      ...segmentFaq,
      {
        question: "Funciona para serviços com variações (tamanho, comprimento)?",
        answer:
          "Sim. Você pode usar variantes do serviço com preços e descrições diferentes na página pública.",
      },
    ],
    relatedLinks: pickRelatedLinks(
      CORE_SEO_LINKS,
      SEGMENT_SEO_LINKS.filter((l) => l.href !== "/agenda-online-para-salao")
    ),
  },
  {
    slug: "agenda-online-para-barbearia",
    metaTitle: "Agenda Online para Barbearia | Agenndo",
    metaDescription:
      "Agenda online para barbearia: fila organizada, barbeiros com agenda própria e reservas 24h. Teste o Agenndo na sua barbearia.",
    keywords: ["agenda online barbearia", "agendamento barbearia", "app barbearia"],
    h1: "Agenda online para barbearia",
    heroSubtitle:
      "Menos interrupção durante o corte, mais cadeira ocupada com horário certo. Seus clientes marcam pelo celular; você controla barbeiros, serviços e encaixes.",
    sections: [
      {
        id: "rotina",
        title: "Rotina da barbearia moderna",
        level: 2,
        paragraphs: [
          "Barbearias de alto fluxo não podem parar a cada mensagem de “tem vaga hoje?”. Uma <strong class=\"text-white\">agenda online para barbearia</strong> mostra só horários livres por profissional ou o próximo disponível na casa.",
        ],
      },
      {
        id: "recursos",
        title: "O que configurar primeiro",
        level: 2,
        bullets: [
          "Corte, barba, combo e sobrancelha com duração correta",
          "Agenda individual por barbeiro",
          "Bloqueio de almoço e folgas",
          "Link curto para bio e WhatsApp",
        ],
        paragraphs: [],
      },
      {
        id: "faturamento",
        title: "Impacto no faturamento",
        level: 3,
        paragraphs: [
          "Reduzir buracos na agenda e faltas tem impacto direto no caixa. Veja o artigo <a href=\"/blog/barbearia-agenda-online-faturamento\" class=\"text-primary hover:underline\">barbearia e agenda online</a>.",
        ],
      },
    ],
    faq: [
      ...segmentFaq,
      {
        question: "Cliente pode escolher o barbeiro preferido?",
        answer: "Sim. Na etapa de profissional, o cliente seleciona quem vai atender ou a opção de primeiro disponível.",
      },
    ],
    relatedLinks: pickRelatedLinks(
      CORE_SEO_LINKS,
      SEGMENT_SEO_LINKS.filter((l) => l.href !== "/agenda-online-para-barbearia")
    ),
  },
  {
    slug: "agenda-online-para-clinicas",
    metaTitle: "Agenda Online para Clínicas | Agenndo",
    metaDescription:
      "Agenda online para clínicas e consultórios: horários por profissional, antecedência mínima e confirmação. Organize consultas com o Agenndo.",
    keywords: ["agenda online clínica", "agendamento consultório", "sistema clínica"],
    h1: "Agenda online para clínicas e consultórios",
    heroSubtitle:
      "Consultas, retornos e procedimentos com horário definido — sem sala de espera lotada por falta de organização. Ideal para clínicas multiprofissionais e consultórios individuais.",
    sections: [
      {
        id: "contexto",
        title: "Agendamento em ambiente clínico",
        level: 2,
        paragraphs: [
          "Clínicas precisam respeitar tempo de consulta, antecedência mínima e, muitas vezes, salas ou equipamentos compartilhados. Um sistema de <strong class=\"text-white\">agenda online para clínicas</strong> aplica essas regras antes de confirmar a reserva.",
        ],
      },
      {
        id: "conformidade",
        title: "Organização e comunicação",
        level: 2,
        bullets: [
          "Confirmação clara de data, hora e profissional",
          "Política de cancelamento visível ao paciente",
          "Menos telefonemas na recepção",
          "Histórico de agendamentos por paciente",
        ],
        paragraphs: [
          "O Agenndo não substitui prontuário eletrônico ou legislação específica da sua área — foca na camada de reserva e operação da agenda.",
        ],
      },
      {
        id: "faltas",
        title: "Reduzir faltas em consultas",
        level: 3,
        paragraphs: [
          "Lembretes e confirmação prévia ajudam a diminuir no-show. Leia <a href=\"/blog/como-reduzir-faltas-em-consultas\" class=\"text-primary hover:underline\">como reduzir faltas em consultas</a>.",
        ],
      },
    ],
    faq: [
      ...segmentFaq,
      {
        question: "Atende clínica com várias especialidades?",
        answer:
          "Sim. Cadastre serviços por tipo de atendimento e associe aos profissionais que executam cada um.",
      },
    ],
    relatedLinks: pickRelatedLinks(
      CORE_SEO_LINKS,
      SEGMENT_SEO_LINKS.filter((l) => l.href !== "/agenda-online-para-clinicas")
    ),
  },
  {
    slug: "agenda-online-para-psicologos",
    metaTitle: "Agenda Online para Psicólogos | Agenndo",
    metaDescription:
      "Agenda online para psicólogos: sessões com duração fixa, horários privados e reserva discreta pelo link. Conheça o Agenndo.",
    keywords: ["agenda online psicólogo", "agendamento psicologia", "agenda terapia online"],
    h1: "Agenda online para psicólogos",
    heroSubtitle:
      "Sessões com horário reservado, menos trocas de mensagem para marcar e mais foco no atendimento clínico. Configure duração da sessão e disponibilidade semanal em minutos.",
    sections: [
      {
        id: "especificidades",
        title: "Especificidades da prática",
        level: 2,
        paragraphs: [
          "Psicólogos e terapeutas costumam trabalhar com <strong class=\"text-white\">sessões de 50 minutos</strong>, intervalos entre pacientes e agenda que não pode ser vista por terceiros na recepção. Uma <strong class=\"text-white\">agenda online para psicólogos</strong> centraliza isso em um link profissional.",
        ],
      },
      {
        id: "discrecao",
        title: "Experiência discreta para o paciente",
        level: 2,
        paragraphs: [
          "O paciente agenda pelo link, sem expor detalhes em grupo ou status público. Você recebe a reserva no painel e mantém a rotina organizada — presencial ou online, conforme sua oferta de serviço cadastrada.",
        ],
      },
      {
        id: "confirmacao",
        title: "Confirmação e lembretes",
        level: 3,
        paragraphs: [
          "Confirmações automáticas reduzem esquecimentos e retrabalho. Veja <a href=\"/blog/como-confirmar-agendamentos-automaticamente\" class=\"text-primary hover:underline\">como confirmar agendamentos automaticamente</a>.",
        ],
      },
    ],
    faq: [
      ...segmentFaq,
      {
        question: "Posso bloquear horários para supervisão ou estudo?",
        answer: "Sim. Use bloqueios e exceções na disponibilidade para reservar tempo administrativo.",
      },
    ],
    relatedLinks: pickRelatedLinks(
      CORE_SEO_LINKS,
      SEGMENT_SEO_LINKS.filter((l) => l.href !== "/agenda-online-para-psicologos")
    ),
  },
  {
    slug: "agenda-online-para-estetica",
    metaTitle: "Agenda Online para Clínica de Estética | Agenndo",
    metaDescription:
      "Agenda online para estética: procedimentos, pacotes e profissionais em uma página. Agendamento 24h para sua clínica de estética com Agenndo.",
    keywords: ["agenda online estética", "agendamento clínica estética", "sistema estética"],
    h1: "Agenda online para clínica de estética",
    heroSubtitle:
      "Procedimentos faciais, corporais e pacotes promocionais com horários precisos. Menos tempo na recepção, mais tempo aplicando protocolos.",
    sections: [
      {
        id: "procedimentos",
        title: "Procedimentos e pacotes",
        level: 2,
        paragraphs: [
          "Estética combina serviços de durações variadas — limpeza de pele, laser, massagem, avaliação. Na <strong class=\"text-white\">agenda online para estética</strong>, cada procedimento leva tempo e preço corretos para o sistema calcular a agenda.",
        ],
      },
      {
        id: "marketing",
        title: "Marketing e conversão",
        level: 2,
        paragraphs: [
          "Campanhas no Instagram levam tráfego; sem link de agendamento, você perde quem quer marcar na hora. Coloque o link na bio e em anúncios.",
          "Artigo: <a href=\"/blog/agendamento-online-clinica-estetica\" class=\"text-primary hover:underline\">agendamento online para clínica de estética</a>.",
        ],
      },
      {
        id: "equipe",
        title: "Equipe e salas",
        level: 3,
        paragraphs: [
          "Vários esteticistas podem atender em paralelo com agendas separadas. Configure quem executa cada protocolo.",
        ],
      },
    ],
    faq: [
      ...segmentFaq,
      {
        question: "Cliente pode agendar avaliação antes do procedimento?",
        answer:
          "Sim. Crie um serviço “Avaliação” com duração menor e use variantes para procedimentos completos após a consulta.",
      },
    ],
    relatedLinks: pickRelatedLinks(
      CORE_SEO_LINKS,
      SEGMENT_SEO_LINKS.filter((l) => l.href !== "/agenda-online-para-estetica")
    ),
  },
];
