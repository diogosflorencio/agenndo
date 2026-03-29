import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { toDate } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { timeToMinutes, minutesToTime } from "@/lib/disponibilidade";
import {
  effectiveDaySchedule,
  computeSlotsForCollaborator,
  unionSortedSlots,
  pickCollaboratorForTime,
  isSlotStillFree,
  type AvailabilityDbRow,
  type OverrideDbRow,
  type AppointmentBlockRow,
  type BlockDbRow,
  BOOKING_TZ,
} from "@/lib/public-booking";
import { hasFullServiceAccess } from "@/lib/billing-access";

export const runtime = "nodejs";

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function localTodayMidnight() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function normalizeTime(t: string) {
  const s = t.trim();
  if (s.length >= 5) return s.slice(0, 5);
  return s;
}

function endTimeFromStart(timeStart: string, durationMin: number): string {
  const m = timeToMinutes(timeStart.slice(0, 5)) + durationMin;
  const capped = Math.min(m, 24 * 60 - 1);
  return `${minutesToTime(capped)}:00`;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const slug = typeof b.slug === "string" ? b.slug.trim() : "";
  const serviceId = typeof b.serviceId === "string" ? b.serviceId.trim() : "";
  const dateStr = typeof b.date === "string" ? b.date.trim() : "";
  const timeStartRaw = typeof b.timeStart === "string" ? b.timeStart.trim() : "";
  const clientName = typeof b.clientName === "string" ? b.clientName.trim() : "";
  const notes = typeof b.notes === "string" ? b.notes.slice(0, 2000) : "";
  const collaboratorIdParam =
    typeof b.collaboratorId === "string" && b.collaboratorId.trim() ? b.collaboratorId.trim() : null;

  if (!slug || !serviceId || !dateStr || !timeStartRaw || !clientName) {
    return NextResponse.json({ error: "slug, serviceId, date, timeStart e clientName são obrigatórios" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "date inválida" }, { status: 400 });
  }

  const timeNorm = normalizeTime(timeStartRaw);
  if (!/^\d{2}:\d{2}$/.test(timeNorm)) {
    return NextResponse.json({ error: "Horário inválido" }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Servidor indisponível" }, { status: 503 });
  }

  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .select(
      "id, name, plan, stripe_subscription_id, subscription_status, subscription_current_period_end, trial_ends_at, billing_issue_deadline, created_at"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (bizErr || !biz?.id) return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });
  if (!hasFullServiceAccess(biz)) {
    return NextResponse.json(
      { error: "Agendamentos online estão suspensos para este negócio. Tente novamente mais tarde ou entre em contato diretamente." },
      { status: 403 }
    );
  }
  const bid = biz.id as string;
  const businessName = (biz.name as string) ?? "";

  const { data: svc, error: svcErr } = await admin
    .from("services")
    .select("id, business_id, duration_minutes, price_cents, active")
    .eq("id", serviceId)
    .maybeSingle();
  if (svcErr || !svc?.id || svc.business_id !== bid || !svc.active) {
    return NextResponse.json({ error: "Serviço inválido" }, { status: 400 });
  }
  const durationMinutes = Number(svc.duration_minutes) || 30;
  const priceCents = Number(svc.price_cents) || 0;

  const { data: links } = await admin
    .from("collaborator_services")
    .select("collaborator_id")
    .eq("service_id", serviceId);
  const linkIds = (links ?? []).map((l) => l.collaborator_id as string);

  const { data: allCollabs } = await admin
    .from("collaborators")
    .select("id, name")
    .eq("business_id", bid)
    .eq("active", true);
  const activeIds = new Set((allCollabs ?? []).map((c) => c.id as string));
  const collabNameById = new Map((allCollabs ?? []).map((c) => [c.id as string, c.name as string]));

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
    return NextResponse.json({ error: "Nenhum profissional disponível" }, { status: 400 });
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

  const bufferMinutes = typeof n?.booking_buffer_minutes === "number" ? n.booking_buffer_minutes : 0;
  const minAdvanceHours = typeof n?.min_advance_hours === "number" ? n.min_advance_hours : 0;
  const maxFutureDays = typeof n?.booking_max_future_days === "number" ? n.booking_max_future_days : 30;

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
      minAdvanceHours,
      collaboratorId: cid,
      appointments,
      blocks,
      now,
    });
    perCollab.set(cid, slots);
  }

  const unionSlots = unionSortedSlots(perCollab);
  if (!unionSlots.includes(timeNorm)) {
    return NextResponse.json({ error: "Este horário não está mais disponível" }, { status: 409 });
  }

  const resolvedCollab =
    collaboratorIdParam && collaboratorIdParam !== "any"
      ? collaboratorIdParam
      : pickCollaboratorForTime(timeNorm, pool, perCollab);

  if (!resolvedCollab) {
    return NextResponse.json({ error: "Não foi possível alocar um profissional" }, { status: 409 });
  }

  if (
    !isSlotStillFree({
      dateStr,
      timeStart: timeNorm,
      durationMinutes,
      bufferMinutes,
      collaboratorId: resolvedCollab,
      appointments,
      blocks,
    })
  ) {
    return NextResponse.json({ error: "Este horário não está mais disponível" }, { status: 409 });
  }

  const supabaseUser = await createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  let clientId: string;
  if (user) {
    const { data: existing } = await admin
      .from("clients")
      .select("id, name, total_appointments")
      .eq("business_id", bid)
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (existing?.id) {
      clientId = existing.id as string;
      if (clientName && clientName !== existing.name) {
        await admin.from("clients").update({ name: clientName, email: user.email ?? null }).eq("id", clientId);
      }
    } else {
      const { data: ins, error: insErr } = await admin
        .from("clients")
        .insert({
          business_id: bid,
          auth_user_id: user.id,
          name: clientName,
          email: user.email ?? null,
        })
        .select("id")
        .single();
      if (insErr || !ins?.id) {
        return NextResponse.json({ error: insErr?.message ?? "Erro ao criar cliente" }, { status: 500 });
      }
      clientId = ins.id as string;
    }
  } else {
    const { data: ins, error: insErr } = await admin
      .from("clients")
      .insert({
        business_id: bid,
        auth_user_id: null,
        name: clientName,
      })
      .select("id")
      .single();
    if (insErr || !ins?.id) {
      return NextResponse.json({ error: insErr?.message ?? "Erro ao criar cliente" }, { status: 500 });
    }
    clientId = ins.id as string;
  }

  const timeEnd = endTimeFromStart(timeNorm, durationMinutes);

  const { data: aptRow, error: aptErr } = await admin
    .from("appointments")
    .insert({
      business_id: bid,
      client_id: clientId,
      client_name_snapshot: user ? null : clientName,
      service_id: serviceId,
      collaborator_id: resolvedCollab,
      date: dateStr,
      time_start: `${timeNorm}:00`,
      time_end: timeEnd,
      price_cents: priceCents,
      status: "agendado",
      notes: notes || null,
    })
    .select("id")
    .single();

  if (aptErr || !aptRow?.id) {
    return NextResponse.json({ error: aptErr?.message ?? "Erro ao criar agendamento" }, { status: 500 });
  }

  const { data: cRow } = await admin.from("clients").select("total_appointments").eq("id", clientId).maybeSingle();
  const prev = Number(cRow?.total_appointments) || 0;
  await admin
    .from("clients")
    .update({
      total_appointments: prev + 1,
      last_appointment_date: dateStr,
    })
    .eq("id", clientId);

  return NextResponse.json({
    appointmentId: aptRow.id,
    collaboratorId: resolvedCollab,
    collaboratorName: collabNameById.get(resolvedCollab) ?? "Profissional",
    businessName,
  });
}
