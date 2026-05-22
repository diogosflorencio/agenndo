import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizePlanId, type PlanId } from "@/lib/plans";
import { requirePlatformOperator } from "@/lib/operacoes/require-operator";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const supabase = await createClient();
  if (!(await requirePlatformOperator(supabase))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { businessId?: string; plan?: string; extendTrialDays?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const businessId = body.businessId?.trim();
  if (!businessId) {
    return NextResponse.json({ error: "businessId obrigatório" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.plan) {
    patch.plan = normalizePlanId(body.plan) as PlanId;
  }

  if (typeof body.extendTrialDays === "number" && body.extendTrialDays > 0) {
    const { data: cur } = await supabase.from("businesses").select("trial_ends_at").eq("id", businessId).maybeSingle();
    const base = cur?.trial_ends_at ? new Date(cur.trial_ends_at) : new Date();
    if (base.getTime() < Date.now()) base.setTime(Date.now());
    base.setDate(base.getDate() + body.extendTrialDays);
    patch.trial_ends_at = base.toISOString();
  }

  if (Object.keys(patch).length <= 1) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const { error } = await supabase.from("businesses").update(patch).eq("id", businessId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
