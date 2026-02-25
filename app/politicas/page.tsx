"use client";

import Link from "next/link";

export default function PoliticasPage() {
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
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Política de Privacidade</h1>
        <p className="text-gray-500 text-sm mb-10">Última atualização: 2024</p>

        <div className="space-y-8 text-gray-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Dados que coletamos</h2>
            <p>
              Coletamos dados necessários para o funcionamento do serviço: dados de cadastro (nome, e-mail, telefone), dados do negócio (nome, endereço, horários, serviços) e dados de agendamentos. Para clientes que agendam pela página pública, podemos armazenar nome e contato quando vinculados a uma conta.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Uso dos dados</h2>
            <p>
              Os dados são usados para fornecer e melhorar o Agenndo, processar pagamentos, enviar lembretes e comunicações relacionadas ao serviço. Não vendemos seus dados a terceiros.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Compartilhamento</h2>
            <p>
              Podemos compartilhar dados com provedores de infraestrutura (hosting, e-mail, pagamento) sob obrigação de confidencialidade. Dados de agendamentos são visíveis apenas ao prestador e, quando aplicável, ao cliente vinculado.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, alteração ou divulgação.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Seus direitos</h2>
            <p>
              Você pode acessar, corrigir ou solicitar a exclusão dos seus dados pela área de Conta ou entrando em contato conosco. Em determinadas situações, a exclusão pode implicar encerramento do uso do serviço.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Contato</h2>
            <p>
              Dúvidas sobre esta política podem ser enviadas pelo canal de suporte disponível no painel ou no site.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <Link href="/" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Voltar ao início
          </Link>
        </div>
      </main>
    </div>
  );
}
