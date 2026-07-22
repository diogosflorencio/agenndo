import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveDashboardBusinessId } from "@/lib/whatsapp/server-auth";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider-factory";
import { getWhatsAppUiMode, isWhatsAppDevMockEnabled } from "@/lib/whatsapp/config";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const r = await resolveDashboardBusinessId(supabase);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status! });

  const provider = getWhatsAppProvider();
  const live = await provider.getSession(r.businessId!);
  const { data: row } = await supabase
    .from("whatsapp_sessions")
    .select("*")
    .eq("business_id", r.businessId!)
    .maybeSingle();

  return NextResponse.json({
    uiMode: getWhatsAppUiMode(),
    session: row,
    liveSession: live,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const r = await resolveDashboardBusinessId(supabase);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status! });

  const uiMode = getWhatsAppUiMode();
  if (uiMode === "coming_soon") {
    return NextResponse.json({ error: "Integracao disponivel em breve" }, { status: 503 });
  }

  let action: "connect" | "disconnect" = "connect";
  try {
    const body = (await request.json()) as { action?: string };
    if (body.action === "disconnect") action = "disconnect";
  } catch {
    /* default connect */
  }

  const provider = getWhatsAppProvider();
  const bid = r.businessId!;

  const { data: current } = await supabase
    .from("whatsapp_sessions")
    .select("session_version")
    .eq("business_id", bid)
    .maybeSingle();
  const nextVersion = (current?.session_version ?? 0) + 1;

  if (action === "disconnect") {
    const result = await provider.disconnect(bid);
    if (!result.ok && !isWhatsAppDevMockEnabled()) {
      return NextResponse.json({ error: result.error ?? "Falha" }, { status: 400 });
    }
    await supabase.from("whatsapp_sessions").upsert(
      {
        business_id: bid,
        status: "disconnected",
        phone_e164: null,
        last_connected_at: null,
        last_error: null,
        session_version: nextVersion,
      },
      { onConflict: "business_id" }
    );
    return NextResponse.json({ ok: true, status: "disconnected" });
  }

  const result = await provider.connect(bid);
  if (!result.ok && !isWhatsAppDevMockEnabled()) {
    return NextResponse.json({ error: result.error ?? "Falha ao conectar" }, { status: 400 });
  }

  await supabase.from("whatsapp_sessions").upsert(
    {
      business_id: bid,
      status: result.status,
      phone_e164: result.phoneE164 ?? null,
      last_connected_at: result.status === "connected" ? new Date().toISOString() : null,
      last_error: result.error ?? null,
      session_version: nextVersion,
    },
    { onConflict: "business_id" }
  );

  return NextResponse.json({
    ok: result.ok,
    status: result.status,
    phoneE164: result.phoneE164 ?? null,
    qrDataUrl: result.qrDataUrl ?? null,
    mock: isWhatsAppDevMockEnabled(),
  });
}
