"use client";

import Link from "next/link";
import { useState } from "react";

const FEATURES = [
  {
    icon: "calendar_month",
    title: "Agenda Inteligente",
    desc: "Evite conflitos de horário e reduza faltas com lembretes automáticos via notificações para seus clientes.",
  },
  {
    icon: "attach_money",
    title: "Controle Financeiro",
    desc: "Acompanhe entradas, saídas e comissões em tempo real. Saiba exatamente quanto seu negócio está lucrando.",
  },
  {
    icon: "groups",
    title: "Gestão de Equipe",
    desc: "Gerencie escalas, permissões e desempenho individual de cada profissional da sua equipe.",
  },
  {
    icon: "notifications_active",
    title: "Lembretes Automáticos",
    desc: "WhatsApp e e-mail automáticos para confirmar presença e reduzir faltas. Menos ausências, mais receita.",
  },
  {
    icon: "qr_code_2",
    title: "QR Code & Link Único",
    desc: "Compartilhe seu link ou imprima o QR Code para recepção. Clientes agendam direto pelo celular.",
  },
  {
    icon: "analytics",
    title: "Analytics Completo",
    desc: "Heatmaps de horários, taxa de comparecimento, receita por serviço. Tome decisões baseadas em dados.",
  },
];

const FAQS = [
  {
    q: "Preciso saber programar?",
    a: "Não! O Agenndo foi desenvolvido para ser extremamente simples. Você não precisa de conhecimento técnico algum. Tudo é intuitivo e guiado.",
  },
  {
    q: "Como funciona o período de teste?",
    a: "Você tem 7 dias para testar todas as funcionalidades gratuitamente, sem precisar inserir cartão de crédito. Após o período, escolha o plano ideal para seu negócio.",
  },
  {
    q: "Posso personalizar minha página?",
    a: "Sim! Você pode personalizar logo, cores, banner, galeria de fotos, redes sociais e muito mais. Cada prestador tem sua própria URL única.",
  },
  {
    q: "Funciona no celular?",
    a: "Perfeitamente! O Agenndo é mobile-first. Funciona em qualquer dispositivo e pode ser instalado como app (PWA) direto pelo navegador.",
  },
  {
    q: "Quais tipos de negócio podem usar?",
    a: "Barbearias, salões de beleza, clínicas de estética, consultórios, estúdios de tatuagem, personal trainers, fotógrafos, pet shops e muito mais — qualquer serviço com hora marcada.",
  },
  {
    q: "Como cancelar minha assinatura?",
    a: "Cancele a qualquer momento diretamente no painel, sem burocracia. Sem multas ou fidelidade.",
  },
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#020403]/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">calendar_month</span>
            <span className="text-xl font-bold tracking-tight">Agenndo</span>
          </div>
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
              Agenndo — A solução definitiva de agendamento
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              A agenda que seu negócio{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">
                merecia ter
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Para <strong className="text-white">barbearias, salões, clínicas, estúdios de tatuagem</strong> e muito mais. Seus clientes agendam 24h por dia, você foca no que sabe fazer.
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
                href="/barbearia-elite"
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
              className="absolute top-16 -right-12 bg-[#14221A] p-4 rounded-xl border border-primary/30 shadow-xl z-20 animate-bounce hidden xl:block"
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
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Tudo que você precisa,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">
                em um só lugar
              </span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Uma suíte completa de ferramentas para modernizar sua gestão e fidelizar seus clientes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.icon}
                className="bg-[#0f1c15] p-8 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-3xl">{f.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
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

      {/* Testimonial */}
      <section className="py-24 bg-[#020403] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="bg-[#0f1c15] p-8 rounded-2xl border border-white/5 relative z-10">
                <div className="flex gap-1 text-yellow-500 mb-5">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-lg filled">star</span>
                  ))}
                </div>
                <p className="text-gray-300 text-lg italic leading-relaxed mb-6">
                  &quot;Mudou completamente a percepção de valor dos meus clientes. O Agenndo não é só uma agenda, é uma ferramenta de posicionamento de marca. Em 2 semanas já recuperei o investimento.&quot;
                </p>
                <div className="flex items-center gap-4 border-t border-white/5 pt-5">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/30 to-slate-700 border border-white/10 flex items-center justify-center font-bold text-primary">
                    PB
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Pedro Barber</p>
                    <p className="text-xs text-gray-500">Fundador, Barbearia Vintage</p>
                  </div>
                </div>
              </div>
              <div className="absolute top-4 left-4 right-4 bottom-[-8px] bg-slate-800/30 rounded-2xl -z-0" />
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white">
                Por que profissionais escolhem o{" "}
                <span className="text-primary">Agenndo</span>
              </h2>
              <div className="space-y-4">
                {[
                  { icon: "timer", text: "Configure em menos de 10 minutos" },
                  { icon: "trending_down", text: "Reduza faltas em até 60% com lembretes automáticos" },
                  { icon: "thumb_up", text: "Interface simples, sem curva de aprendizado" },
                  { icon: "support_agent", text: "Suporte em português, rápido e humano" },
                ].map((item) => (
                  <div key={item.icon} className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary text-lg">{item.icon}</span>
                    </div>
                    <span className="text-gray-300 text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Integrations */}
          <div className="mt-20 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">
              Integrações Nativas
            </p>
            <div className="flex justify-center items-center gap-10 flex-wrap">
              {["Stripe", "Google Calendar", "WhatsApp"].map((name) => (
                <span key={name} className="text-base font-bold text-gray-300 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Preço sob medida — CTA */}
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
            <h2 className="text-3xl font-bold text-white mb-4">Perguntas Frequentes</h2>
            <p className="text-gray-400">Tire suas dúvidas sobre o Agenndo</p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`bg-[#0f1c15] rounded-xl border transition-all duration-200 overflow-hidden ${
                  openFaq === i ? "border-primary/30" : "border-white/5"
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4"
                >
                  <span className="font-bold text-white text-sm md:text-base">{faq.q}</span>
                  <span
                    className={`material-symbols-outlined text-primary flex-shrink-0 transition-transform ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
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
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-2xl">calendar_month</span>
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
    </>
  );
}

function PhoneMockup({ large = false }: { large?: boolean }) {
  const w = large ? "w-[320px]" : "w-[280px]";
  const h = large ? "h-[660px]" : "h-[580px]";

  return (
    <div className={`relative ${w} ${h} bg-black rounded-[40px] border-[8px] border-gray-800 shadow-2xl overflow-hidden mx-auto transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500 flex flex-col`}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-b-2xl z-50" />
      <div className="w-full h-full bg-[#0B120E] text-white flex flex-col relative">
        {/* Header */}
        <header className="flex-shrink-0 pt-10 pb-4 px-5 bg-[#0B120E]/90 backdrop-blur-md border-b border-white/5">
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
            <button className="size-9 rounded-full bg-[#14221A] border border-[#213428] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">notifications</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <section className="px-4 py-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {[
                { icon: "calendar_today", label: "Agend.", value: "12", trend: "+15%", trendColor: "text-primary" },
                { icon: "cancel", label: "Canc.", value: "2", trend: "-5%", trendColor: "text-red-500" },
                { icon: "person_off", label: "Faltas", value: "1", trend: "--", trendColor: "text-gray-500" },
              ].map((stat) => (
                <div key={stat.label} className="flex-shrink-0 w-28 bg-[#14221A] border border-[#213428] rounded-xl p-2.5 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <span className="material-symbols-outlined text-[16px]">{stat.icon}</span>
                    <span className="text-[10px] font-medium">{stat.label}</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-xl font-bold text-white leading-none">{stat.value}</span>
                    <span className={`text-[9px] font-bold mb-0.5 ${stat.trendColor}`}>{stat.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <main className="px-4 space-y-3 pb-4">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-white text-sm font-bold">Próximos</h3>
              <span className="text-[9px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                Hoje, 24 Mai
              </span>
            </div>

            <div className="bg-[#14221A] border border-[#213428] rounded-xl overflow-hidden shadow-lg">
              <div className="p-3 flex gap-3">
                <div className="size-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 shrink-0" />
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-white text-sm">João Silva</h4>
                    <span className="text-primary font-bold text-xs">14:00</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">Corte + Barba</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <div className="size-3.5 rounded-full bg-gray-700 flex items-center justify-center text-[9px] text-white">L</div>
                    <span className="text-[9px] text-gray-500">Lucas</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-[#213428] border-t border-[#213428]">
                <button className="bg-[#14221A] text-[10px] font-semibold text-gray-300 py-2.5">Faltou</button>
                <button className="bg-primary/20 text-[10px] font-bold text-primary py-2.5">Compareceu</button>
              </div>
            </div>

            <div className="bg-[#14221A] border border-[#213428] rounded-xl p-3 flex gap-3 opacity-60">
              <div className="size-12 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 shrink-0" />
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between">
                  <h4 className="font-bold text-white text-sm">Pedro Costa</h4>
                  <span className="text-primary font-bold text-xs">15:30</span>
                </div>
                <p className="text-gray-400 text-xs mt-0.5">Corte Masculino</p>
              </div>
            </div>
          </main>
        </div>

        {/* Bottom nav */}
        <nav className="flex-shrink-0 w-full bg-[#0B120E]/95 backdrop-blur-md border-t border-[#213428] pt-2.5 pb-5 px-2 flex justify-between items-center z-40">
          {[
            { icon: "grid_view", label: "Início", active: true },
            { icon: "calendar_month", label: "Agenda", active: false },
            { icon: "content_cut", label: "Serviços", active: false },
            { icon: "groups", label: "Equipe", active: false },
            { icon: "person", label: "Conta", active: false },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
              <span className={`material-symbols-outlined text-[20px] ${item.active ? "text-primary" : "text-gray-500"}`}>
                {item.icon}
              </span>
              <span className={`text-[8px] font-${item.active ? "bold" : "medium"} ${item.active ? "text-primary" : "text-gray-500"} truncate w-full text-center`}>
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
