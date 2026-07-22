import type { WhatsAppEventKey, WhatsAppRecipientRole, WhatsAppScheduleKind } from "./types";

export type WhatsAppClientListGroup = "agendamento" | "pagamento" | "lembretes" | "pos_atendimento" | "reativacao";

export const WHATSAPP_CLIENT_GROUPS: { id: WhatsAppClientListGroup; label: string; icon: string }[] = [
  { id: "agendamento", label: "Agendamento", icon: "event" },
  { id: "pagamento", label: "Pagamento", icon: "payments" },
  { id: "lembretes", label: "Lembretes", icon: "schedule" },
  { id: "pos_atendimento", label: "Pos-atendimento", icon: "thumb_up" },
  { id: "reativacao", label: "Reativacao", icon: "person_search" },
];

export type WhatsAppEventDefinition = {
  key: WhatsAppEventKey;
  recipientRole: WhatsAppRecipientRole;
  label: string;
  description: string;
  category: "cliente" | "empresa" | "profissional";
  /** Subgrupo na aba Clientes (lista compacta por secao). */
  clientGroup?: WhatsAppClientListGroup;
  defaultEnabled: boolean;
  scheduleKind: WhatsAppScheduleKind;
  scheduleOffsetMinutes: number | null;
  defaultBody: string;
};

