import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformOperator } from "@/lib/platform-operator";
import { OperacoesSessionKeepAlive } from "@/components/operacoes/operacoes-session-keepalive";
import { OperacoesShell } from "@/components/operacoes/operacoes-shell";

export default async function OperacoesPainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/operacoes/entrar");

  if (!(await isPlatformOperator(supabase))) {
    redirect("/operacoes/entrar?error=sem_acesso");
  }

  return (
    <>
      <OperacoesSessionKeepAlive />
      <OperacoesShell userEmail={user.email ?? null}>{children}</OperacoesShell>
    </>
  );
}
