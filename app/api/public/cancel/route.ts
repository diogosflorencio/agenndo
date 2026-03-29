import { NextResponse } from "next/server";
import { toDate } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BOOKING_TZ } from "@/lib/public-booking";

export const runtime = "nodejs";

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
  const appointmentId = typeof b.appointmentId === "string" ? b.appointmentId.trim() : "";

  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId obrigatório" }, { status: 400 });
  }

  const supabaseUser = await createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Faça login para cancelar" }, { status: 401 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Servidor indisponível" }, { status: 503 });
  }

  const { data: apt, error: aptErr } = await admin
    .from("appointments")
    .select("id, business_id, client_id, date, time_start, status")
    .eq("id", appointmentId)
    .maybeSingle();

  if (aptErr || !apt?.id || !apt.client_id) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const { data: clientRow } = await admin
    .from("clients")
    .select("id, auth_user_id")
    .eq("id", apt.client_id as string)
    .maybeSingle();

  if (!clientRow || clientRow.auth_user_id !== user.id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const st = apt.status as string;
  if (st === "cancelado") {
    return NextResponse.json({ error: "Agendamento já cancelado" }, { status: 400 });
  }
  if (st === "compareceu" || st === "faltou") {
    return NextResponse.json({ error: "Este agendamento não pode ser cancelado" }, { status: 400 });
  }

  const { data: n } = await admin
    .from("notification_settings")
    .select("min_advance_hours")
    .eq("business_id", apt.business_id as string)
    .maybeSingle();
  const minAdvanceHours = typeof n?.min_advance_hours === "number" ? n.min_advance_hours : 2;

  const dateStr = apt.date as string;
  const t = String(apt.time_start).slice(0, 5);
  const startInstant = toDate(`${dateStr}T${t}:00`, { timeZone: BOOKING_TZ });
  const msLeft = startInstant.getTime() - Date.now();
  if (msLeft < minAdvanceHours * 3600 * 1000) {
    return NextResponse.json(
      { error: `Cancelamento permitido com pelo menos ${minAdvanceHours}h de antecedência` },
      { status: 400 }
    );
  }

  const { error: upErr } = await admin.from("appointments").update({ status: "cancelado" }).eq("id", appointmentId);
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
