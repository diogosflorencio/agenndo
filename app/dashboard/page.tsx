"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { STATUS_CONFIG, formatCurrency, type AppointmentStatus } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";
import {
  DashboardSetupGuide,
  type SetupProgressSnapshot,
} from "@/components/dashboard-setup-guide";
import { hasFullServiceAccess } from "@/lib/billing-access";
import { setAppointmentAttendance, centsToMoneyInput } from "@/lib/appointment-finance";
import { AppointmentValueModal } from "@/components/appointment-value-modal";
import { localISODate } from "@/lib/agenda-calendar-helpers";
import { formatDate } from "@/lib/utils";

type AppointmentRow = {
  id: string;
  client_id: string | null;
  date: string;
  time_start: string;
  time_end: string;
  price_cents: number;
  status: string;
  client_name_snapshot: string | null;
  clients: { name: string } | null;
  services: { name: string } | null;
  collaborators: { name: string } | null;
};

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatTime(t: string) {
  const [h, m] = t.split(":");
  return `${h}:${m ?? "00"}`;
}

/** Saudação conforme o horário local (0–23). */
function greetingForHour(hour: number) {
  if (hour >= 0 && hour < 6) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

const defaultSetupSnapshot: SetupProgressSnapshot = {
  hasSegment: false,
  hasContact: false,
  serviceCount: 0,
  collaboratorCount: 0,
  hasCollabServiceLink: false,
  hasOpenAvailabilityDay: false,
  hasPersonalizationExtras: false,
  hasSubscriptionAccess: false,
};

export default function DashboardHome() {
  const { theme } = useTheme();
  const { business, profile } = useDashboard();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [setupSnapshot, setSetupSnapshot] = useState<SetupProgressSnapshot>(defaultSetupSnapshot);
  const [loading, setLoading] = useState(true);
  /** Dia exibido na lista e no gráfico (clique na barra). */ 
  const [selectedDate, setSelectedDate] = useState(() => localISODate(new Date()));
  const [moneyModal, setMoneyModal] = useState<AppointmentRow | null>(null);
  const [attBusyId, setAttBusyId] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const patchTodayApt = (id: string, patch: Partial<AppointmentRow>) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  
  const runHomeFaltou = async (apt: AppointmentRow) => {
    if (!business?.id) return;
    setActionErr(null);
    setAttBusyId(apt.id);
    const supabase = createClient();
    const res = await setAppointmentAttendance({
      supabase,
      businessId: business.id,
      appointment: {
        id: apt.id,
        client_id: apt.client_id,
        date: apt.date,
        price_cents: apt.price_cents,
        status: apt.status,
      },
      clientName: apt.clients?.name ?? apt.client_name_snapshot,
      serviceName: apt.services?.name ?? null,
      collaboratorName: apt.collaborators?.name ?? null,
      nextStatus: "faltou",
    });
    setAttBusyId(null);
    if ("error" in res) {
      setActionErr(res.error);
      window.setTimeout(() => setActionErr(null), 5000);
      return;
    }
    patchTodayApt(apt.id, { status: "faltou" });
  };

  const runHomeCompareceu = async (apt: AppointmentRow, paidCents: number) => {
    if (!business?.id) return;
    setActionErr(null);
    setAttBusyId(apt.id);
    const supabase = createClient();
    const res = await setAppointmentAttendance({
      supabase,
      businessId: business.id,
      appointment: {
        id: apt.id,
        client_id: apt.client_id,
        date: apt.date,
        price_cents: apt.price_cents,
        status: apt.status,
      },
      clientName: apt.clients?.name ?? apt.client_name_snapshot,
      serviceName: apt.services?.name ?? null,
      collaboratorName: apt.collaborators?.name ?? null,
      nextStatus: "compareceu",
      paidCents,
    });
    setAttBusyId(null);
    if ("error" in res) {
      setActionErr(res.error);
      window.setTimeout(() => setActionErr(null), 5000);
      return;
    }
    patchTodayApt(apt.id, { status: "compareceu", price_cents: paidCents });
    setMoneyModal(null);
  };

  useEffect(() => {
    if (!business?.id) return;
    const supabase = createClient();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const to = new Date();
    to.setDate(to.getDate() + 60);
    const fromStr = localISODate(from);
    const toStr = localISODate(to);

    Promise.all([
      supabase
        .from("appointments")
        .select(
          `
        id, client_id, date, time_start, time_end, price_cents, status, client_name_snapshot,
        clients(name),
        services(name),
        collaborators(name)
      `
        )
        .eq("business_id", business.id)
        .gte("date", fromStr)
        .lte("date", toStr)
        .order("date", { ascending: true })
        .order("time_start", { ascending: true }),
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("active", true),
      supabase
        .from("collaborators")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("active", true),
      supabase.from("availability").select("closed, open_time, close_time").eq("business_id", business.id),
      supabase.from("collaborator_services").select("service_id").limit(1).maybeSingle(),
      supabase
        .from("personalization")
        .select("tagline, banner_url, about, instagram_url, facebook_url, whatsapp_number")
        .eq("business_id", business.id)
        .maybeSingle(),
    ]).then(
      ([aptsRes, svcRes, colRes, avRes, csRes, perRes]) => {
        setAppointments((aptsRes.data as unknown as AppointmentRow[]) ?? []);
        const avRows = avRes.data ?? [];
        const hasOpenAvailabilityDay = avRows.some(
          (row: { closed: boolean; open_time: string | null; close_time: string | null }) =>
            !row.closed && row.open_time != null && row.close_time != null
        );
        const per = perRes.data as {
          tagline?: string | null;
          banner_url?: string | null;
          about?: string | null;
          instagram_url?: string | null;
          facebook_url?: string | null;
          whatsapp_number?: string | null;
        } | null;
        const hasPersonalizationExtras = !!(
          per?.tagline?.trim() ||
          per?.banner_url?.trim() ||
          per?.about?.trim() ||
          per?.instagram_url?.trim() ||
          per?.facebook_url?.trim() ||
          per?.whatsapp_number?.trim()
        );
        setSetupSnapshot({
          hasSegment: !!(business.segment && String(business.segment).trim()),
          hasContact: !!(business.phone?.trim() || business.city?.trim()),
          serviceCount: svcRes.count ?? 0,
          collaboratorCount: colRes.count ?? 0,
          hasCollabServiceLink: csRes.data != null,
          hasOpenAvailabilityDay,
          hasPersonalizationExtras,
          hasSubscriptionAccess: hasFullServiceAccess(business),
        });
        setLoading(false);
      }
    );
  }, [
    business?.id,
    business?.segment,
    business?.phone,
    business?.city,
    business?.stripe_subscription_id,
    business?.subscription_status,
    business?.trial_ends_at,
    business?.billing_issue_deadline,
    business?.created_at,
  ]);

  const todayStr = localISODate(new Date());
  const todayAppointments = appointments.filter((a) => a.date === todayStr);
  const selectedDayAppointments = appointments.filter((a) => a.date === selectedDate);
  const yesterdayStr = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const pendingStatusCount = appointments.filter(
    (a) => a.date === yesterdayStr && a.status === "agendado"
  ).length;

  const weekData = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const out: {
      dayLabel: string;
      day: string;
      dateStr: string;
      agendamentos: number;
      receita: number;
    }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = localISODate(d);
      const dayName = DAYS[d.getDay()];
      const dayAppointments = appointments.filter((a) => a.date === dateStr);
      out.push({
        dayLabel: `${dayName.slice(0, 3)} ${String(d.getDate()).padStart(2, "0")}`,
        day: dayName,
        dateStr,
        agendamentos: dayAppointments.length,
        receita: dayAppointments.filter((a) => a.status === "compareceu").reduce((s, a) => s + (a.price_cents || 0), 0),
      });
    }
    return out;
  }, [appointments]);

  const weekFromToday = useMemo(() => {
    const mon = new Date();
    const day = mon.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    mon.setDate(mon.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fromStr = localISODate(mon);
    const toStr = localISODate(sun);
    const inWeek = appointments.filter((a) => a.date >= fromStr && a.date <= toStr);
    const restAfterToday = inWeek.filter((a) => a.date > todayStr);
    return { totalWeek: inWeek.length, restAfterToday: restAfterToday.length, fromStr, toStr };
  }, [appointments, todayStr]);

  const compareceu = appointments.filter((a) => a.status === "compareceu").length;
  const totalWithStatus = appointments.filter((a) =>
    ["compareceu", "faltou", "cancelado"].includes(a.status)
  ).length;
  const taxaComparecimento = totalWithStatus > 0 ? Math.round((compareceu / totalWithStatus) * 100) : 0;
  const totalWeek = weekData.reduce((s, d) => s + d.agendamentos, 0);
  const receitaWeek = weekData.reduce((s, d) => s + d.receita, 0);
  const maxDay = weekData.reduce((best, d) => (d.agendamentos > (best?.agendamentos ?? 0) ? d : best), weekData[0]);

  const insights: { icon: string; text: string; color: string }[] = [];
  if (maxDay && maxDay.agendamentos > 15) {
    insights.push({
      icon: "lightbulb",
      text: `${maxDay.day} é seu dia mais cheio (${maxDay.agendamentos} agend.) — considere abrir mais horários.`,
      color: "text-amber-600",
    });
  }
  if (totalWeek > 80) {
    insights.push({
      icon: "trending_up",
      text: `Esta semana você teve ${totalWeek} agendamentos. Boa demanda!`,
      color: "text-primary",
    });
  }
  if (taxaComparecimento >= 80 && totalWithStatus >= 5) {
    insights.push({
      icon: "check_circle",
      text: `Taxa de comparecimento em ${taxaComparecimento}%. Ótimo índice!`,
      color: "text-primary",
    });
  }
  if (taxaComparecimento > 0 && taxaComparecimento < 70 && totalWithStatus >= 3) {
    insights.push({
      icon: "warning",
      text: `Taxa de comparecimento em ${taxaComparecimento}%. Vale ativar lembretes para reduzir faltas.`,
      color: "text-amber-600",
    });
  }
  if (insights.length === 0) {
    insights.push({
      icon: "insights",
      text: "Com mais agendamentos e dados de presença, vamos mostrar insights personalizados aqui.",
      color: "text-gray-500",
    });
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? business?.name?.split(" ")[0] ?? "Olá";
  const isDark = theme === "dark";
  const tooltipStyle = isDark
    ? { background: "#0f1c15", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }
    : { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" };
  const tooltipLabelStyle = { color: isDark ? "#e5e7eb" : "#111827" };

  const canCreateAppointments = business ? hasFullServiceAccess(business) : true;

  const metrics = [
    { label: "Hoje", value: todayAppointments.length.toString(), sub: "agendamentos", subColor: "text-gray-400", icon: "calendar_today" },
    {
      label: "Semana (seg–dom)",
      value: String(weekFromToday.totalWeek),
      sub: `${weekFromToday.restAfterToday} após hoje`,
      subColor: "text-gray-400",
      icon: "date_range",
    },
    { label: "Comparecimento", value: `${taxaComparecimento}%`, sub: totalWithStatus > 0 ? `${compareceu}/${totalWithStatus}` : "—", subColor: "text-gray-400", icon: "calendar_month" },
    { label: "Receita semana", value: formatCurrency(receitaWeek / 100), sub: "últimos 7 dias", subColor: "text-gray-400", icon: "payments" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">
            {greetingForHour(new Date().getHours())}, {firstName}! 👋
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:pt-0.5 shrink-0">
          <Link
            href={canCreateAppointments ? "/dashboard/agendamentos/novo" : "/dashboard/conta"}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 shadow-sm transition-colors hover:border-primary/35 hover:text-gray-900"
          >
            <span className="material-symbols-outlined text-primary text-[15px] leading-none">
              {canCreateAppointments ? "add" : "gpp_maybe"}
            </span>
            {canCreateAppointments ? "Novo agendamento" : "Plano / assinatura"}
          </Link>
          <Link
            href="/dashboard/disponibilidade"
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 shadow-sm transition-colors hover:border-primary/35 hover:text-gray-900"
          >
            <span className="material-symbols-outlined text-primary text-[15px] leading-none">block</span>
            Bloquear horário
          </Link>
        </div>
      </div>

      {pendingStatusCount > 0 && (
        <Link
          href="/dashboard/agendamentos"
          className="flex items-center gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100/80 transition-colors"
        >
          <span className="material-symbols-outlined text-amber-600">warning</span>
          <p className="text-sm text-amber-800 flex-1">
            <span className="font-bold">{pendingStatusCount} agendamentos</span> de ontem sem status. Marcar agora →
          </p>
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-3">
              <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
              <span className="text-xs font-medium">{m.label}</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{m.value}</p>
            <p className={`text-xs font-medium ${m.subColor}`}>{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-gray-800">
        <p className="font-semibold text-gray-900 flex flex-wrap items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">info</span>
          Resumo rápido
        </p>
        <p className="mt-1 text-gray-700">
          <strong>Hoje</strong> você tem{" "}
          <strong>{todayAppointments.length}</strong> agendamento{todayAppointments.length === 1 ? "" : "s"}. Nesta semana (segunda a domingo):{" "}
          <strong>{weekFromToday.totalWeek}</strong> no total, sendo <strong>{weekFromToday.restAfterToday}</strong> nos dias seguintes.
        </p>
      </div>

      <DashboardSetupGuide snapshot={setupSnapshot} />

      {actionErr && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm border border-red-200 bg-red-50 text-red-900" role="alert">
          {actionErr}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {selectedDate === todayStr ? "Hoje" : formatDate(new Date(selectedDate + "T12:00:00"))}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedDate !== todayStr ? (
                  <>
                    Visualizando outro dia.{" "}
                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayStr)}
                      className="font-semibold text-primary hover:underline"
                    >
                      Voltar para hoje
                    </button>
                  </>
                ) : (
                  "Seus agendamentos do dia para gerenciar."
                )}
              </p>
            </div>
            <Link href="/dashboard/agendamentos" className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
              Agenda completa <span className="material-symbols-outlined text-xs">chevron_right</span>
            </Link>
          </div>

          <div className="space-y-3">
            {selectedDayAppointments.length === 0 ? (
              <EmptyState
                icon="calendar_today"
                title={selectedDate === todayStr ? "Nenhum agendamento hoje" : "Nenhum agendamento neste dia"}
                desc={
                  selectedDate === todayStr
                    ? "Compartilhe sua página para receber agendamentos"
                    : "Escolha outro dia no gráfico ou volte para hoje."
                }
                action={selectedDate === todayStr ? { label: "Compartilhar página", href: "/dashboard/personalizacao" } : undefined}
              />
            ) : (
              selectedDayAppointments.map((apt) => {
                const statusConf = STATUS_CONFIG[apt.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.agendado;
                const clientName = apt.clients?.name ?? apt.client_name_snapshot ?? "Cliente";
                const serviceName = apt.services?.name ?? "Serviço";
                const collabName = apt.collaborators?.name ?? "—";
                return (
                  <div key={apt.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors shadow-sm">
                    <div className="p-4 flex gap-3 items-start">
                      <div className="w-16 flex-shrink-0">
                        <p className="text-gray-900 font-bold text-sm">{formatTime(apt.time_start)}</p>
                        <p className="text-gray-500 text-xs">{formatTime(apt.time_end)}</p>
                      </div>
                      <div className="size-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-primary/80">
                        {clientName[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-gray-900 font-semibold text-sm">{clientName}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{serviceName} · {collabName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusConf.bg} ${statusConf.color}`}>
                              <span className={`size-1.5 rounded-full ${statusConf.dot}`} />
                              {statusConf.label}
                            </span>
                            <p className="text-primary text-xs font-bold">{formatCurrency(apt.price_cents / 100)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {(apt.status === "agendado" || (apt.status as AppointmentStatus) === "confirmado") && (
                      <div className="grid grid-cols-2 gap-px bg-gray-100 border-t border-gray-200">
                        <button
                          type="button"
                          disabled={attBusyId === apt.id}
                          onClick={() => void runHomeFaltou(apt)}
                          className="bg-white hover:bg-gray-50 disabled:opacity-50 text-xs font-semibold text-gray-600 py-3 transition-colors flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">person_off</span>
                          Faltou
                        </button>
                        <button
                          type="button"
                          disabled={attBusyId === apt.id}
                          onClick={() => setMoneyModal(apt)}
                          className="bg-primary/10 hover:bg-primary/20 disabled:opacity-50 text-xs font-bold text-primary py-3 transition-colors flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Compareceu
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-900">Últimos 7 dias</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Clique em uma barra para carregar os agendamentos desse dia na lista ao lado.
          </p>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekData} barSize={20}>
                <XAxis dataKey="dayLabel" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={{ color: "#13EC5B" }}
                  formatter={(v: number) => [`${v} agend.`, "Agendamentos"]}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as { dateStr?: string; dayLabel?: string } | undefined;
                    return p?.dateStr ? `${p.dayLabel ?? ""} · ${p.dateStr}` : "";
                  }}
                />
                <Bar dataKey="agendamentos" radius={[4, 4, 0, 0]} cursor="pointer">
                  {weekData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.dateStr === selectedDate ? "#13EC5B" : entry.day === "Sáb" ? "#86efac" : "#d1d5db"}
                      className="cursor-pointer"
                      onClick={() => setSelectedDate(entry.dateStr)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between text-xs">
              <div>
                <p className="text-gray-500">Total semana</p>
                <p className="text-gray-900 font-bold">{totalWeek} agend.</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">Receita</p>
                <p className="text-primary font-bold">{formatCurrency(receitaWeek / 100)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Insights</h3>
            {insights.map((insight, i) => (
              <div key={i} className="flex gap-2 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                <span className={`material-symbols-outlined text-base flex-shrink-0 mt-0.5 ${insight.color}`}>{insight.icon}</span>
                <p className="text-xs text-gray-600 leading-relaxed">{insight.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AppointmentValueModal
        open={moneyModal != null}
        title="Cliente compareceu"
        subtitle={
          moneyModal
            ? `${moneyModal.clients?.name ?? moneyModal.client_name_snapshot ?? "Cliente"} · ${moneyModal.services?.name ?? "Serviço"}`
            : undefined
        }
        initialValueReais={moneyModal ? centsToMoneyInput(moneyModal.price_cents) : "0,00"}
        confirmLabel="Confirmar"
        loading={moneyModal != null && attBusyId === moneyModal.id}
        onClose={() => attBusyId !== moneyModal?.id && setMoneyModal(null)}
        onConfirm={(cents) => {
          if (moneyModal) void runHomeCompareceu(moneyModal, cents);
        }}
      />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: string;
  title: string;
  desc: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="size-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
        <span className="material-symbols-outlined text-gray-400 text-3xl">{icon}</span>
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 mb-4 max-w-xs">{desc}</p>
      {action && (
        <Link href={action.href} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold rounded-lg border border-primary/20 transition-colors">
          {action.label}
        </Link>
      )}
    </div>
  );
}
