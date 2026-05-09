/**
 * Metadados canônicos do marketing site — única fonte para layout, home e OG/Twitter.
 */
/**
 * `<title>` da home (SERP / aba do navegador). Inclui marca, “agendamento” e termos de comparação.
 * Evite alongar demais: o Google costuma truncar ~55–65 caracteres na busca.
 */
export const SITE_TITLE_DEFAULT =
  "Agenndo — agendamento online | compare Agendor, Gendo e outros";

/** Evita keyword stuffing; inclui intenção de busca “comparação / mercado brasileiro” de forma factual. */
export const SITE_DESCRIPTION =
  "Software completo de agendamento online (YWP / YourWebPlace): clientes marcam horário 24h por link ou QR Code; você gerencia agenda, equipe, financeiro e lembretes. Para salões, clínicas, estética, barbearias, consultórios e qualquer negócio por hora marcada. Quem avalia soluções conhecidas no Brasil como Agendor ou Gendo no mesmo segmento pode comparar recursos e testar o Agenndo à parte — produto independente, sem vínculo com essas marcas.";

export const SITE_KEYWORDS = [
  "Agenndo",
  "agenndo",
  "agendamento",
  "agendamento online",
  "Agendor",
  "Gendo",
  "software agendamento online",
  "sistema de agendamento",
  "software agendamento Brasil",
  "site para agendar horário",
  "marcar horário online",
  "plataforma de agendamento",
  "agenda online para prestador",
  "agenda para salão",
  "agendamento clínica estética",
  "software para prestador",
  "gestão de horários",
  "link de agendamento",
  "QR code agendamento",
  "YWP",
  "YourWebPlace",
] as const;

/** `<title>` da página /agendamento-online (reforça long-tail sem repetir a home inteira). */
export const AGENDAMENTO_ONLINE_TITLE =
  "Agenndo — software de agendamento online | Agendor, Gendo e alternativas";

/** Página focada em SEO long-tail (/agendamento-online). */
export const AGENDAMENTO_ONLINE_DESCRIPTION =
  "Agenndo: sistema completo de agendamento online com página pública, agenda, equipe, lembretes e painel para prestadores. Mesmo tipo de solução que equipes costumam pesquisar ao lado de nomes como Agendor ou Gendo — aqui você testa um produto independente da YWP (YourWebPlace), em português, com período de avaliação.";