export const WHATSAPP_EVENTS: WhatsAppEventDefinition[] = [
  {
    key: "booking_created",
    recipientRole: "client",
    label: "Agendamento criado",
    description: "Quando o cliente conclui a reserva (antes da confirmacao, se pagamento for obrigatorio).",
    category: "cliente",
    clientGroup: "agendamento",
    defaultEnabled: false,
    scheduleKind: "immediate",
    scheduleOffsetMinutes: null,
    defaultBody:
      "Ola {nome}! Seu agendamento foi registrado.\nData: {data} as {hora}\nServico: {servico} com {profissional}\n{endereco}\nLink: {link}",
  },
  {
    key: "booking_confirmed",
    recipientRole: "client",
    label: "Agendamento confirmado",
    description: "Quando o horario esta confirmado (inclui confirmacao imediata ou apos pagamento).",
    category: "cliente",
    clientGroup: "agendamento",
    defaultEnabled: true,
    scheduleKind: "immediate",
    scheduleOffsetMinutes: null,
    defaultBody:
      "Ola {nome}! Seu agendamento foi confirmado.\nData: {data} as {hora}\nServico: {servico} com {profissional}\n{endereco}\nCancelar: {link_cancelamento}",
  },
  {
    key: "booking_cancelled",
    recipientRole: "client",
    label: "Agendamento cancelado",
    description: "Quando o agendamento e cancelado pelo cliente ou pelo prestador.",
    category: "cliente",
    clientGroup: "agendamento",
    defaultEnabled: true,
    scheduleKind: "immediate",
    scheduleOffsetMinutes: null,
    defaultBody:
      "Ola {nome}. Seu agendamento de {servico} em {data} as {hora} foi cancelado.\nPara reagendar: {link_vitrine}",
  },
  {
    key: "booking_rescheduled",
    recipientRole: "client",
    label: "Reagendamento",
    description: "Quando data ou horario do agendamento sao alterados.",
    category: "cliente",
    clientGroup: "agendamento",
    defaultEnabled: false,
    scheduleKind: "immediate",
    scheduleOffsetMinutes: null,
    defaultBody:
      "Ola {nome}! Seu agendamento foi reagendado.\nNova data: {data} as {hora}\nServico: {servico} com {profissional}",
  },
  {
    key: "payment_pending",
    recipientRole: "client",
    label: "Pagamento pendente",
    description: "Quando o agendamento exige sinal ou pagamento integral antes de confirmar.",
    category: "cliente",
    clientGroup: "pagamento",
    defaultEnabled: false,
    scheduleKind: "immediate",
    scheduleOffsetMinutes: null,
    defaultBody:
      "Ola {nome}! Para confirmar seu horario ({data} as {hora}), conclua o pagamento de {valor_sinal}.\nLink: {link}",
  },
  {
    key: "payment_confirmed",
    recipientRole: "client",
    label: "Pagamento confirmado",
    description: "Quando o Mercado Pago aprova o pagamento online.",
    category: "cliente",
    clientGroup: "pagamento",
    defaultEnabled: false,
    scheduleKind: "immediate",
    scheduleOffsetMinutes: null,
    defaultBody: "Ola {nome}! Pagamento de {valor} confirmado.\nAgendamento: {data} as {hora} - {servico}",
  },
  {
    key: "reminder_48h",
    recipientRole: "client",
    label: "Lembrete 48 horas antes",
    description: "Enviado dois dias antes do horario marcado.",
    category: "cliente",
    clientGroup: "lembretes",
    defaultEnabled: false,
    scheduleKind: "before_appointment",
    scheduleOffsetMinutes: -2880,
    defaultBody: "Ola {nome}! Lembrete: voce tem {servico} em dois dias ({data} as {hora}).",
  },
  {
    key: "reminder_24h",
    recipientRole: "client",
    label: "Lembrete 24 horas antes",
    description: "Enviado um dia antes do horario marcado.",
    category: "cliente",
    clientGroup: "lembretes",
    defaultEnabled: true,
    scheduleKind: "before_appointment",
    scheduleOffsetMinutes: -1440,
    defaultBody: "Ola {nome}! Lembrete: amanha voce tem {servico} as {hora} com {profissional}.",
  },
  {
    key: "reminder_2h",
    recipientRole: "client",
    label: "Lembrete 2 horas antes",
    description: "Enviado duas horas antes do horario.",
    category: "cliente",
    clientGroup: "lembretes",
    defaultEnabled: false,
    scheduleKind: "before_appointment",
    scheduleOffsetMinutes: -120,
    defaultBody: "Ola {nome}! Daqui a 2 horas: {servico} as {hora}. Te esperamos!",
  },
  {
    key: "reminder_1h",
    recipientRole: "client",
    label: "Lembrete 1 hora antes",
    description: "Enviado uma hora antes do horario.",
    category: "cliente",
    clientGroup: "lembretes",
    defaultEnabled: false,
    scheduleKind: "before_appointment",
    scheduleOffsetMinutes: -60,
    defaultBody: "Ola {nome}! Em 1 hora: {servico} as {hora}. Ate ja!",
  },
  {
    key: "attendance_confirmation",
    recipientRole: "client",
    label: "Confirmacao de presenca",
    description: "Solicita ao cliente que confirme que comparecera.",
    category: "cliente",
    clientGroup: "lembretes",
    defaultEnabled: false,
    scheduleKind: "before_appointment",
    scheduleOffsetMinutes: -720,
    defaultBody: "Ola {nome}! Confirma presenca para {data} as {hora}? Responda SIM ou acesse {link}.",
  },
  {
    key: "thank_you",
    recipientRole: "client",
    label: "Agradecimento pos atendimento",
    description: "Enviado apos marcar comparecimento no painel.",
    category: "cliente",
    clientGroup: "pos_atendimento",
    defaultEnabled: false,
    scheduleKind: "after_appointment",
    scheduleOffsetMinutes: 60,
    defaultBody: "Ola {nome}! Obrigado pela visita. Esperamos voce em breve!",
  },
  {
    key: "review_request",
    recipientRole: "client",
    label: "Pedido de avaliacao",
    description: "Convida o cliente a avaliar o atendimento.",
    category: "cliente",
    clientGroup: "pos_atendimento",
    defaultEnabled: true,
    scheduleKind: "after_appointment",
    scheduleOffsetMinutes: 1440,
    defaultBody: "Ola {nome}! Como foi seu atendimento? Avalie em: {link}",
  },
  {
    key: "reactivation",
    recipientRole: "client",
    label: "Reativacao de cliente",
    description: "Para clientes inativos ha algum tempo (processamento futuro).",
    category: "cliente",
    clientGroup: "reativacao",
    defaultEnabled: false,
    scheduleKind: "immediate",
    scheduleOffsetMinutes: null,
    defaultBody: "Ola {nome}! Sentimos sua falta. Que tal agendar? {link_vitrine}",
  },
  {
    key: "no_show_followup",
    recipientRole: "client",
    label: "Follow up apos falta",
    description: "Quando o agendamento e marcado como faltou.",
    category: "cliente",
    clientGroup: "pos_atendimento",
    defaultEnabled: false,
    scheduleKind: "after_appointment",
    scheduleOffsetMinutes: 120,
    defaultBody: "Ola {nome}. Notamos sua ausencia em {data}. Para reagendar: {link_vitrine}",
  },
  {
    key: "owner_new_booking",
    recipientRole: "owner",
    label: "Novo agendamento (responsavel)",
    description: "Alerta interno quando entra um novo agendamento.",
    category: "empresa",
    defaultEnabled: true,
    scheduleKind: "immediate",
    scheduleOffsetMinutes: null,
    defaultBody: "Novo agendamento: {nome} - {servico} em {data} as {hora} com {profissional}.",
  },
  {
    key: "owner_booking_cancelled",
    recipientRole: "owner",
    label: "Cancelamento (responsavel)",
    description: "Alerta interno quando um agendamento e cancelado.",
    category: "empresa",
    defaultEnabled: true,
    scheduleKind: "immediate",
    scheduleOffsetMinutes: null,
    defaultBody: "Cancelamento: {nome} - {servico} em {data} as {hora}.",
  },
  {
    key: "owner_payment_received",
    recipientRole: "owner",
    label: "Pagamento recebido (responsavel)",
    description: "Quando um pagamento online e confirmado.",
    category: "empresa",
    defaultEnabled: false,
    scheduleKind: "immediate",
    scheduleOffsetMinutes: null,
    defaultBody: "Pagamento recebido: {valor} de {nome} ({servico}, {data}).",
  },
  {
    key: "owner_daily_summary",
    recipientRole: "owner",
    label: "Resumo diario (responsavel)",
    description: "Resumo matinal dos agendamentos do dia (processamento futuro).",
    category: "empresa",
    defaultEnabled: false,
    scheduleKind: "immediate",
    scheduleOffsetMinutes: null,
    defaultBody: "Resumo do dia: consulte sua agenda em {link}.",
  },
  {
    key: "staff_new_booking",
    recipientRole: "staff",
    label: "Novo agendamento (profissional)",
    description: "Alerta para o colaborador responsavel pelo horario.",
    category: "profissional",
    defaultEnabled: false,
    scheduleKind: "immediate",
    scheduleOffsetMinutes: null,
    defaultBody: "Novo cliente {nome}: {servico} em {data} as {hora}.",
  },
  {
    key: "staff_booking_cancelled",
    recipientRole: "staff",
    label: "Cancelamento (profissional)",
    description: "Quando um agendamento do colaborador e cancelado.",
    category: "profissional",
    defaultEnabled: false,
    scheduleKind: "immediate",
    scheduleOffsetMinutes: null,
    defaultBody: "Cancelado: {nome} - {servico} em {data} as {hora}.",
  },
  {
    key: "staff_day_reminder",
    recipientRole: "staff",
    label: "Lembrete do dia (profissional)",
    description: "Lembrete no dia do atendimento para o colaborador.",
    category: "profissional",
    defaultEnabled: false,
    scheduleKind: "before_appointment",
    scheduleOffsetMinutes: -480,
    defaultBody: "Hoje: {nome} - {servico} as {hora}.",
  },
];

export const WHATSAPP_EVENT_MAP = new Map(
  WHATSAPP_EVENTS.map((e) => [`${e.key}:${e.recipientRole}`, e] as const)
);

export function getWhatsAppEvent(key: WhatsAppEventKey, role: WhatsAppRecipientRole) {
  return WHATSAPP_EVENT_MAP.get(`${key}:${role}`);
}

export function listWhatsAppEventsByCategory(category: WhatsAppEventDefinition["category"]) {
  return WHATSAPP_EVENTS.filter((e) => e.category === category);
}

export function listWhatsAppClientEventsByGroup(group: WhatsAppClientListGroup) {
  return WHATSAPP_EVENTS.filter((e) => e.category === "cliente" && e.clientGroup === group);
}

export function isWhatsAppEventKey(v: string): v is WhatsAppEventKey {
  return WHATSAPP_EVENTS.some((e) => e.key === v);
}
