"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import { Scissors } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(decodeURIComponent(err));
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo = `${origin}/auth/callback?next=/dashboard`;

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    // Redirecionamento é feito pelo Supabase
  };

  return (
    <div className="min-h-screen bg-[#102216] text-white flex flex-col lg:flex-row">
      {/* Aside — desktop: lateral esquerda; mobile: oculto */}
      <aside className="hidden lg:flex lg:w-[42%] xl:w-[45%] lg:min-h-screen flex-col relative overflow-hidden bg-gradient-to-br from-[#0d2818] via-[#102216] to-[#0a1f12]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_20%,rgba(19,236,91,0.12),transparent)]" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#13ec5b]/10 blur-[80px]" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-emerald-500/10 blur-[60px]" />
        <div className="absolute top-[15%] right-[20%] w-20 h-20 border border-white/10 rounded-2xl rotate-12" />
        <div className="absolute top-[45%] left-[15%] w-3 h-3 rounded-full bg-white/20" />
        <div className="absolute bottom-[25%] left-[20%] w-24 h-24 border border-white/5 rounded-3xl -rotate-6" />
        <div className="relative z-10 flex flex-col flex-1 justify-center px-12 xl:px-16 py-16">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="h-9 w-9 rounded-lg bg-[#13ec5b]/20 border border-[#13ec5b]/30 flex items-center justify-center">
              <Scissors size={18} className="text-[#13ec5b]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Agenndo</span>
          </div>
          <h2 className="text-2xl xl:text-3xl font-extrabold leading-tight tracking-tight text-white max-w-sm mb-4">
            Acesso para prestadores
          </h2>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            Entre com sua conta para gerenciar sua agenda, serviços, equipe e clientes. Se você é <strong className="text-white/80">cliente</strong> de um negócio e quer ver seus agendamentos, use o link &quot;Entrar&quot; na página de agendamento do estabelecimento.
          </p>
        </div>
      </aside>

      {/* Coluna do formulário */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 lg:flex lg:items-center lg:justify-center lg:py-8 bg-[#020403]">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 blur-[140px] rounded-full pointer-events-none lg:left-[58%]" />

        <header className="relative z-10 py-5 px-6 border-b border-white/5 lg:border-0 lg:absolute lg:top-0 lg:left-0 lg:right-0">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-primary text-2xl">calendar_month</span>
              <span className="text-lg font-bold text-white">Agenndo</span>
            </Link>
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Voltar
            </Link>
          </div>
        </header>

        <main className="relative z-10 w-full max-w-sm mx-auto px-6 flex-1 flex flex-col justify-center py-12">
          <div className="bg-[#0f1c15] rounded-2xl border border-white/5 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">calendar_month</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Bem-vindo de volta</h1>
              <p className="text-gray-400 text-sm">
                Entre para gerenciar seus agendamentos
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white hover:bg-gray-100 disabled:bg-gray-200 text-gray-900 font-bold rounded-xl transition-all duration-200 mb-4 shadow-lg"
            >
              {loading ? (
                <div className="size-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              <span>{loading ? "Redirecionando..." : "Continuar com Google"}</span>
            </button>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Ao entrar, você concorda com nossos{" "}
                <Link href="/termos" className="text-primary hover:underline">Termos de Uso</Link> e{" "}
                <Link href="/politicas" className="text-primary hover:underline">Política de Privacidade</Link>.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-base">rocket_launch</span>
              <span className="text-sm font-bold text-primary">7 dias grátis, sem cartão</span>
            </div>
            <p className="text-xs text-gray-400">
              Novos usuários têm acesso completo por 7 dias. O preço do plano aparece em Conta após o teste.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020403] flex items-center justify-center">
        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
