import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchOperacoesOverview } from "@/lib/operacoes/build-unified-list";
import { requirePlatformOperator } from "@/lib/operacoes/require-operator";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  if (!(await requirePlatformOperator(supabase))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const overview = await fetchOperacoesOverview(supabase);
  return NextResponse.json(overview);
}
