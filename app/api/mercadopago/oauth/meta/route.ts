import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMercadoPagoConfig } from "@/lib/mercadopago/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const cfg = getMercadoPagoConfig();
  if (!cfg) {
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({
    configured: true,
    redirect_uri: cfg.redirectUri,
    redirect_uri_insecure: cfg.redirectUri.startsWith("http://"),
    https_required: true,
  });
}
