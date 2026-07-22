import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDashboardBusinessId } from "@/lib/whatsapp/server-auth";
import { isWhatsAppDevMockEnabled, getWhatsAppUiMode } from "@/lib/whatsapp/config";
import { buildSampleTemplateContext, renderWhatsAppTemplate } from "@/lib/whatsapp/variables";
import { resolveOperacoesSiteBase } from "@/lib/site-url";
import { enqueueWhatsAppMessage } from "@/lib/whatsapp/outbox";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider-factory";
import { getMockWhatsAppSentLog } from "@/lib/whatsapp/providers/mock-provider";
import { isWhatsAppEventKey } from "@/lib/whatsapp/events";
import type { WhatsAppRecipientRole } from "@/lib/whatsapp/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const r = await resolveDashboardBusinessId(supabase);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status! });

  if (getWhatsAppUiMode() === "coming_soon") {
    return NextResponse.json({ error: "Simulacao indisponivel em producao ate a VPS" }, { status: 503 });
  }

  let body: {
    eventKey?: string;
    recipientRole?: WhatsAppRecipientRole;
    templateBody?: string;
    phone?: string;
    processNow?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const eventKey = body.eventKey ?? "booking_confirmed";
  if (!isWhatsAppEventKey(eventKey)) {
    return NextResponse.json({ error: "eventKey invalido" }, { status: 400 });
  }

  const recipientRole = body.recipientRole ?? "client";

  const { data: businessRow } = await supabase
    .from("businesses")
    .select("slug, name, phone, city")
    .eq("id", r.businessId!)
    .maybeSingle();

  const context = buildSampleTemplateContext({
    business: businessRow,
    siteBase: resolveOperacoesSiteBase(request),
  });
  const templateBody =
    body.templateBody ??
    "Ola {nome}! Seu agendamento foi confirmado.\nData: {data} as {hora}\nServico: {servico} com {profissional}";
  const finalBody = renderWhatsAppTemplate(templateBody, context);
  const phone = (body.phone ?? context.telefone_cliente ?? "5511988887777").replace(/\D/g, "");

  const admin = createAdminClient();
  const { id, error } = await enqueueWhatsAppMessage(admin, {
    businessId: r.businessId!,
    eventKey,
    recipientRole,
    recipientPhone: phone,
    recipientName: context.nome,
    body: finalBody,
    metadata: { simulated: true },
  });

  if (error) return NextResponse.json({ error }, { status: 500 });

  let sendResult = null;
  if (body.processNow && isWhatsAppDevMockEnabled()) {
    const provider = getWhatsAppProvider();
    sendResult = await provider.sendMessage({
      businessId: r.businessId!,
      toPhone: phone,
      body: finalBody,
      outboxId: id ?? undefined,
    });
    if (id && sendResult.ok) {
      await admin
        .from("whatsapp_message_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: sendResult.providerMessageId ?? null,
        })
        .eq("id", id);
    }
  }

  return NextResponse.json({
    ok: true,
    outboxId: id,
    preview: finalBody,
    sendResult,
    mockLog: isWhatsAppDevMockEnabled() ? getMockWhatsAppSentLog().slice(-5) : [],
  });
}

export async function GET() {
  const supabase = await createClient();
  const r = await resolveDashboardBusinessId(supabase);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status! });

  const { data, error } = await supabase
    .from("whatsapp_message_outbox")
    .select("id, event_key, recipient_role, recipient_phone, body, status, scheduled_for, sent_at, created_at, last_error")
    .eq("business_id", r.businessId!)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    items: data ?? [],
    mockLog: isWhatsAppDevMockEnabled() ? getMockWhatsAppSentLog().slice(-10) : [],
  });
}
