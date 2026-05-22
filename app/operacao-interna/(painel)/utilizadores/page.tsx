import { createClient } from "@/lib/supabase/server";

export default async function OperacaoUtilizadoresPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, account_kind, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: operators } = await supabase
    .from("platform_operators")
    .select("user_id, note, created_at");

  if (error) {
    return <p className="text-red-400 text-sm">Erro: {error.message}</p>;
  }

  const opSet = new Set((operators ?? []).map((o) => o.user_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Utilizadores</h1>
        <p className="text-sm text-gray-400 mt-1">
          Operadores ativos: {(operators ?? []).length} · lista limitada a 200 perfis recentes
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#14221A] text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Operador</th>
              <th className="px-4 py-3">Criado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(rows ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3">{p.full_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400">{p.email ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.account_kind ?? p.role}</td>
                <td className="px-4 py-3">{opSet.has(p.id) ? "sim" : "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(p.created_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
