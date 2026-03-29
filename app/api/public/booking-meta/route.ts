import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ error: "slug obrigatório" }, { status: 400 });

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Agendamento online indisponível no servidor (configure SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 }
    );
  }

  const { data: biz, error: bizErr } = await admin.from("businesses").select("id").eq("slug", slug).maybeSingle();
  if (bizErr || !biz?.id) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const { data: n } = await admin
    .from("notification_settings")
    .select("min_advance_hours, booking_buffer_minutes, booking_max_future_days")
    .eq("business_id", biz.id)
    .maybeSingle();

  return NextResponse.json({
    maxFutureDays: typeof n?.booking_max_future_days === "number" ? n.booking_max_future_days : 60,
    minAdvanceHours: typeof n?.min_advance_hours === "number" ? n.min_advance_hours : 2,
    bufferMinutes: typeof n?.booking_buffer_minutes === "number" ? n.booking_buffer_minutes : 15,
  });
}
