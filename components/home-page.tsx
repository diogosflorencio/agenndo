"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LoginEntryLink } from "@/components/auth/login-entry-link";
import { WhatsAppSupportWidget } from "@/components/whatsapp-support-widget";
import { HOME_FAQS } from "@/lib/seo/home-faq-data";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
type FeatureHighlight = "novo" | "evoluindo";

type FeatureCard = {
  icon: string;
  title: string;
  desc: string;
  highlight?: FeatureHighlight;
};

/** Pilares visíveis na landing (conversão + SEO por segmento). */
const SEGMENTS = [
  { label: "Salões", href: "/agenda-online-para-salao", icon: "content_cut" },
  { label: "Barbearias", href: "/agenda-online-para-barbearia", icon: "face_6" },
  { label: "Clínicas", href: "/agenda-online-para-clinicas", icon: "medical_services" },
  { label: "Estética", href: "/agenda-online-para-estetica", icon: "spa" },
  { label: "Psicólogos", href: "/agenda-online-para-psicologos", icon: "psychology" },
  { label: "Outros serviços", href: "/agenda-online", icon: "handyman" },
] as const;

const FEATURE_PILLARS = [
  {
    icon: "qr_code_2",
    title: "Agenda online que vende por você",
    desc: "Página pública com sua marca, link único e QR Code. Cliente agenda sozinho - inclusive de madrugada.",
    bullets: ["Link para bio, WhatsApp e Google", "Serviços, profissionais e horários reais", "Confirmação e lembretes automáticos"],
  },
  {
    icon: "dashboard",
    title: "Painel completo no celular",
    desc: "Do primeiro agendamento ao financeiro: tudo num só lugar, pensado para quem vive na correria.",
    bullets: ["Agenda, equipe e disponibilidade", "Pix e Mercado Pago para sinal ou pagamento", "Clientes, comissões e analytics"],
  },
  {
    icon: "trending_up",
    title: "Menos faltas, mais receita",
    desc: "Lembretes, status de comparecimento e visão clara do que entrou no caixa.",
    bullets: ["Lembretes por WhatsApp (configurável)", "Marca compareceu / faltou na hora", "Financeiro ligado aos agendamentos"],
  },
] as const;

/** Destaques do produto (grid compacto). */
const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: "calendar_month",
    title: "Agenda e agendamentos",
    desc: "Horários, bloqueios, status e visão do dia.",
  },
  {
    icon: "groups",
    title: "Equipe e comissões",
    desc: "Colaboradores, serviços por profissional e painel do profissional.",
    highlight: "evoluindo",
  },
  {
    icon: "payments",
    title: "Receber pagamentos",
    desc: "Pix manual ou Mercado Pago conectado para sinal e pagamento antecipado.",
  },
  {
    icon: "palette",
    title: "Personalização",
    desc: "Logo, cores, banner e galeria na sua página pública.",
  },
  {
    icon: "analytics",
    title: "Analytics",
    desc: "Ocupação, receita por serviço e hábitos da agenda.",
  },
  {
    icon: "chat",
    title: "WhatsApp automático",
    desc: "Templates de confirmação, lembrete e alertas - você configura o que enviar.",
    highlight: "evoluindo",
  },
];

type MockStat = {
  icon: string;
  label: string;
  value: string;
  trend: string;
  trendColor: string;
};

