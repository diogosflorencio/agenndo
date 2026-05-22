import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function OperacaoNegociosPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("businesses")
    .select("id, name, slug, plan, subscription_status, trial_ends_at, created_at, profile_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return <p className="text-red-400 text-sm">Erro ao carregar: {error.message}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Negócios</h1>
        <p className="text-sm text-gray-400 mt-1">Edite plano, trial e estado de assinatura.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#14221A] text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Stripe</th>
              <th className="px-4 py-3">Trial até</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(rows ?? []).map((b) => (
              <tr key={b.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{b.slug}</td>
                <td className="px-4 py-3">{b.plan}</td>
                <td className="px-4 py-3 text-gray-400">{b.subscription_status ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {b.trial_ends_at ? new Date(b.trial_ends_at).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/operacao-interna/negocios/${b.id}`} className="text-primary font-semibold text-xs">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
