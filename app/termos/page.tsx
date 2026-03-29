"use client";

import Link from "next/link";

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[#020403]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

      <nav className="relative z-10 border-b border-white/5 bg-[#020403]/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="text-lg font-bold tracking-tight text-white">Agenndo</span>
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Voltar
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Termos de Uso</h1>
        <p className="text-gray-500 text-sm mb-10">Última atualização: março de 2026</p>

        <div className="space-y-8 text-gray-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Aceitação dos termos</h2>
            <p>
              Ao acessar ou usar o Agenndo, você concorda com estes Termos de Uso. Se não concordar, não utilize o serviço.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Descrição do serviço</h2>
            <p>
              O Agenndo é uma plataforma de agendamento online que permite a prestadores de serviços gerenciar agenda, clientes e receita. O uso está sujeito ao valor e ciclo de cobrança definidos na área de Conta e às políticas descritas nesta página.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Conta e responsabilidade</h2>
            <p>
              Você é responsável por manter a confidencialidade da sua conta e por todas as atividades realizadas nela. O Agenndo não se responsabiliza por perdas decorrentes de uso indevido das credenciais.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Uso aceitável</h2>
            <p>
              É proibido usar o serviço para fins ilegais, abusivos ou que prejudiquem outros usuários ou a infraestrutura do Agenndo. Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Preços, informações e continuidade</h2>
            <p className="mb-3">
              Os valores de assinatura são os indicados no cadastro ou na área de Conta no momento da contratação. O serviço pode
              ser ofertado em mais de um valor comercial; a documentação voltada ao usuário utiliza a denominação genérica{" "}
              <strong className="text-gray-300">Plano</strong> quando aplicável.
            </p>
            <p className="mb-3">
              Você declara que as informações fornecidas sobre seu negócio são verdadeiras. Dados falsos, omissões relevantes ou
              uso do serviço incompatível com o declarado podem ensejar{" "}
              <strong className="text-gray-300">suspensão, encerramento da conta ou alteração das condições comerciais</strong>, a
              critério do Agenndo, sem prejuízo de medidas legais cabíveis.
            </p>
            <p>
              O Agenndo pode <strong className="text-gray-300">revisar preços ou condições para contas específicas</strong> quando
              necessário à continuidade da operação. Quando possível, alterações relevantes serão comunicadas pelo painel ou
              e-mail cadastrado.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Cancelamento</h2>
            <p>
              Você pode cancelar sua assinatura a qualquer momento pela área de Conta. O cancelamento não gera reembolso de valores já pagos, e o acesso permanece até o fim do período pago.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Alterações</h2>
            <p>
              Podemos alterar estes Termos de Uso. Alterações relevantes serão comunicadas por e-mail ou no painel. O uso continuado do serviço após as alterações constitui aceitação.
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
