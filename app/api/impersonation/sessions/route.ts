import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ImpersonationSessionRow = {
  id: string;
  real_uid: string;
  target_uid: string;
  expires_at: string;
  created_at: string;
  perspective: "supporter" | "target";
  other_user_id: string;
  other_email: string | null;
  other_name: string | null;
};

/**
 * Lista sessões de acesso compartilhado onde o utilizador é real_uid (está a ver outra conta)
 * ou target_uid (alguém está a ver a conta dele). Enriquece com email/nome em profiles (service role).
 */
export async function GET() {
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
    return NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY.", sessions: [] }, { status: 503 });
  }

  const { data: rows, error: qErr } = await admin
    .from("session_impersonation")
    .select("real_uid, target_uid, expires_at, created_at")
    .or(`real_uid.eq.${user.id},target_uid.eq.${user.id}`)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  const list = rows ?? [];
  const idSet = new Set<string>();
  for (const r of list) {
    idSet.add(r.real_uid);
    idSet.add(r.target_uid);
  }
  const ids = Array.from(idSet);
  const profileMap = new Map<string, { email: string | null; full_name: string | null }>();
  if (ids.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, email, full_name").in("id", ids);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { email: p.email ?? null, full_name: p.full_name ?? null });
    }
  }

  const sessions: ImpersonationSessionRow[] = list.map((r) => {
    const asSupporter = r.real_uid === user.id;
    const otherId = asSupporter ? r.target_uid : r.real_uid;
    const prof = profileMap.get(otherId);
    return {
      id: `${r.real_uid}:${r.target_uid}`,
      real_uid: r.real_uid,
      target_uid: r.target_uid,
      expires_at: r.expires_at,
      created_at: r.created_at,
      perspective: asSupporter ? "supporter" : "target",
      other_user_id: otherId,
      other_email: prof?.email ?? null,
      other_name: prof?.full_name ?? null,
    };
  });

  return NextResponse.json({ sessions });
}
