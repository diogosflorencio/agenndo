import { NextResponse } from "next/server";
import { verifyGatewayApiKey } from "@/lib/whatsapp/server-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!verifyGatewayApiKey(request)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    service: "agenndo-app",
    gatewayEndpoint: "/api/whatsapp/gateway/outbox",
    ts: new Date().toISOString(),
  });
}