const MOCK_STAT_SLIDES: { key: string; hint: string; items: MockStat[] }[] = [
  {
    key: "operacao",
    hint: "Operação do dia",
    items: [
      { icon: "calendar_today", label: "Agend.", value: "12", trend: "+15%", trendColor: "text-primary" },
      { icon: "cancel", label: "Canc.", value: "2", trend: "-5%", trendColor: "text-red-400" },
      { icon: "person_off", label: "Faltas", value: "1", trend: "--", trendColor: "text-gray-500" },
    ],
  },
  {
    key: "financeiro",
    hint: "Financeiro & serviços",
    items: [
      { icon: "payments", label: "Receita", value: "R$ 1,2k", trend: "+8%", trendColor: "text-primary" },
      { icon: "savings", label: "Comissões", value: "18", trend: "3 pendentes", trendColor: "text-amber-400" },
      { icon: "category", label: "Serviços", value: "14", trend: "ativos", trendColor: "text-gray-400" },
    ],
  },
  {
    key: "equipe",
    hint: "Equipe & clientes",
    items: [
      { icon: "groups", label: "Na equipe", value: "6", trend: "ativos", trendColor: "text-primary" },
      { icon: "person_search", label: "Clientes", value: "240", trend: "+12", trendColor: "text-teal-400" },
      { icon: "analytics", label: "Taxa ok", value: "92%", trend: "mês", trendColor: "text-gray-400" },
    ],
  },
];

