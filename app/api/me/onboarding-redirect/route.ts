import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveUserId } from "@/lib/supabase/effective-user";

/**
 * Checagem server-side para /setup: dono de negócio ou colaborador já vinculado
 * redireciona para o painel (evita depender só do cliente Supabase / RLS).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ redirect: null as string | null });
  }

  const profileId = (await getEffectiveUserId(supabase)) ?? user.id;

  const { data: ownedBiz } = await supabase
    .from("businesses")
    .select("id")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle();

  if (ownedBiz?.id) {
    return NextResponse.json({ redirect: "/dashboard" as const });
  }

  const { data: staffRows } = await supabase
    .from("collaborators")
    .select("id")
    .eq("auth_user_id", user.id)
    .limit(1);

  if ((staffRows?.length ?? 0) > 0) {
    return NextResponse.json({ redirect: "/dashboard/minhas-comissoes" as const });
  }

  return NextResponse.json({ redirect: null });
}
