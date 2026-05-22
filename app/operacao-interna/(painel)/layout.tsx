import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformOperator } from "@/lib/platform-operator";

export default async function OperacaoInternaPainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/operacao-interna/entrar");
  }

  const allowed = await isPlatformOperator(supabase);
  if (!allowed) {
    redirect("/operacao-interna/entrar?error=sem_acesso");
  }

  return (
    <div className="min-h-screen bg-[#020403] text-white flex flex-col">
      <header className="border-b border-white/10 bg-[#080c0a]/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <span className="font-bold text-sm shrink-0">Operação</span>
            <nav className="flex items-center gap-1 text-sm text-gray-400 overflow-x-auto">
              <Link href="/operacao-interna" className="px-2 py-1 rounded-lg hover:text-white hover:bg-white/5">
                Resumo
              </Link>
              <Link
                href="/operacao-interna/negocios"
                className="px-2 py-1 rounded-lg hover:text-white hover:bg-white/5"
              >
                Negócios
              </Link>
              <Link
                href="/operacao-interna/utilizadores"
                className="px-2 py-1 rounded-lg hover:text-white hover:bg-white/5"
              >
                Utilizadores
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500">
            <span className="hidden sm:inline truncate max-w-[180px]">{user.email}</span>
            <form action="/operacao-interna/sair" method="post">
              <button type="submit" className="text-gray-500 hover:text-white">
                Sair
              </button>
            </form>
            <Link href="/dashboard" className="text-primary font-semibold hover:underline">
              App
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  );
}
