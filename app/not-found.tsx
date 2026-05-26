import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#020403] flex flex-col items-center justify-center px-6 text-center">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-primary/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-md">
        <p className="text-8xl font-extrabold text-primary mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-3">
          Página não encontrada
        </h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          O endereço que você acessou não existe ou foi movido. Confira o link e
          tente novamente.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex justify-center items-center px-6 py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            Ir para o início
          </Link>
          <Link
            href="/agendamento-online"
            className="inline-flex justify-center items-center px-6 py-3 rounded-xl border border-white/15 text-white font-semibold text-sm hover:bg-white/5 transition-colors"
          >
            Conhecer o Agenndo
          </Link>
        </div>
      </div>
    </div>
  );
}
