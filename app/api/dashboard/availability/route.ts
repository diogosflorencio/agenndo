import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_WEEKLY_SCHEDULE,
  WEEKDAY_KEYS,
  dowToWeekdayKey,
  weekdayKeyToDow,
  scheduleRowToDaySchedule,
  dayScheduleToRow,
  sanitizeDaySchedule,
  type DaySchedule,
  type WeekdayKey,
} from "@/lib/disponibilidade";

export const runtime = "nodejs";

type BookingPayload = {
  bufferMinutes: number;
  minAdvanceHours: number;
  maxFutureDays: number;
  publicBookingTimeUi: "slider" | "blocks";
};

function isDaySchedule(x: unknown): x is DaySchedule {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.active === "boolean" && typeof o.start === "string" && typeof o.end === "string" && Array.isArray(o.breaks);
}

async function resolveBusiness(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "Não autenticado", status: 401 as const, businessId: null as string | null };
  const { data: biz, error } = await supabase.from("businesses").select("id").eq("profile_id", user.id).maybeSingle();
  if (error || !biz?.id) return { error: "Negócio não encontrado", status: 404 as const, businessId: null as string | null };
  return { businessId: biz.id as string, error: null, status: null };
}

export async function GET() {
  const supabase = await createClient();
  const r = await resolveBusiness(supabase);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status! });

  const bid = r.businessId!;
  const [avRes, ovRes, notifRes] = await Promise.all([
    supabase.from("availability").select("day_of_week, closed, open_time, close_time, breaks").eq("business_id", bid),
    supabase.from("availability_overrides").select("date, closed, open_time, close_time, breaks").eq("business_id", bid),
    supabase
      .from("notification_settings")
      .select("min_advance_hours, booking_buffer_minutes, booking_max_future_days, public_booking_time_ui")
      .eq("business_id", bid)
      .maybeSingle(),
  ]);

  if (avRes.error) return NextResponse.json({ error: avRes.error.message }, { status: 500 });
  if (ovRes.error) return NextResponse.json({ error: ovRes.error.message }, { status: 500 });

  const weekly: Record<string, DaySchedule> = { ...DEFAULT_WEEKLY_SCHEDULE };
  for (const row of avRes.data ?? []) {
    const key = dowToWeekdayKey(row.day_of_week as number);
    weekly[key] = scheduleRowToDaySchedule(row);
  }

  const overrides: Record<string, DaySchedule> = {};
  for (const row of ovRes.data ?? []) {
    const key = String(row.date);
    overrides[key] = scheduleRowToDaySchedule(row);
  }

  const n = notifRes.data;
  const uiRaw = n?.public_booking_time_ui;
  const publicBookingTimeUi: "slider" | "blocks" = uiRaw === "blocks" ? "blocks" : "slider";
  const booking: BookingPayload = {
    bufferMinutes: typeof n?.booking_buffer_minutes === "number" ? n.booking_buffer_minutes : 0,
    minAdvanceHours: typeof n?.min_advance_hours === "number" ? n.min_advance_hours : 0,
    maxFutureDays: typeof n?.booking_max_future_days === "number" ? n.booking_max_future_days : 30,
    publicBookingTimeUi,
  };

  return NextResponse.json({ weekly, overrides, booking });
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  const r = await resolveBusiness(supabase);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status! });
  const bid = r.businessId!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body || typeof body !== "object") return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  const b = body as Record<string, unknown>;
  const weeklyRaw = b.weekly;
  const overridesRaw = b.overrides;
  const bookingRaw = b.booking;

  if (!weeklyRaw || typeof weeklyRaw !== "object") return NextResponse.json({ error: "weekly obrigatório" }, { status: 400 });
  if (!overridesRaw || typeof overridesRaw !== "object") return NextResponse.json({ error: "overrides obrigatório" }, { status: 400 });
  if (!bookingRaw || typeof bookingRaw !== "object") return NextResponse.json({ error: "booking obrigatório" }, { status: 400 });

  const weeklyObj = weeklyRaw as Record<string, unknown>;
  for (const key of WEEKDAY_KEYS) {
    if (!isDaySchedule(weeklyObj[key])) return NextResponse.json({ error: `weekly.${key} inválido` }, { status: 400 });
  }

  const overridesObj = overridesRaw as Record<string, unknown>;
  for (const [dateKey, val] of Object.entries(overridesObj)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return NextResponse.json({ error: `Data inválida: ${dateKey}` }, { status: 400 });
    if (!isDaySchedule(val)) return NextResponse.json({ error: `override ${dateKey} inválido` }, { status: 400 });
  }

  const bk = bookingRaw as Record<string, unknown>;
  const bufferMinutes = Number(bk.bufferMinutes);
  const minAdvanceHours = Number(bk.minAdvanceHours);
  const maxFutureDays = Number(bk.maxFutureDays);
  const uiRaw = bk.publicBookingTimeUi;
  const publicBookingTimeUi: "slider" | "blocks" = uiRaw === "blocks" ? "blocks" : "slider";
  if (uiRaw != null && uiRaw !== "slider" && uiRaw !== "blocks") {
    return NextResponse.json({ error: "publicBookingTimeUi inválido" }, { status: 400 });
  }
  if (!Number.isFinite(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 120) {
    return NextResponse.json({ error: "bufferMinutes inválido" }, { status: 400 });
  }
  if (!Number.isFinite(minAdvanceHours) || minAdvanceHours < 0 || minAdvanceHours > 168) {
    return NextResponse.json({ error: "minAdvanceHours inválido" }, { status: 400 });
  }
  if (!Number.isFinite(maxFutureDays) || maxFutureDays < 1 || maxFutureDays > 730) {
    return NextResponse.json({ error: "maxFutureDays inválido" }, { status: 400 });
  }

  const availabilityRows = WEEKDAY_KEYS.map((key) => {
    const s = sanitizeDaySchedule(weeklyObj[key] as DaySchedule);
    const row = dayScheduleToRow(s);
    return {
      business_id: bid,
      day_of_week: weekdayKeyToDow(key as WeekdayKey),
      closed: row.closed,
      open_time: row.open_time,
      close_time: row.close_time,
      breaks: row.breaks,
    };
  });

  const { error: avErr } = await supabase.from("availability").upsert(availabilityRows, { onConflict: "business_id,day_of_week" });
  if (avErr) return NextResponse.json({ error: avErr.message }, { status: 500 });

  const { error: delErr } = await supabase.from("availability_overrides").delete().eq("business_id", bid);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const overrideEntries = Object.entries(overridesObj);
  if (overrideEntries.length > 0) {
    const overrideRows = overrideEntries.map(([date, val]) => {
      const row = dayScheduleToRow(sanitizeDaySchedule(val as DaySchedule));
      return {
        business_id: bid,
        date,
        closed: row.closed,
        open_time: row.open_time,
        close_time: row.close_time,
        breaks: row.breaks,
      };
    });
    const { error: insErr } = await supabase.from("availability_overrides").insert(overrideRows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const { data: existingNotif } = await supabase.from("notification_settings").select("id, reminder_email, reminder_whatsapp").eq("business_id", bid).maybeSingle();

  const notifPayload = {
    min_advance_hours: Math.round(minAdvanceHours),
    booking_buffer_minutes: Math.round(bufferMinutes),
    booking_max_future_days: Math.round(maxFutureDays),
    public_booking_time_ui: publicBookingTimeUi,
    updated_at: new Date().toISOString(),
  };

  if (existingNotif?.id) {
    const { error: nErr } = await supabase.from("notification_settings").update(notifPayload).eq("business_id", bid);
    if (nErr) return NextResponse.json({ error: nErr.message }, { status: 500 });
  } else {
    const { error: nErr } = await supabase.from("notification_settings").insert({
      business_id: bid,
      reminder_email: true,
      reminder_whatsapp: false,
      ...notifPayload,
    });
    if (nErr) return NextResponse.json({ error: nErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
