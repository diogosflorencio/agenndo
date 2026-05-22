import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformOperator } from "@/lib/operacoes/require-operator";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!(await requirePlatformOperator(supabase))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { kind?: string; clientId?: string; businessId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (body.kind === "cliente" && body.clientId) {
    const { error } = await supabase.from("clients").delete().eq("id", body.clientId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "prestador" && body.businessId) {
    const { error } = await supabase.from("businesses").delete().eq("id", body.businessId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "prestador" && !body.businessId) {
    return NextResponse.json(
      { error: "Prestador sem negócio: remova manualmente no Auth se necessário." },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
}
