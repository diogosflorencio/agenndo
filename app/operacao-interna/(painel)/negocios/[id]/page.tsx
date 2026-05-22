import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PAID_PLAN_IDS, type PlanId } from "@/lib/plans";
import { EditarNegocioForm } from "./editar-negocio-form";

const PLAN_OPTIONS: PlanId[] = ["free", "plan_enterprise", ...PAID_PLAN_IDS];

export default async function OperacaoNegocioEditPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: biz, error } = await supabase.from("businesses").select("*").eq("id", params.id).maybeSingle();

  if (error || !biz) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", biz.profile_id)
    .maybeSingle();

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <Link href="/operacao-interna/negocios" className="text-xs text-gray-500 hover:text-white">
          ← Negócios
        </Link>
        <h1 className="text-2xl font-bold mt-2">{biz.name}</h1>
        <p className="text-sm text-gray-400 font-mono">{biz.slug}</p>
        {profile ? (
          <p className="text-xs text-gray-500 mt-1">
            Dono: {profile.full_name ?? "—"} · {profile.email ?? "—"}
          </p>
        ) : null}
      </div>

      <EditarNegocioForm
        businessId={biz.id}
        initial={{
          plan: biz.plan as PlanId,
          subscription_status: biz.subscription_status,
          trial_ends_at: biz.trial_ends_at,
          billing_issue_deadline: biz.billing_issue_deadline,
        }}
        planOptions={PLAN_OPTIONS}
      />
    </div>
  );
}
