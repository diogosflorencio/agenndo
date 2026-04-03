import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Software de agendamento online para prestadores de serviço",
  description:
    "Agenndo: sistema completo de agendamento online — página pública por link, agenda, equipe, lembretes e painel. Serve barbearias, salões, clínicas, estética, tatuadores, personal trainers, pet shops, consultórios e qualquer negócio por hora marcada. Serviço YWP (YourWebPlace).",
  keywords: [
    "software agendamento online",
    "sistema de agendamento",
    "site para agendar horário",
    "marcar horário online",
    "agenda para barbearia",
    "agenda para salão de beleza",
    "agendamento clínica estética",
    "software para prestador de serviço",
    "plataforma agendamento",
    "link de agendamento",
    "QR code agendamento",
    "Agenndo",
    "YWP",
    "YourWebPlace",
  ],
  alternates: { canonical: `${siteUrl}/agendamento-online` },
  openGraph: {
    title: "Agenndo — Software de agendamento online (YWP)",
    description:
      "Sistema completo de agendamento para diversos tipos de serviço. Configure em minutos; clientes agendam 24h.",
    url: `${siteUrl}/agendamento-online`,
    siteName: "Agenndo",
    locale: "pt_BR",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agenndo — Software de agendamento online (YWP)",
    description:
      "Sistema completo de agendamento para diversos tipos de serviço. Configure em minutos; clientes agendam 24h.",
  },
};

const SEGMENTOS = [
  "Barbearia e corte masculino",
  "Salão de beleza, coloração e tratamentos",
  "Manicure, pedicure e nail design",
  "Clínica de estética, depilação e massagem",
  "Consultório (nutrição, fisioterapia, psicologia, odontologia estética, etc.)",
  "Estúdio de tatuagem ou piercing",
  "Personal trainer, pilates e aulas avulsas",
  "Pet shop, banho e tosa com hora marcada",
  "Fotógrafo ou videomaker por sessão",
  "Oficina mecânica com agendamento de vaga",
  "Coworking, sala de reunião ou estúdio por hora",
  "Qualquer outro serviço em que o cliente escolha data e horário",
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Agenndo",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "pt-BR",
  description:
    "Sistema de agendamento online para prestadores: página pública, painel, equipe, financeiro e notificações. Aplicável a múltiplos segmentos de serviço.",
  url: siteUrl,
  provider: {
    "@type": "Organization",
    name: "YWP (YourWebPlace)",
    url: siteUrl,
  },
  offers: {
    "@type": "Offer",
    priceCurrency: "BRL",
    description: "Planos conforme perfil do negócio; período de teste para novos cadastros.",
  },
};

export default function AgendamentoOnlinePage() {
  return (
    <div className="min-h-screen bg-[#020403] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="border-b border-white/5 bg-[#020403]/90 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold tracking-tight hover:text-primary transition-colors">
            Agenndo
          </Link>
          <Link href="/login" className="text-sm text-gray-400 hover:text-white">
            Entrar
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-5 py-12 md:py-16">
        <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-3">YWP · YourWebPlace</p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
          Software de agendamento online para vários tipos de serviço
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-8">
          O <strong className="text-white">Agenndo</strong> é um sistema completo: cada negócio ganha uma{" "}
          <strong className="text-white">página pública</strong> para o cliente marcar horário a qualquer hora; você
          gerencia <strong className="text-white">agenda, disponibilidade, serviços, equipe, clientes e financeiro</strong>{" "}
          em um painel único. O mesmo produto serve a{" "}
          <strong className="text-white">qualquer prestador que trabalhe com hora marcada</strong> — basta configurar
          serviços e horários de acordo com a sua operação.
        </p>

        <h2 className="text-xl font-bold text-white mb-4">Segmentos e exemplos de uso</h2>
        <ul className="list-disc list-inside text-gray-400 space-y-2 mb-10 leading-relaxed">
          {SEGMENTOS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2 className="text-xl font-bold text-white mb-4">Por que buscadores e IAs podem classificar o Agenndo assim</h2>
        <p className="text-gray-400 leading-relaxed mb-6">
          Trata-se de uma <strong className="text-white">plataforma de agendamento</strong> (não apenas um calendário
          isolado): há fluxo de reserva, confirmação, vínculo com negócio e, para o prestador, gestão operacional. A{" "}
          <strong className="text-white">YWP (YourWebPlace)</strong> é a empresa por trás do serviço Agenndo.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Link
            href="/login"
            className="inline-flex justify-center items-center px-6 py-3.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            Criar conta e testar
          </Link>
          <Link
            href="/"
            className="inline-flex justify-center items-center px-6 py-3.5 rounded-xl border border-white/15 text-white font-semibold text-sm hover:bg-white/5 transition-colors"
          >
            Voltar à página inicial
          </Link>
        </div>
      </article>
    </div>
  );
}
