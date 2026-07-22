import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveDashboardBusinessId } from "@/lib/whatsapp/server-auth";
import { getWhatsAppUiMode } from "@/lib/whatsapp/config";
import { getWhatsAppProvider } from "@/lib/whatsapp/provider-factory";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const r = await resolveDashboardBusinessId(supabase);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status! });

  const bid = r.businessId!;
  const [settingsRes, sessionRes, templatesRes] = await Promise.all([
    supabase.from("whatsapp_settings").select("*").eq("business_id", bid).maybeSingle(),
    supabase.from("whatsapp_sessions").select("*").eq("business_id", bid).maybeSingle(),
    supabase
      .from("whatsapp_message_templates")
      .select("*")
      .eq("business_id", bid)
      .order("event_key", { ascending: true }),
  ]);

  if (settingsRes.error) return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  if (sessionRes.error) return NextResponse.json({ error: sessionRes.error.message }, { status: 500 });
  if (templatesRes.error) return NextResponse.json({ error: templatesRes.error.message }, { status: 500 });

  const provider = getWhatsAppProvider();
  const liveSession = await provider.getSession(bid);

  return NextResponse.json({
    uiMode: getWhatsAppUiMode(),
    settings: settingsRes.data,
    session: sessionRes.data,
    liveSession,
    templates: templatesRes.data ?? [],
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const r = await resolveDashboardBusinessId(supabase);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status! });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const bid = r.businessId!;
  const patch = {
    master_enabled: Boolean(body.masterEnabled),
    notify_owner_on_new_booking: Boolean(body.notifyOwnerOnNewBooking),
    notify_owner_on_cancellation: Boolean(body.notifyOwnerOnCancellation),
    notify_owner_on_payment: Boolean(body.notifyOwnerOnPayment),
    notify_staff_on_new_booking: Boolean(body.notifyStaffOnNewBooking),
    notify_staff_on_cancellation: Boolean(body.notifyStaffOnCancellation),
    default_country_code:
      typeof body.defaultCountryCode === "string" && body.defaultCountryCode.trim()
        ? body.defaultCountryCode.trim()
        : "55",
    owner_notification_phone:
      typeof body.ownerNotificationPhone === "string" ? body.ownerNotificationPhone.trim() || null : null,
  };

  const { error } = await supabase.from("whatsapp_settings").upsert(
    { business_id: bid, ...patch },
    { onConflict: "business_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
