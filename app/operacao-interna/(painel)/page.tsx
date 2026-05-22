import { createClient } from "@/lib/supabase/server";

export default async function OperacaoInternaResumoPage() {
  const supabase = await createClient();

  const [biz, profiles, apts, clients] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id", { count: "exact", head: true }),
    supabase.from("clients").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Negócios", value: biz.count ?? 0 },
    { label: "Perfis", value: profiles.count ?? 0 },
    { label: "Agendamentos", value: apts.count ?? 0 },
    { label: "Clientes (registos)", value: clients.count ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Resumo da plataforma</h1>
        <p className="text-sm text-gray-400 mt-1">
          Dados em tempo real via sessão de operador (RLS <code className="text-primary/80">is_platform_operator</code>).
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-[#0d2316] p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-3xl font-extrabold text-primary mt-2 tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-200/90">
        <p className="font-semibold text-amber-100">Segurança</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
          Novos operadores só entram com INSERT manual em <code>platform_operators</code> (ver{" "}
          <code>supabase/scripts/grant-platform-operator.sql</code>). O app cliente não pode adicionar operadores.
        </p>
      </div>
    </div>
  );
}
