import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveDashboardBusinessId } from "@/lib/whatsapp/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureWhatsAppDefaults } from "@/lib/whatsapp/integration/appointment-events";
import { isWhatsAppEventKey } from "@/lib/whatsapp/events";
import type { WhatsAppRecipientRole } from "@/lib/whatsapp/types";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const r = await resolveDashboardBusinessId(supabase);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status! });

  const admin = createAdminClient();
  const { error } = await ensureWhatsAppDefaults(admin, r.businessId!);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const r = await resolveDashboardBusinessId(supabase);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status! });

  let body: { templates?: Array<Record<string, unknown>> };
  try {
    body = (await request.json()) as { templates?: Array<Record<string, unknown>> };
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const templates = body.templates ?? [];
  const bid = r.businessId!;

  for (const tpl of templates) {
    const eventKey = typeof tpl.eventKey === "string" ? tpl.eventKey : "";
    const recipientRole = typeof tpl.recipientRole === "string" ? tpl.recipientRole : "";
    if (!isWhatsAppEventKey(eventKey)) continue;
    if (recipientRole !== "client" && recipientRole !== "owner" && recipientRole !== "staff") continue;

    const scheduleKind =
      tpl.scheduleKind === "before_appointment" || tpl.scheduleKind === "after_appointment"
        ? tpl.scheduleKind
        : "immediate";

    const { error } = await supabase.from("whatsapp_message_templates").upsert(
      {
        business_id: bid,
        event_key: eventKey,
        recipient_role: recipientRole as WhatsAppRecipientRole,
        enabled: Boolean(tpl.enabled),
        body: typeof tpl.body === "string" ? tpl.body : "",
        schedule_kind: scheduleKind,
        schedule_offset_minutes:
          typeof tpl.scheduleOffsetMinutes === "number" ? tpl.scheduleOffsetMinutes : null,
      },
      { onConflict: "business_id,event_key,recipient_role" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
