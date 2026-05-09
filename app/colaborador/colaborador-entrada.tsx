"use client";

import Link from "next/link";

type Props = {
  siteOrigin: string;
  linkedStaff: boolean;
  isBusinessOwner: boolean;
};

const LOGIN_NEXT = "/dashboard/minhas-comissoes";

export function ColaboradorEntrada({ siteOrigin, linkedStaff, isBusinessOwner }: Props) {
  return (
    <div className="min-h-screen bg-[#020403] text-white flex flex-col">
      <header className="border-b border-white/5 bg-[#020403]/90 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold tracking-tight text-white hover:text-primary transition-colors">
            Agenndo
          </Link>
          {!isBusinessOwner ? (
            <Link
              href={`/login?next=${encodeURIComponent(LOGIN_NEXT)}`}
              className="text-sm font-semibold text-primary hover:text-primary/90"
            >
              Entrar
            </Link>
          ) : (
            <Link href="/dashboard" className="text-sm font-semibold text-gray-400 hover:text-white">
              Painel do negócio
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-5 py-10 md:py-14 w-full">
        <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-3">Área do profissional</p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
          Entrada para colaboradores
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-8">
          Use esta página se o dono do estabelecimento cadastrou você na equipe e vinculou{" "}
          <strong className="text-white">o mesmo e-mail</strong> que você vai usar para entrar no Agenndo com o Google.
        </p>

        {isBusinessOwner ? (
          <div className="rounded-2xl border border-amber-500/35 bg-amber-950/40 px-4 py-4 text-amber-100 text-sm mb-8 leading-relaxed">
            Você está logado como <strong className="text-white">dono do negócio</strong>. O painel do colaborador
            (comissões) é para profissionais da equipe. Use o{" "}
            <Link href="/dashboard" className="underline font-semibold hover:no-underline">
              painel principal
            </Link>
            .
          </div>
        ) : null}

        {linkedStaff && !isBusinessOwner ? (
          <div className="rounded-2xl border border-primary/35 bg-primary/10 px-4 py-4 text-sm mb-8 leading-relaxed">
            <p className="text-white font-semibold mb-2">Conta vinculada</p>
            <p className="text-gray-300 mb-4">
              Sua conta já está associada a um colaborador. Abra suas comissões no painel.
            </p>
            <Link
              href="/dashboard/minhas-comissoes"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Ir para Minhas comissões
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>
        ) : null}

        <section className="space-y-6 mb-10">
          <h2 className="text-lg font-bold text-white">Como funciona</h2>
          <ol className="space-y-4 text-gray-400 leading-relaxed list-decimal list-inside marker:text-primary marker:font-bold">
            <li>
              O empregador cadastra você em <strong className="text-gray-200">Equipe</strong> e informa no vínculo da
              conta o <strong className="text-white">seu e-mail</strong> (o mesmo que você usará no login).
            </li>
            <li>
              Você precisa de uma conta Google cujo <strong className="text-white">e-mail seja exatamente o mesmo</strong>{" "}
              que o empregador digitou ao vincular.
            </li>
            <li>
              Em seguida, use o botão abaixo <strong className="text-white">Entrar com Google</strong>. Depois do login,
              você cai em <strong className="text-white">Minhas comissões</strong> (e pode acessar{" "}
              <strong className="text-white">Conta</strong> no menu).
            </li>
          </ol>
        </section>

     

        {!isBusinessOwner ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/login?next=${encodeURIComponent(LOGIN_NEXT)}`}
              className="inline-flex justify-center items-center gap-2 px-6 py-4 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors shadow-[0_0_24px_rgba(19,236,91,0.25)]"
            >
              Entrar com Google
              <span className="material-symbols-outlined text-xl">login</span>
            </Link>
            <Link
              href="/"
              className="inline-flex justify-center items-center px-6 py-4 rounded-xl border border-white/15 text-white font-semibold text-sm hover:bg-white/5 transition-colors"
            >
              Voltar ao site
            </Link>
          </div>
        ) : null}

        <p className="mt-10 text-xs text-gray-600 leading-relaxed">
          Ainda não tem conta Google com esse e-mail? Crie uma no Google e depois peça ao empregador para vincular o
          mesmo endereço na edição do colaborador, ou desvincule e vincule de novo com o e-mail correto.
        </p>
      </main>
    </div>
  );
}
