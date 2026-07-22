import type { WhatsAppTemplateContext } from "./types";
import { getSiteUrl } from "@/lib/site-url";
import { formatBrazilPhoneFromDigits } from "@/lib/utils";

export type WhatsAppVariableDefinition = {
  key: string;
  label: string;
  description: string;
  example: string;
  /** Aliases aceitos no template (ex: {nome} e {nome_cliente}) */
  aliases?: string[];
};

export const WHATSAPP_TEMPLATE_VARIABLES: WhatsAppVariableDefinition[] = [
  { key: "nome", label: "Nome do cliente", description: "Nome informado no agendamento", example: "Maria Silva", aliases: ["nome_cliente", "cliente"] },
  { key: "empresa", label: "Nome da empresa", description: "Nome do negocio", example: "Studio Beleza", aliases: ["negocio"] },
  { key: "profissional", label: "Profissional", description: "Colaborador do agendamento", example: "Ana Costa", aliases: ["colaborador"] },
  { key: "servico", label: "Servico", description: "Nome do servico agendado", example: "Corte feminino", aliases: ["serviço"] },
  { key: "data", label: "Data", description: "Data do agendamento", example: "15/08/2026" },
  { key: "hora", label: "Horario", description: "Horario de inicio", example: "14:30", aliases: ["horario"] },
  { key: "hora_fim", label: "Horario fim", description: "Horario de termino", example: "15:30" },
  { key: "duracao", label: "Duracao", description: "Duracao do servico", example: "60 min" },
  { key: "endereco", label: "Endereco", description: "Endereco do estabelecimento", example: "Rua das Flores, 100" },
  { key: "telefone_empresa", label: "Telefone da empresa", description: "Telefone de contato do negocio", example: "(11) 99999-0000" },
  { key: "telefone_cliente", label: "Telefone do cliente", description: "Telefone informado pelo cliente", example: "(11) 98888-7777" },
  { key: "valor", label: "Valor total", description: "Valor do servico formatado", example: "R$ 120,00" },
  { key: "valor_sinal", label: "Valor do sinal", description: "Valor devido online (sinal ou integral)", example: "R$ 36,00" },
  { key: "valor_restante", label: "Valor restante", description: "Valor a pagar no local", example: "R$ 84,00" },
  { key: "forma_pagamento", label: "Forma de pagamento", description: "Resumo da politica de pagamento", example: "Sinal via Mercado Pago" },
  { key: "status", label: "Status", description: "Status atual do agendamento", example: "Confirmado" },
  { key: "link", label: "Link util", description: "Link principal (vitrine ou agendamento)", example: "{link_agendamento}" },
  { key: "link_vitrine", label: "Link da vitrine", description: "Pagina publica do negocio", example: "{link_vitrine}" },
  { key: "link_agendamento", label: "Link do agendamento", description: "Pagina de agendar", example: "{link_agendamento}" },
  { key: "link_cancelamento", label: "Link de cancelamento", description: "Link para cancelar (quando disponivel)", example: "{link_cancelamento}" },
  { key: "observacoes", label: "Observacoes", description: "Notas do agendamento", example: "Preferencia por atendimento rapido" },
];

const ALIAS_TO_KEY = new Map<string, string>();
for (const v of WHATSAPP_TEMPLATE_VARIABLES) {
  ALIAS_TO_KEY.set(v.key, v.key);
  for (const a of v.aliases ?? []) {
    ALIAS_TO_KEY.set(a, v.key);
  }
}

export type WhatsAppSampleBusiness = {
  slug?: string | null;
  name?: string | null;
  phone?: string | null;
  city?: string | null;
};

export type BuildSampleTemplateContextOptions = {
  business?: WhatsAppSampleBusiness | null;
  /** Origem publica (ex.: window.location.origin ou NEXT_PUBLIC_SITE_URL). */
  siteBase?: string;
};

function defaultSampleLinks(siteBase: string, slug: string) {
  const base = siteBase.replace(/\/$/, "");
  const encoded = encodeURIComponent(slug);
  const vitrine = `${base}/${encoded}`;
  return {
    link_vitrine: vitrine,
    link_agendamento: `${vitrine}/agendar`,
    link: `${vitrine}/agendar`,
    link_cancelamento: `${base}/conta`,
  };
}

export function buildSampleTemplateContext(options?: BuildSampleTemplateContextOptions): WhatsAppTemplateContext {
  const siteBase = options?.siteBase?.trim() || getSiteUrl();
  const slug = options?.business?.slug?.trim() || "seu-negocio";
  const links = defaultSampleLinks(siteBase, slug);

  const ctx: WhatsAppTemplateContext = {};
  for (const v of WHATSAPP_TEMPLATE_VARIABLES) {
    ctx[v.key] = v.example;
  }

  Object.assign(ctx, links);

  if (options?.business?.name?.trim()) {
    ctx.empresa = options.business.name.trim();
  }
  if (options?.business?.phone?.trim()) {
    ctx.telefone_empresa =
      formatBrazilPhoneFromDigits(options.business.phone.replace(/\D/g, "")) || options.business.phone.trim();
  }
  if (options?.business?.city?.trim()) {
    ctx.endereco = options.business.city.trim();
  }

  return ctx;
}

export function renderWhatsAppTemplate(body: string, context: WhatsAppTemplateContext): string {
  return body.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, rawKey: string) => {
    const canonical = ALIAS_TO_KEY.get(rawKey) ?? rawKey;
    const value = context[canonical] ?? context[rawKey];
    return value != null && value !== "" ? value : match;
  });
}

export function extractTemplateVariableKeys(body: string): string[] {
  const keys = new Set<string>();
  const matches = body.matchAll(/\{([a-zA-Z0-9_]+)\}/g);
  for (const m of Array.from(matches)) {
    keys.add(m[1]!);
  }
  return Array.from(keys);
}

export function normalizePhoneE164(phone: string, defaultCountryCode = "55"): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith(defaultCountryCode) && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `${defaultCountryCode}${digits}`;
  return digits;
}

export function formatCentsBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function formatAppointmentDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

export function formatAppointmentTime(time: string): string {
  return time.slice(0, 5);
}

export function computeDurationLabel(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return "";
  const mins = eh! * 60 + em! - (sh! * 60 + sm!);
  if (mins <= 0) return "";
  if (mins % 60 === 0) return `${mins / 60} h`;
  return `${mins} min`;
}
