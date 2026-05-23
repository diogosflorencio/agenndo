import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchUnifiedRows } from "@/lib/operacoes/build-unified-list";
import { requirePlatformOperator } from "@/lib/operacoes/require-operator";
import { resolveOperacoesSiteBase } from "@/lib/site-url";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!(await requirePlatformOperator(supabase))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const siteBase = resolveOperacoesSiteBase(request);
  const rows = await fetchUnifiedRows(supabase, { siteBase });
  return NextResponse.json({ rows });
}
