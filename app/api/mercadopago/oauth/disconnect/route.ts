import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearBusinessMpTokens } from "@/lib/mercadopago/business-mp";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: biz } = await supabase.from("businesses").select("id").eq("profile_id", user.id).maybeSingle();
  if (!biz?.id) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  try {
    const admin = createAdminClient();
    await clearBusinessMpTokens(admin, biz.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao desconectar" },
      { status: 500 }
    );
  }
}
