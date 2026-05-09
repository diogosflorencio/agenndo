import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId } from "@/lib/supabase/effective-user";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const effectiveId = await getEffectiveUserId(supabase);
  if (!effectiveId) {
    return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
  }

  let body: { collaboratorId?: string; email?: string };
  try {
    body = (await req.json()) as { collaboratorId?: string; email?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const collaboratorId = typeof body.collaboratorId === "string" ? body.collaboratorId.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!collaboratorId || !email) {
    return NextResponse.json({ error: "Informe colaborador e e-mail." }, { status: 400 });
  }

  const { data: biz } = await supabase.from("businesses").select("id").eq("profile_id", effectiveId).maybeSingle();
  if (!biz?.id) {
    return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });
  }

  const { data: collab, error: cErr } = await supabase
    .from("collaborators")
    .select("id, business_id")
    .eq("id", collaboratorId)
    .eq("business_id", biz.id)
    .maybeSingle();

  if (cErr || !collab) {
    return NextResponse.json({ error: "Colaborador não encontrado neste negócio." }, { status: 404 });
  }

  const admin = createAdminClient();
  let targetUserId: string | null = null;

  try {
    const listRes = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = listRes.data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    targetUserId = found?.id ?? null;
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar usuários." }, { status: 500 });
  }

  if (!targetUserId) {
    return NextResponse.json(
      { error: "Nenhuma conta Agenndo encontrada com este e-mail. O profissional precisa criar conta antes (ex.: entrar em /colaborador e usar Google com esse e-mail)." },
      { status: 404 }
    );
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Use outro e-mail — não vincule o colaborador à sua própria conta de dono." }, { status: 400 });
  }

  const { error: upErr } = await supabase
    .from("collaborators")
    .update({ auth_user_id: targetUserId })
    .eq("id", collaboratorId)
    .eq("business_id", biz.id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, authUserId: targetUserId });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const effectiveId = await getEffectiveUserId(supabase);
  if (!effectiveId) {
    return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
  }

  const url = new URL(req.url);
  const collaboratorId = url.searchParams.get("collaboratorId")?.trim() ?? "";
  if (!collaboratorId) {
    return NextResponse.json({ error: "collaboratorId obrigatório" }, { status: 400 });
  }

  const { data: biz } = await supabase.from("businesses").select("id").eq("profile_id", effectiveId).maybeSingle();
  if (!biz?.id) {
    return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });
  }

  const { error } = await supabase
    .from("collaborators")
    .update({ auth_user_id: null })
    .eq("id", collaboratorId)
    .eq("business_id", biz.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
