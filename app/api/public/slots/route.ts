import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  effectiveDaySchedule,
  computeSlotsForCollaborator,
  unionSortedSlots,
  type AvailabilityDbRow,
  type OverrideDbRow,
  type AppointmentBlockRow,
  type BlockDbRow,
  BOOKING_TZ,
} from "@/lib/public-booking";
import { addDays } from "date-fns";
import { toDate } from "date-fns-tz";

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function localTodayMidnight() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

export const runtime = "nodejs";

const SLOT_STEP = 15;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug")?.trim();
  const dateStr = searchParams.get("date")?.trim();
  const serviceId = searchParams.get("serviceId")?.trim();
  const collaboratorIdParam = searchParams.get("collaboratorId")?.trim();

  if (!slug || !dateStr || !serviceId) {
    return NextResponse.json({ error: "slug, date e serviceId são obrigatórios" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "date inválida" }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Servidor indisponível" }, { status: 503 });
  }

  const { data: biz, error: bizErr } = await admin.from("businesses").select("id").eq("slug", slug).maybeSingle();
  if (bizErr || !biz?.id) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });
  const bid = biz.id as string;

  const { data: svc, error: svcErr } = await admin
    .from("services")
    .select("id, business_id, duration_minutes, active")
    .eq("id", serviceId)
    .maybeSingle();
  if (svcErr || !svc?.id || svc.business_id !== bid || !svc.active) {
    return NextResponse.json({ error: "Serviço inválido" }, { status: 400 });
  }
  const durationMinutes = Number(svc.duration_minutes) || 30;

  const { data: links } = await admin
    .from("collaborator_services")
    .select("collaborator_id")
    .eq("service_id", serviceId);
  const linkIds = (links ?? []).map((l) => l.collaborator_id as string);

  const { data: allCollabs } = await admin
    .from("collaborators")
    .select("id")
    .eq("business_id", bid)
    .eq("active", true);
  const activeIds = new Set((allCollabs ?? []).map((c) => c.id as string));

  let pool: string[];
  if (linkIds.length === 0) {
    pool = Array.from(activeIds);
  } else {
    pool = linkIds.filter((id) => activeIds.has(id));
  }

  if (collaboratorIdParam && collaboratorIdParam !== "any") {
    if (!pool.includes(collaboratorIdParam)) {
      return NextResponse.json({ error: "Profissional inválido para este serviço" }, { status: 400 });
    }
    pool = [collaboratorIdParam];
  }

  if (pool.length === 0) {
    return NextResponse.json({ slots: [] as string[], collaborators: [] as string[] });
  }

  const [{ data: avRows }, { data: ovRows }, { data: n }] = await Promise.all([
    admin.from("availability").select("day_of_week, closed, open_time, close_time, breaks").eq("business_id", bid),
    admin.from("availability_overrides").select("date, closed, open_time, close_time, breaks").eq("business_id", bid),
    admin
      .from("notification_settings")
      .select("min_advance_hours, booking_buffer_minutes, booking_max_future_days")
      .eq("business_id", bid)
      .maybeSingle(),
  ]);

  const bufferMinutes = typeof n?.booking_buffer_minutes === "number" ? n.booking_buffer_minutes : 15;
  const minAdvanceHours = typeof n?.min_advance_hours === "number" ? n.min_advance_hours : 2;
  const maxFutureDays = typeof n?.booking_max_future_days === "number" ? n.booking_max_future_days : 60;

  const selectedDay = parseLocalDate(dateStr);
  const today = localTodayMidnight();
  if (selectedDay.getTime() < today.getTime()) {
    return NextResponse.json({ error: "Data no passado" }, { status: 400 });
  }
  const limitDay = addDays(today, maxFutureDays);
  if (selectedDay.getTime() > limitDay.getTime()) {
    return NextResponse.json({ error: "Data além do limite de agendamento" }, { status: 400 });
  }

  const schedule = effectiveDaySchedule(dateStr, (avRows ?? []) as AvailabilityDbRow[], (ovRows ?? []) as OverrideDbRow[]);

  const { data: apts } = await admin
    .from("appointments")
    .select("time_start, time_end, status, collaborator_id")
    .eq("business_id", bid)
    .eq("date", dateStr);

  const appointments = (apts ?? []) as AppointmentBlockRow[];

  const dayStart = toDate(`${dateStr} 00:00:00`, { timeZone: BOOKING_TZ });
  const dayEnd = addDays(dayStart, 1);
  const { data: blockRows } = await admin
    .from("availability_blocks")
    .select("collaborator_id, starts_at, ends_at")
    .eq("business_id", bid)
    .gt("ends_at", dayStart.toISOString())
    .lt("starts_at", dayEnd.toISOString());

  const blocks = (blockRows ?? []) as BlockDbRow[];

  const now = new Date();
  const perCollab = new Map<string, string[]>();
  for (const cid of pool) {
    const slots = computeSlotsForCollaborator({
      dateStr,
      schedule,
      durationMinutes,
      bufferMinutes,
      slotStepMinutes: SLOT_STEP,
      minAdvanceHours,
      collaboratorId: cid,
      appointments,
      blocks,
      now,
    });
    perCollab.set(cid, slots);
  }

  const slots = unionSortedSlots(perCollab);
  return NextResponse.json({ slots, collaborators: pool, bufferMinutes, minAdvanceHours });
}
