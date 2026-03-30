import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Encerra impersonação no banco (bypass RLS). Requer SUPABASE_SERVICE_ROLE_KEY no servidor. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Servidor sem chave de serviço (SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 }
    );
  }

  const { error: delError } = await admin.from("session_impersonation").delete().eq("real_uid", user.id);
  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
