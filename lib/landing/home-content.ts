import { APP_TRIAL_DAYS } from "@/lib/trial-config";

/** Copy centralizado da landing - SEO + conversão, aplicável a qualquer serviço com hora marcada. */
export const HOME_SEGMENTS = [
  { label: "Salões", href: "/agenda-online-para-salao", icon: "content_cut" },
  { label: "Barbearias", href: "/agenda-online-para-barbearia", icon: "face_6" },
  { label: "Clínicas", href: "/agenda-online-para-clinicas", icon: "medical_services" },
  { label: "Estética", href: "/agenda-online-para-estetica", icon: "spa" },
  { label: "Psicólogos", href: "/agenda-online-para-psicologos", icon: "psychology" },
  { label: "Personal & fitness", href: "/agenda-online", icon: "fitness_center" },
  { label: "Pet shop & vet", href: "/agenda-online", icon: "pets" },
  { label: "Outros serviços", href: "/agenda-online", icon: "handyman" },
] as const;

export const HOME_PAIN_POINTS = [
  {
    problem: "WhatsApp virou central de agendamento",
    solution: "Link e QR Code na bio: cliente escolhe serviço, profissional e horário sozinho - sem troca infinita de mensagens.",
    icon: "chat",
  },
  {
    problem: "Cliente marca e não aparece",
    solution: "Lembretes automáticos, sinal com Pix ou Mercado Pago e status compareceu/faltou na hora do atendimento.",
    icon: "event_busy",
  },
  {
    problem: "Agenda espalhada em caderno e planilha",
    solution: "Painel único no celular: dia, equipe, receita e histórico de clientes - atualizado a cada reserva.",
    icon: "calendar_month",
  },
] as const;

export const HOME_PILLARS = [
  {
    icon: "qr_code_2",
    title: "Página pública que converte",
    desc: "Cada negócio ganha uma vitrine com sua marca: serviços, equipe, fotos e botão de agendar.",
    bullets: [
      "URL curta para Instagram, Google e WhatsApp",
      "QR Code para balcão, cartão e vitrine",
      "Cliente agenda 24h, inclusive fora do horário comercial",
    ],
  },
  {
    icon: "dashboard",
    title: "Operação completa no painel",
    desc: "Do primeiro clique ao caixa: agenda, equipe, clientes e financeiro sem trocar de ferramenta.",
    bullets: [
      "Agenda por profissional com bloqueios e folgas",
      "Pix manual ou Mercado Pago para sinal antecipado",
      "Analytics de ocupação e receita por serviço",
    ],
  },
  {
    icon: "notifications_active",
    title: "Menos faltas, mais previsibilidade",
    desc: "Confirmação, lembrete e visão clara do que entrou no dia - você decide o que automatizar.",
    bullets: [
      "Templates de WhatsApp configuráveis",
      "Marca presença ou falta em um toque",
      "Comissões por profissional quando precisar",
    ],
  },
] as const;

export const HOME_FEATURE_GRID = [
  { icon: "calendar_month", title: "Agenda inteligente", desc: "Horários reais, bloqueios e visão do dia por profissional." },
  { icon: "groups", title: "Equipe e colaboradores", desc: "Serviços por pessoa, permissões e área do profissional." },
  { icon: "payments", title: "Receber pagamentos", desc: "Pix cadastrado ou Mercado Pago conectado no fluxo de reserva." },
  { icon: "palette", title: "Personalização visual", desc: "Logo, cores, banner e galeria na página pública." },
  { icon: "analytics", title: "Relatórios", desc: "Ocupação, ticket médio e serviços que mais vendem." },
  { icon: "language", title: "Multi-idiomas", desc: "Página e painel em PT, EN ou ES conforme o navegador." },
] as const;

export const HOME_STEPS = [
  {
    n: "1",
    title: "Crie sua conta em minutos",
    desc: `Entre com Google, escolha o nome do negócio e publique sua URL (ex.: agenndo.com.br/seu-slug). ${APP_TRIAL_DAYS} dias de teste, sem cartão.`,
    icon: "rocket_launch",
  },
  {
    n: "2",
    title: "Configure serviços e disponibilidade",
    desc: "Cadastre o que você oferece, quem atende, preços e horários. Personalize cores e logo da página pública.",
    icon: "tune",
  },
  {
    n: "3",
    title: "Compartilhe e receba reservas",
    desc: "Bio, WhatsApp, Google Meu Negócio ou QR no balcão. Cliente confirma sozinho; você acompanha no painel.",
    icon: "share",
  },
] as const;

export const HOME_INTEGRATIONS = [
  { label: "Google", icon: "login" },
  { label: "WhatsApp", icon: "chat" },
  { label: "Pix", icon: "qr_code_2" },
  { label: "Mercado Pago", icon: "payments" },
  { label: "Stripe", icon: "credit_card" },
  { label: "PWA / celular", icon: "smartphone" },
] as const;
