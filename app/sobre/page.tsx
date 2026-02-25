"use client";

import Link from "next/link";

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-[#020403]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

      <nav className="relative z-10 border-b border-white/5 bg-[#020403]/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-primary text-2xl">calendar_month</span>
            <span className="text-lg font-bold tracking-tight text-white">Agenndo</span>
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Voltar
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Sobre nós</h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-8">
          O <strong className="text-white">Agenndo</strong> nasceu da necessidade de oferecer uma solução simples e acessível de agendamento online para prestadores de serviços — barbearias, salões, clínicas, consultórios e muito mais.
        </p>
        <div className="space-y-6 text-gray-400 leading-relaxed">
          <p>
            Acreditamos que cada negócio merece ferramentas profissionais sem complicação. Por isso, desenvolvemos uma plataforma intuitiva: em poucos minutos você configura sua agenda, serviços e horários, e seus clientes passam a agendar 24 horas por dia, direto pelo celular.
          </p>
          <p>
            Oferecemos teste grátis de 7 dias, sem cartão de crédito. O preço do plano é definido conforme o uso do seu negócio e pode ser consultado e assinado na área de Conta após o período de teste.
          </p>
          <p>
            O Agenndo é um serviço <strong className="text-white">YWP</strong>. Estamos em constante evolução para atender melhor aos profissionais que confiam na nossa solução.
          </p>
        </div>
        <div className="mt-12 pt-8 border-t border-white/5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Voltar ao início
          </Link>
        </div>
      </main>
    </div>
  );
}
