"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

/** Pilares do produto: base contínua + destaque onde houve evolução visível. */
const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: "calendar_month",
    title: "Agenda, disponibilidade e agendamentos",
    desc: "Horários semanais, exceções, bloqueios e agenda do dia com status (confirmado, compareceu, faltou, cancelado).",
  },
  {
    icon: "qr_code_2",
    title: "Página pública, link e QR Code",
    desc: "Sua marca em uma URL única; cliente escolhe serviço, profissional e horário. QR para balcão, vitrine ou cartão.",
  },
  {
    icon: "category",
    title: "Serviços e preços",
    desc: "Cadastro de serviços, duração, valores e variantes para combinar com sua operação.",
  },
  {
    icon: "groups",
    title: "Equipe e colaboradores",
    desc: "Profissionais ativos na agenda, vínculo com serviços e - quando você configurar - conta do colaborador para comissões.",
  },
  {
    icon: "savings",
    title: "Comissões e área do profissional",
    desc: "Módulo de comissões por atendimento; o profissional acessa um painel próprio e vê tudo em um só lugar se trabalhar em mais de um negócio.",
    highlight: "evoluindo",
  },
  {
    icon: "person_search",
    title: "Clientes",
    desc: "Base de clientes vinculada aos agendamentos para histórico e atendimento.",
  },
  {
    icon: "payments",
    title: "Financeiro",
    desc: "Visão de entradas e movimentos ligados à operação; integra com o fluxo de agendamentos.",
  },
  {
    icon: "analytics",
    title: "Analytics",
    desc: "Indicadores de ocupação, receita por serviço e hábitos de agenda para decidir com dados.",
  },
  {
    icon: "palette",
    title: "Personalização",
    desc: "Logo, cores, banner, galeria e redes - página alinhada à sua marca.",
  },
  {
    icon: "notifications_active",
    title: "Lembretes e notificações",
    desc: "Fluxos para reduzir faltas e manter cliente informado, conforme as configurações do negócio.",
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
      { icon: "payments", label: "Hoje R$", value: "1,2k", trend: "+8%", trendColor: "text-primary" },
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#020403]/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">Agenndo</span>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link className="hover:text-primary transition-colors" href="/sobre">Sobre nós</Link>
            <Link className="hover:text-primary transition-colors" href="/termos">Termos</Link>
            <Link className="hover:text-primary transition-colors" href="/politicas">Políticas</Link>
          </div>
          <Link
            href="/login"
            className="bg-primary hover:bg-primary/90 text-black font-bold py-2 px-5 rounded-full text-sm transition-all shadow-[0_0_15px_rgba(19,236,91,0.4)]"
          >
            Entrar
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden bg-[#020403]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left space-y-8 z-10 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              YWP · agenda pública + painel completo
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              A agenda que seu negócio{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">
                merece ter
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Para <strong className="text-white">clínicas, salões, consultórios, estúdios e prestadores de serviço</strong> em geral. Seus clientes agendam 24h por dia; você foca no que sabe fazer.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(19,236,91,0.3)] flex items-center justify-center gap-2"
              >
                Teste Grátis por 7 Dias
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </Link>
              <Link
                href="/ywp"
                className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">play_circle</span>
                Ver Demo
              </Link>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 text-sm text-gray-500 font-medium">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                Sem cartão de crédito
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                7 dias grátis
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                Suporte em português
              </div>
            </div>

            {/* Mobile mockup */}
            <div className="lg:hidden relative mx-auto z-10 mt-8">
              <PhoneMockup />
            </div>
          </div>

          {/* Desktop mockup */}
          <div className="hidden lg:block relative mx-auto lg:mr-0 z-10 order-1 lg:order-2">
            <PhoneMockup large />

            {/* Floating cards */}
            <div
              className="absolute top-[160px] -right-12 bg-[#14221A] p-4 rounded-xl border border-primary/30 shadow-xl z-20 animate-bounce hidden xl:block"
              style={{ animationDuration: "3s" }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-primary">payments</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Receita Hoje</p>
                  <p className="text-sm font-bold text-white">R$ 850,00</p>
                </div>
              </div>
            </div>

            <div
              className="absolute bottom-44 -left-12 bg-[#14221A] p-4 rounded-xl border border-primary/30 shadow-xl z-20 animate-bounce hidden xl:block"
              style={{ animationDuration: "4s" }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-blue-400">star</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Avaliação</p>
                  <p className="text-sm font-bold text-white">4.9/5.0</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="py-14 bg-[#080c0a] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "2.000+", label: "Profissionais ativos" },
              { value: "7 dias", label: "Teste gratuito" },
              { value: "99.9%", label: "Uptime garantido" },
              { value: "24/7", label: "Agendamento online" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-white mb-1">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-24 bg-[#020403]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Plataforma</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              O que você já tem no painel -{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">
                e o que segue evoluindo
              </span>
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Lista objetiva do que o Agenndo cobre hoje (agenda até analytics). Itens com etiqueta indicam áreas em que o produto
              tem recebido melhorias recentes - não é só “novidade”, é o conjunto do sistema que já descrevemos na página,
              agora organizado para você comparar com o que precisa no dia a dia.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {FEATURE_CARDS.map((f) => (
              <div
                key={f.title}
                className="bg-[#0f1c15] p-6 md:p-7 rounded-2xl border border-white/5 hover:border-primary/25 transition-all duration-300 group hover:-translate-y-0.5 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <span className="material-symbols-outlined text-primary text-2xl">{f.icon}</span>
                  </div>
                  {f.highlight ? (
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0",
                        f.highlight === "novo"
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-teal-500/35 bg-teal-500/10 text-teal-300"
                      )}
                    >
                      {f.highlight === "novo" ? "Novo" : "Evoluindo"}
                    </span>
                  ) : null}
                </div>
                <h3 className="text-lg font-bold text-white mb-2 leading-snug">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed flex-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap - visão futura sem overselling */}
      <section className="py-16 bg-[#080c0a] border-y border-white/5">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Roadmap</p>
          <h3 className="text-xl md:text-2xl font-bold text-white mb-4">Para ficar ainda mais completo</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Estamos preparando{" "}
            <strong className="text-gray-200">recebimento de pagamentos</strong> com possibilidade de conectar o{" "}
            <strong className="text-gray-200">Mercado Pago</strong> - o que abrirá caminho para cobrar{" "}
            <strong className="text-gray-200">sinal ou caução</strong> em agendamentos - e{" "}
            <strong className="text-gray-200">emissão automática de nota fiscal</strong> alinhada a cada atendimento. Sem data
            anunciada aqui; detalhes virão nas atualizações do produto.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-[#080c0a] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Como Funciona</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Em 3 passos simples, você começa a gerenciar seu negócio de forma profissional
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            {[
              {
                n: "1",
                title: "Teste grátis por 7 dias",
                desc: "Faça login com Google e configure seu negócio em minutos. Teste todas as funcionalidades sem cartão de crédito.",
                icon: "rocket_launch",
              },
              {
                n: "2",
                title: "Configure serviços e horários",
                desc: "Adicione seus serviços, defina horários de trabalho e personalize sua página pública.",
                icon: "tune",
              },
              {
                n: "3",
                title: "Compartilhe e receba agendamentos",
                desc: "Compartilhe seu link ou QR Code e comece a receber agendamentos dos seus clientes 24h por dia.",
                icon: "share",
              },
            ].map((step) => (
              <div key={step.n} className="text-center relative">
                <div className="size-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-primary">{step.n}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos - COM SELO GOOGLE */}
    <section className="py-16 sm:py-24 bg-[#020403] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            O Que Nossos Clientes Dizem
          </h2>
          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
            Avaliações reais de quem organizou a operação e aumentou os agendamentos
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            {
              name: "Fernanda Rocha",
              username: "@studio_rocha",
              role: "Salão de beleza",
              plan: "Plano Pro",
              city: "São Paulo, SP",
              info: "8 profissionais",
              rating: 5,
              text: "Em 3 dias já tinha minha agenda pública funcionando. Meus clientes agendam sozinhos, até de madrugada, e eu chego de manhã com a agenda cheia. Não troco por nada.",
            },
            {
              name: "Ricardo Alves",
              username: "@clinica_alves",
              role: "Clínica estética",
              plan: "Plano Premium",
              city: "Belo Horizonte, MG",
              info: "4 colaboradores",
              rating: 5,
              text: "O controle de comissões da equipe me salvou horas toda semana. Cada profissional vê o próprio painel, sem precisar me perguntar nada. Suporte em português, rápido e sem enrolação.",
            },
            {
              name: "Camila Torres",
              username: "@consultorio_torres",
              role: "Consultório odonto",
              plan: "Plano Pro",
              city: "Curitiba, PR",
              info: "240 clientes",
              rating: 5,
              text: "Coloquei o link na bio do Instagram e os agendamentos vieram sozinhos. A página pública ficou tão profissional que clientes novos perguntam se somos uma rede de clínicas. Recomendo muito.",
            },
          ].map((testimonial, i) => (
            <div
              key={i}
              className="bg-[#0f1c15] rounded-2xl p-6 border border-white/5 hover:border-primary/25 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-1 text-yellow-400">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400" />
                  ))}
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-950/40 rounded-full flex-shrink-0">
                  <svg className="w-3 h-3" viewBox="0 0 48 48" fill="none">
                    <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                    <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                    <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                    <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
                  </svg>
                  <span className="text-xs font-medium text-blue-400">Google</span>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-4 italic leading-relaxed">"{testimonial.text}"</p>

              <div className="border-t border-white/5 pt-4">
                <p className="text-sm font-bold text-white">{testimonial.name}</p>
                <p className="text-xs text-gray-500 mb-3">
                  {testimonial.username} • {testimonial.city}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-1 bg-white/5 rounded-full text-gray-400">{testimonial.plan}</span>
                  <span className="text-xs text-gray-600">•</span>
                  <span className="text-xs text-gray-500">{testimonial.info}</span>
                  <span className="text-xs text-gray-600">•</span>
                  <span className="text-xs text-gray-500">{testimonial.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">Avaliações verificadas de clientes reais no Google</p>
        </div>
      </div>
    </section>

      {/* Preço sob medida (CTA) */}
      <section className="py-24 bg-[#080c0a] border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            7 dias grátis, sem cartão
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Preço sob medida para o seu negócio
          </h2>
          <p className="text-gray-400 mb-8">
            No onboarding você escolhe testar grátis por 7 dias. Depois, o valor é definido conforme seu uso e aparece em <strong className="text-white">Conta</strong> para você assinar quando quiser.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(19,236,91,0.3)]"
          >
            Começar teste grátis
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-[#020403] border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Perguntas frequentes</h2>
            <p className="text-gray-400 max-w-lg mx-auto text-sm">
              Do teste grátis ao dia a dia no painel, comissões e o que está por vir no roadmap.
            </p>
          </div>

          <div className="space-y-2">
            {HOME_FAQS.map((faq, i) => (
              <div
                key={faq.q}
                className={cn(
                  "bg-[#0f1c15] rounded-xl border transition-all duration-200 overflow-hidden",
                  openFaq === i ? "border-primary/35 shadow-[0_0_0_1px_rgba(19,236,91,0.08)]" : "border-white/5 hover:border-white/10"
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-5 md:p-6 text-left flex items-center justify-between gap-4"
                >
                  <span className="font-semibold text-white text-sm md:text-[15px] leading-snug pr-2">{faq.q}</span>
                  <span
                    className={cn(
                      "material-symbols-outlined text-primary shrink-0 transition-transform duration-200",
                      openFaq === i ? "rotate-180" : ""
                    )}
                  >
                    expand_more
                  </span>
                </button>
                {openFaq === i ? (
                  <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0 -mt-1 border-t border-white/5">
                    <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-[#080c0a] border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Pronto para transformar<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">
              seu negócio?
            </span>
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Junte-se a mais de 2.000 profissionais que já usam o Agenndo.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-10 py-5 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all shadow-[0_0_30px_rgba(19,236,91,0.4)] text-lg"
          >
            Teste Grátis por 7 Dias
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-500 flex-wrap">
            {["7 dias grátis", "Sem cartão de crédito", "Suporte em português", "Cancele quando quiser"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#020403] border-t border-white/10 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
            <div className="col-span-2">
              <div className="mb-4">
                <span className="text-xl font-bold text-white">Agenndo</span>
              </div>
              <p className="text-gray-400 text-sm max-w-sm mb-6 leading-relaxed">
                Transformando a maneira como prestadores de serviços gerenciam seus negócios. Simples, rápido e eficiente.
              </p>
              <div className="flex gap-4 text-sm text-gray-500">
                <a href="#" className="hover:text-white transition-colors">Instagram</a>
                <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
                <a href="#" className="hover:text-white transition-colors">Twitter</a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm">Produto</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link href="/sobre" className="hover:text-primary transition-colors">Sobre nós</Link></li>
                <li>
                  <Link href="/agendamento-online" className="hover:text-primary transition-colors">
                    Software de agendamento
                  </Link>
                </li>
                <li><Link href="/termos" className="hover:text-primary transition-colors">Termos</Link></li>
                <li><Link href="/politicas" className="hover:text-primary transition-colors">Políticas</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm">Legal</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link href="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link></li>
                <li><Link href="/politicas" className="hover:text-primary transition-colors">Política de Privacidade</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600">
            <p>Serviço <strong className="text-gray-400">YWP</strong> · © 2024–2026 Agenndo. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <Link href="/termos" className="hover:text-gray-400">Termos</Link>
              <Link href="/politicas" className="hover:text-gray-400">Privacidade</Link>
            </div>
          </div>
        </div>
      </footer>

      <WhatsAppSupportWidget context="landing" />
    </>
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
