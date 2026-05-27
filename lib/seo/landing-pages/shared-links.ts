import type { SeoRelatedLink } from "./types";

export const CORE_SEO_LINKS: SeoRelatedLink[] = [
  { href: "/plataforma-de-agendamento-online", label: "Plataforma de agendamento online" },
  { href: "/sistema-de-agendamento-online", label: "Sistema de agendamento online" },
  { href: "/software-de-agendamento", label: "Software de agendamento" },
  { href: "/agenda-online", label: "Agenda online para prestadores" },
  { href: "/agendamento-online", label: "Como funciona o agendamento online" },
  { href: "/blog", label: "Blog com guias práticos" },
];

export const SEGMENT_SEO_LINKS: SeoRelatedLink[] = [
  { href: "/agenda-online-para-salao", label: "Agenda online para salão" },
  { href: "/agenda-online-para-barbearia", label: "Agenda online para barbearia" },
  { href: "/agenda-online-para-clinicas", label: "Agenda online para clínicas" },
  { href: "/agenda-online-para-psicologos", label: "Agenda online para psicólogos" },
  { href: "/agenda-online-para-estetica", label: "Agenda online para estética" },
];

export function pickRelatedLinks(...groups: SeoRelatedLink[][]): SeoRelatedLink[] {
  const seen = new Set<string>();
  const out: SeoRelatedLink[] = [];
  for (const group of groups) {
    for (const link of group) {
      if (seen.has(link.href)) continue;
      seen.add(link.href);
      out.push(link);
    }
  }
  return out.slice(0, 8);
}