const MOCK_NOTIFICATION_TOASTS: {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
}[] = [
  {
    key: "booking_in",
    icon: "event_available",
    title: "Novo agendamento",
    subtitle: "Marina · Corte · 17:00 · página pública",
  },
  {
    key: "reminder_sent",
    icon: "schedule_send",
    title: "Lembrete enviado",
    subtitle: "João Silva · consulta em 1 h",
  },
  {
    key: "client_reply",
    icon: "mark_email_read",
    title: "Cliente confirmou",
    subtitle: "Comparece às 14:00 - link na mensagem",
  },
  {
    key: "slot_hold",
    icon: "hourglass_top",
    title: "Horário reservado",
    subtitle: "Cliente finalizando · 8 min",
  },
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const primaryCta =
    "inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all shadow-lg shadow-primary/25";

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-20 md:pb-0">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-gray-900 shrink-0">
            Agenndo
          </Link>
          <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-gray-600">
            <Link className="hover:text-gray-900 transition-colors" href="#funcionalidades">
              Funcionalidades
            </Link>
            <Link className="hover:text-gray-900 transition-colors" href="#segmentos">
              Para quem é
            </Link>
            <Link className="hover:text-gray-900 transition-colors" href="#faq">
              FAQ
            </Link>
            <Link className="hover:text-gray-900 transition-colors" href="/blog">
              Blog
            </Link>
            <Link className="hover:text-gray-900 transition-colors" href="/sobre">
              Sobre
            </Link>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LoginEntryLink className="hidden sm:inline-flex text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-2">
              Entrar
            </LoginEntryLink>
            <LoginEntryLink className={`${primaryCta} text-sm py-2.5 px-5 rounded-full`}>
              Começar grátis
            </LoginEntryLink>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative pt-28 pb-16 md:pt-40 md:pb-24 px-4 sm:px-6 overflow-hidden bg-gradient-to-b from-emerald-50/90 via-white to-white">
        <div className="absolute top-20 right-0 w-[480px] h-[480px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left space-y-7 z-10 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200/80 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Sistema de agendamento online · teste 7 dias grátis
            </div>

            <h1
              id="hero-headline"
              className="text-4xl md:text-[2.75rem] lg:text-5xl font-extrabold tracking-tight text-gray-900 leading-[1.08]"
            >
              Agenda online para{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                salão, clínica e barbearia
              </span>
            </h1>

            <p id="hero-summary" className="text-lg text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Plataforma de agendamento com página pública, link e QR Code. Seus clientes marcam horário 24h; você
              organiza equipe, pagamentos e lembretes em um painel simples - feito para prestadores de serviço no
              Brasil.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <LoginEntryLink className={`${primaryCta} w-full sm:w-auto`}>
                Criar minha agenda grátis
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </LoginEntryLink>
              <Link
                href="/agendamento-online"
                className="w-full sm:w-auto px-8 py-4 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                Como funciona
              </Link>
            </div>

            <ul className="flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-gray-500 font-medium">
              {["Sem cartão no teste", "7 dias grátis", "Suporte em português", "Cancele quando quiser"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                  {t}
                </li>
              ))}
            </ul>

            <div className="lg:hidden relative mx-auto z-10 mt-4">
              <PhoneMockup />
            </div>
          </div>

          <div className="hidden lg:block relative mx-auto lg:mr-0 z-10 order-1 lg:order-2">
            <PhoneMockup large />
            <div
              className="absolute top-[160px] -right-8 bg-white p-4 rounded-xl border border-gray-200 shadow-xl z-20 hidden xl:block"
              style={{ animation: "bounce 3s infinite" }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-emerald-600">payments</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Receita hoje</p>
                  <p className="text-sm font-bold text-gray-900">R$ 850,00</p>
                </div>
              </div>
            </div>
            <div
              className="absolute bottom-44 -left-8 bg-white p-4 rounded-xl border border-gray-200 shadow-xl z-20 hidden xl:block"
              style={{ animation: "bounce 4s infinite" }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-amber-600">star</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Novo agendamento</p>
                  <p className="text-sm font-bold text-gray-900">Via link público</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="py-12 bg-gray-50 border-y border-gray-200/80" aria-label="Números do Agenndo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "2.000+", label: "Profissionais ativos" },
              { value: "7 dias", label: "Teste gratuito" },
              { value: "24/7", label: "Agendamento online" },
              { value: "100%", label: "Em português" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-1">{s.value}</p>
                <p className="text-sm text-gray-600">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Segmentos - SEO interno + conversão */}
      <section id="segmentos" className="py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">Para quem é</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Software de agendamento para o seu tipo de negócio
            </h2>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              Mesma plataforma, configurada para salões, clínicas, barbearias, consultórios e qualquer serviço por hora
              marcada.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {SEGMENTS.map((seg) => (
              <Link
                key={seg.href}
                href={seg.href}
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/5 transition-all text-center"
              >
                <span className="material-symbols-outlined text-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                  {seg.icon}
                </span>
                <span className="text-sm font-semibold text-gray-800">{seg.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pilares */}
      <section id="funcionalidades" className="py-16 md:py-20 bg-white px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">Por que assinar</p>
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">
              Tudo que você precisa para encher a agenda
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Não é só um link de agendamento: é operação completa - da vitrine online ao financeiro.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-14">
            {FEATURE_PILLARS.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50/80 to-white p-6 md:p-7 shadow-sm"
              >
                <div className="size-11 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-emerald-700 text-2xl">{pillar.icon}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{pillar.title}</h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{pillar.desc}</p>
                <ul className="space-y-2">
                  {pillar.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">check</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {FEATURE_CARDS.map((f) => (
              <div
                key={f.title}
                className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 hover:border-emerald-200 hover:shadow-md transition-all duration-300 group flex flex-col"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <span className="material-symbols-outlined text-emerald-600 text-xl">{f.icon}</span>
                  </div>
                  {f.highlight ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border border-teal-200 bg-teal-50 text-teal-700 shrink-0">
                      {f.highlight === "novo" ? "Novo" : "Evoluindo"}
                    </span>
                  ) : null}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed flex-1">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <LoginEntryLink className={primaryCta}>
              Quero testar grátis por 7 dias
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </LoginEntryLink>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16 md:py-24 bg-gray-50 border-y border-gray-200/80 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3">Como funciona o agendamento online</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Em três passos você publica sua agenda e começa a receber clientes pelo link
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />

            {[
              {
                n: "1",
                title: "Crie sua conta grátis",
                desc: "Entre com Google, configure nome e slug da sua página (ex.: agenndo.com.br/seu-negocio). 7 dias de teste, sem cartão.",
                icon: "rocket_launch",
              },
              {
                n: "2",
                title: "Cadastre serviços e horários",
                desc: "Serviços, equipe, disponibilidade e personalização visual. Seu link fica pronto para compartilhar.",
                icon: "tune",
              },
              {
                n: "3",
                title: "Divulgue e receba agendamentos",
                desc: "Bio do Instagram, WhatsApp, QR no balcão. Clientes marcam 24h; você acompanha tudo no painel.",
                icon: "share",
              },
            ].map((step) => (
              <article key={step.n} className="text-center relative bg-white md:bg-transparent rounded-2xl md:rounded-none border md:border-0 border-gray-200 p-6 md:p-0">
                <div className="size-14 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-5">
                  <span className="text-xl font-bold text-emerald-700">{step.n}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-16 md:py-24 bg-white px-4 sm:px-6" aria-label="Depoimentos de clientes">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3">Quem usa recomenda</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Prestadores que saíram do caderninho e do WhatsApp manual
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                name: "Fernanda Rocha",
                role: "Salão de beleza · São Paulo",
                text: "Em 3 dias tinha minha agenda pública no ar. Clientes agendam sozinhos e eu chego com a agenda organizada.",
              },
              {
                name: "Ricardo Alves",
                role: "Clínica estética · Belo Horizonte",
                text: "Comissões da equipe e painel do profissional economizam horas por semana. Suporte em português, direto ao ponto.",
              },
              {
                name: "Camila Torres",
                role: "Consultório · Curitiba",
                text: "Link na bio do Instagram e os agendamentos vieram. Página profissional que passa confiança.",
              },
            ].map((testimonial) => (
              <blockquote
                key={testimonial.name}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:border-emerald-200 transition-colors"
              >
                <div className="flex gap-1 text-amber-500 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 mb-4 leading-relaxed">&ldquo;{testimonial.text}&rdquo;</p>
                <footer>
                  <p className="text-sm font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{testimonial.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Preço / CTA */}
      <section className="py-16 md:py-20 bg-emerald-50 border-y border-emerald-100 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-4">
            7 dias grátis · sem cartão
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">
            Comece grátis. Assine só se fizer sentido.
          </h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Teste o painel completo por uma semana. Depois, o plano aparece em <strong>Conta</strong>, conforme o perfil
            do seu negócio - sem surpresa escondida.
          </p>
          <LoginEntryLink className={primaryCta}>
            Criar minha agenda agora
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </LoginEntryLink>
          <p className="mt-4 text-xs text-gray-500">
            Também disponível:{" "}
            <Link href="/plataforma-de-agendamento-online" className="text-emerald-700 font-medium hover:underline">
              plataforma de agendamento
            </Link>
            ,{" "}
            <Link href="/software-de-agendamento" className="text-emerald-700 font-medium hover:underline">
              software de agendamento
            </Link>{" "}
            e páginas por segmento no rodapé.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 md:py-24 bg-white px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Perguntas frequentes</h2>
            <p className="text-gray-600 text-sm max-w-lg mx-auto">
              Dúvidas comuns sobre teste grátis, painel, pagamentos e cancelamento
            </p>
          </div>

          <div className="space-y-2">
            {HOME_FAQS.map((faq, i) => (
              <div
                key={faq.q}
                className={cn(
                  "bg-white rounded-xl border transition-all duration-200 overflow-hidden",
                  openFaq === i ? "border-emerald-300 shadow-sm" : "border-gray-200 hover:border-gray-300"
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4"
                  aria-expanded={openFaq === i}
                >
                  <span className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug pr-2">{faq.q}</span>
                  <span
                    className={cn(
                      "material-symbols-outlined text-emerald-600 shrink-0 transition-transform duration-200",
                      openFaq === i ? "rotate-180" : ""
                    )}
                  >
                    expand_more
                  </span>
                </button>
                {openFaq === i ? (
                  <div className="px-5 pb-5 pt-0 border-t border-gray-100">
                    <p className="home-faq-answer text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 md:py-24 bg-gray-900 text-white px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            Sua agenda online pronta em minutos
          </h2>
          <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
            Junte-se a milhares de prestadores que já usam o Agenndo para receber agendamentos todos os dias.
          </p>
          <LoginEntryLink
            className="inline-flex items-center gap-2 px-10 py-5 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all shadow-lg shadow-primary/30 text-lg"
          >
            Teste grátis por 7 dias
            <span className="material-symbols-outlined">arrow_forward</span>
          </LoginEntryLink>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 pt-14 pb-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10 mb-12">
            <div className="col-span-2">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Agenndo
              </Link>
              <p className="text-gray-600 text-sm max-w-sm mt-4 mb-6 leading-relaxed">
                Plataforma de agendamento online para prestadores de serviço no Brasil. Agenda, link público, equipe e
                financeiro em um só lugar.
              </p>
            </div>
            <div>
              <h4 className="text-gray-900 font-bold mb-4 text-sm">Produto</h4>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li><Link href="/agendamento-online" className="hover:text-emerald-700">Como funciona</Link></li>
                <li><Link href="/sobre" className="hover:text-emerald-700">Sobre nós</Link></li>
                <li><Link href="/blog" className="hover:text-emerald-700">Blog</Link></li>
                <li><Link href="/login" className="hover:text-emerald-700">Entrar</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-bold mb-4 text-sm">Agenda online</h4>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li><Link href="/plataforma-de-agendamento-online" className="hover:text-emerald-700">Plataforma</Link></li>
                <li><Link href="/sistema-de-agendamento-online" className="hover:text-emerald-700">Sistema</Link></li>
                <li><Link href="/software-de-agendamento" className="hover:text-emerald-700">Software</Link></li>
                <li><Link href="/agenda-online-para-salao" className="hover:text-emerald-700">Salões</Link></li>
                <li><Link href="/agenda-online-para-barbearia" className="hover:text-emerald-700">Barbearias</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-bold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li><Link href="/termos" className="hover:text-emerald-700">Termos</Link></li>
                <li><Link href="/politicas" className="hover:text-emerald-700">Privacidade</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
            <p>© 2024–2026 Agenndo · YWP (YourWebPlace). Todos os direitos reservados.</p>
            <p>Sistema de agendamento online para prestadores de serviço no Brasil.</p>
          </div>
        </div>
      </footer>

      {/* CTA fixo mobile */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <LoginEntryLink className={`${primaryCta} w-full text-sm py-3.5`}>
          Começar grátis - 7 dias
        </LoginEntryLink>
      </div>

      <WhatsAppSupportWidget context="landing" />
    </div>
  );
}

function PhoneMockup({ large = false }: { large?: boolean }) {
  const w = large ? "w-[320px]" : "w-[280px]";
  const h = large ? "h-[660px]" : "h-[580px]";
  const [statSlide, setStatSlide] = useState(0);
  const [toastIdx, setToastIdx] = useState(0);
  const [notifCount, setNotifCount] = useState(1);
  const [presencePulse, setPresencePulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setStatSlide((i) => (i + 1) % MOCK_STAT_SLIDES.length);
    }, 4200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setToastIdx((i) => (i + 1) % MOCK_NOTIFICATION_TOASTS.length);
      setNotifCount((c) => c + 1);
    }, 4600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let hidePulse: ReturnType<typeof setTimeout>;
    const pulse = () => {
      setPresencePulse(true);
      clearTimeout(hidePulse);
      hidePulse = setTimeout(() => {
        if (!cancelled) setPresencePulse(false);
      }, 2400);
    };
    pulse();
    const interval = setInterval(pulse, 8200);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(hidePulse);
    };
  }, []);

  const statPanel = MOCK_STAT_SLIDES[statSlide] ?? MOCK_STAT_SLIDES[0];
  const toast = MOCK_NOTIFICATION_TOASTS[toastIdx] ?? MOCK_NOTIFICATION_TOASTS[0];

  return (
    <div className={`relative ${w} ${h} bg-black rounded-[40px] border-[8px] border-gray-800 shadow-2xl overflow-hidden mx-auto transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500 flex flex-col`}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-b-2xl z-50" />
      <div className="w-full h-full bg-[#0B120E] text-white flex flex-col relative">
        {/* Header */}
        <header className="flex-shrink-0 pt-10 pb-4 px-5 bg-[#0B120E]/90 backdrop-blur-md border-b border-white/5 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full border-2 border-primary p-0.5">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/40 to-primary/60" />
              </div>
              <div>
                <p className="text-[10px] text-primary font-medium leading-none mb-0.5">Olá, Marcos</p>
                <h2 className="text-white text-lg font-bold leading-none">Dashboard</h2>
              </div>
            </div>
            <div className="relative size-9 rounded-full bg-[#14221A] border border-[#213428] flex items-center justify-center overflow-visible">
              <motion.span
                className="material-symbols-outlined text-white text-[18px]"
                animate={{ rotate: [0, -14, 8, -6, 0] }}
                transition={{ duration: 0.65, ease: "easeOut", repeat: Infinity, repeatDelay: 3.95 }}
              >
                notifications
              </motion.span>
              <motion.span
                key={notifCount}
                initial={{ scale: 0.55, opacity: 0.85 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 24 }}
                className={cn(
                  "absolute -top-0.5 -right-1 min-h-[18px] min-w-[18px] px-[5px] rounded-full bg-red-500 ring-2 ring-[#14221A]",
                  "flex items-center justify-center text-[10px] font-bold text-white tabular-nums leading-none shadow-sm"
                )}
              >
                {notifCount > 99 ? "99+" : notifCount}
              </motion.span>
            </div>
          </div>
        </header>

        {/* Notification toast - cicla com o mesmo índice das “novidades” */}
        <div className="relative z-20 shrink-0 px-3 -mt-1 pt-1 pb-2 pointer-events-none select-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={toast.key}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-xl border border-white/10 bg-[#14221A]/95 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.45)] px-3 py-2.5 flex gap-2.5 items-start"
            >
              <motion.span
                className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5"
                initial={{ rotate: -12, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
              >
                {toast.icon}
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-white leading-tight">{toast.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug line-clamp-2">{toast.subtitle}</p>
              </div>
              <motion.span
                className="text-[9px] font-semibold text-primary shrink-0 mt-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12 }}
              >
                agora
              </motion.span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <section className="px-4 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-semibold text-gray-500 tracking-wide">{statPanel.hint}</p>
              <div className="flex gap-1 shrink-0" aria-hidden>
                {MOCK_STAT_SLIDES.map((s, i) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStatSlide(i)}
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      i === statSlide ? "w-4 bg-primary" : "w-1.5 bg-white/20 hover:bg-white/35"
                    )}
                    aria-label={`Painel ${i + 1}`}
                  />
                ))}
              </div>
            </div>
            <div className="relative overflow-hidden min-h-[76px]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={statPanel.key}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-2"
                >
                  {statPanel.items.map((stat) => (
                    <div
                      key={`${statPanel.key}-${stat.label}`}
                      className="flex-1 min-w-0 basis-0 bg-[#14221A] border border-[#213428] rounded-xl p-2.5 flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <span className="material-symbols-outlined text-[16px]">{stat.icon}</span>
                        <span className="text-[10px] font-medium truncate">{stat.label}</span>
                      </div>
                      <div className="flex items-end gap-1 flex-wrap">
                        <span className="text-xl font-bold text-white leading-none">{stat.value}</span>
                        <span className={`text-[9px] font-bold mb-0.5 ${stat.trendColor}`}>{stat.trend}</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </section>

          <main className="px-4 space-y-3 pb-4">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-white text-sm font-bold">Próximos</h3>
              <span className="text-[9px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                Hoje, 24 Mai
              </span>
            </div>

            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: 0,
                boxShadow: presencePulse
                  ? "0 0 0 1px rgba(19,236,91,0.35), 0 12px 40px rgba(19,236,91,0.12)"
                  : "0 10px 40px rgba(0,0,0,0.25)",
              }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#14221A] border border-[#213428] rounded-xl overflow-hidden shadow-lg relative"
            >
              <div className="p-3 flex gap-3">
                <motion.div
                  className="size-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 shrink-0"
                  animate={presencePulse ? { scale: [1, 1.03, 1] } : {}}
                  transition={{ duration: 0.5 }}
                />
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-white text-sm">João Silva</h4>
                    <span className="text-primary font-bold text-xs shrink-0">14:00</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">Consulta de retorno</p>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <div className="size-3.5 rounded-full bg-gray-700 flex items-center justify-center text-[9px] text-white">L</div>
                    <span className="text-[9px] text-gray-500">Lucas</span>
                    <AnimatePresence>
                      {presencePulse ? (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.85, x: -4 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 500, damping: 28 }}
                          className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 border border-primary/25 px-1.5 py-0.5 text-[9px] font-bold text-primary"
                        >
                          <span className="material-symbols-outlined text-[11px]">verified</span>
                          Confirmado
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
              <AnimatePresence>
                {presencePulse ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden border-t border-primary/20 bg-gradient-to-r from-primary/10 to-transparent"
                  >
                    <div className="flex items-center gap-2 px-3 py-2">
                      <motion.span
                        className="material-symbols-outlined text-primary text-[18px]"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: [0, -8, 0] }}
                        transition={{ type: "spring", stiffness: 400, damping: 18 }}
                      >
                        task_alt
                      </motion.span>
                      <p className="text-[10px] font-semibold text-primary leading-tight">
                        Presença registrada · agenda atualizada
                      </p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <div className="grid grid-cols-2 gap-px bg-[#213428] border-t border-[#213428]">
                <motion.button
                  type="button"
                  aria-hidden
                  className="bg-[#14221A] text-[10px] font-semibold text-gray-300 py-2.5"
                  animate={presencePulse ? { backgroundColor: "rgba(20,34,26,0.6)" } : {}}
                >
                  Faltou
                </motion.button>
                <motion.button
                  type="button"
                  aria-hidden
                  className="bg-primary/20 text-[10px] font-bold text-primary py-2.5 relative overflow-hidden"
                  animate={
                    presencePulse
                      ? {
                          backgroundColor: "rgba(19,236,91,0.28)",
                          scale: [1, 1.02, 1],
                        }
                      : {}
                  }
                  transition={{ duration: 0.55 }}
                >
                  {presencePulse ? (
                    <motion.span
                      className="absolute inset-0 bg-primary/30"
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                  ) : null}
                  <span className="relative z-10">Compareceu</span>
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#14221A] border border-[#213428] rounded-xl p-3 flex gap-3"
            >
              <div className="size-12 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 shrink-0" />
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between">
                  <h4 className="font-bold text-white text-sm">Pedro Costa</h4>
                  <span className="text-primary font-bold text-xs">15:30</span>
                </div>
                <p className="text-gray-400 text-xs mt-0.5">Avaliação completa</p>
              </div>
            </motion.div>
          </main>
        </div>

        {/* Bottom nav */}
        <nav className="flex-shrink-0 w-full bg-[#0B120E]/95 backdrop-blur-md border-t border-[#213428] pt-2.5 pb-5 px-2 flex justify-between items-center z-40">
          {[
            { icon: "grid_view", label: "Início", active: true },
            { icon: "calendar_month", label: "Agenda", active: false },
            { icon: "list_alt", label: "Serviços", active: false },
            { icon: "groups", label: "Equipe", active: false },
            { icon: "person", label: "Conta", active: false },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
              <span className={`material-symbols-outlined text-[20px] ${item.active ? "text-primary" : "text-gray-500"}`}>
                {item.icon}
              </span>
              <span
                className={cn(
                  "text-[8px] truncate w-full text-center",
                  item.active ? "font-bold text-primary" : "font-medium text-gray-500"
                )}
              >
                {item.label}
              </span>
            </div>
          ))}
        </nav>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-white/20 rounded-full z-50 pointer-events-none" />
      </div>
    </div>
  );
}
