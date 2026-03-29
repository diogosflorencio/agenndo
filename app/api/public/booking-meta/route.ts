import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicBookingLockInfo } from "@/lib/billing-access";

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

  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .select(
      "id, plan, stripe_subscription_id, subscription_status, subscription_current_period_end, trial_ends_at, billing_issue_deadline, created_at"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (bizErr || !biz?.id) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });

  const lock = getPublicBookingLockInfo(biz);

  const todayStr = new Date().toISOString().slice(0, 10);

  const [{ data: n }, { data: avRows }, { data: ovRows }] = await Promise.all([
    admin
      .from("notification_settings")
      .select("min_advance_hours, booking_buffer_minutes, booking_max_future_days, public_booking_time_ui")
      .eq("business_id", biz.id)
      .maybeSingle(),
    admin
      .from("availability")
      .select("day_of_week, closed, open_time, close_time, breaks")
      .eq("business_id", biz.id),
    admin
      .from("availability_overrides")
      .select("date, closed, open_time, close_time, breaks")
      .eq("business_id", biz.id)
      .gte("date", todayStr),
  ]);

  return NextResponse.json({
    maxFutureDays: typeof n?.booking_max_future_days === "number" ? n.booking_max_future_days : 30,
    minAdvanceHours: typeof n?.min_advance_hours === "number" ? n.min_advance_hours : 0,
    bufferMinutes: typeof n?.booking_buffer_minutes === "number" ? n.booking_buffer_minutes : 0,
    publicBookingTimeUi: n?.public_booking_time_ui === "blocks" ? "blocks" : "slider",
    publicBookingLocked: lock.blocked,
    publicBookingLockMessage: lock.message,
    weeklyAvailability: avRows ?? [],
    availabilityOverrides: ovRows ?? [],
  });
}
