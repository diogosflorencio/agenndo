import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyGatewayApiKey } from "@/lib/whatsapp/server-auth";
import { claimPendingOutboxBatch, markOutboxFailed, markOutboxSent } from "@/lib/whatsapp/outbox";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!verifyGatewayApiKey(request)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20));
  const businessId = url.searchParams.get("businessId");

  const admin = createAdminClient();
  let batch = await claimPendingOutboxBatch(admin, limit);

  if (businessId) {
    batch = batch.filter((row) => row.business_id === businessId);
  }

  return NextResponse.json({ items: batch });
}

export async function POST(request: Request) {
  if (!verifyGatewayApiKey(request)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  let body: {
    outboxId?: string;
    status?: "sent" | "failed";
    providerMessageId?: string;
    error?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  if (!body.outboxId) {
    return NextResponse.json({ error: "outboxId obrigatorio" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (body.status === "sent") {
    await markOutboxSent(admin, body.outboxId, body.providerMessageId);
    return NextResponse.json({ ok: true });
  }

  await markOutboxFailed(admin, body.outboxId, body.error ?? "Falha no gateway");
  return NextResponse.json({ ok: true });
}
