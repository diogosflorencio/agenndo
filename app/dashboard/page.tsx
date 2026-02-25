"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { STATUS_CONFIG, formatCurrency, type AppointmentStatus } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";

type AppointmentRow = {
  id: string;
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

export default function DashboardHome() {
  const { theme } = useTheme();
  const { business, profile } = useDashboard();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;
    const supabase = createClient();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const to = new Date();
    to.setDate(to.getDate() + 1);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    supabase
      .from("appointments")
      .select(
        `
        id, date, time_start, time_end, price_cents, status, client_name_snapshot,
        clients(name),
        services(name),
        collaborators(name)
      `
      )
      .eq("business_id", business.id)
      .gte("date", fromStr)
      .lte("date", toStr)
      .order("date", { ascending: true })
      .order("time_start", { ascending: true })
      .then(({ data }) => {
        setAppointments((data as unknown as AppointmentRow[]) ?? []);
        setLoading(false);
      });
  }, [business?.id]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter((a) => a.date === todayStr);
  const yesterdayStr = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const pendingStatusCount = appointments.filter(
    (a) => a.date === yesterdayStr && a.status === "agendado"
  ).length;

  const weekData = (() => {
    const byDay: Record<string, { agendamentos: number; receita: number }> = {};
    DAYS.forEach((d) => (byDay[d] = { agendamentos: 0, receita: 0 }));
    const start = new Date();
    start.setDate(start.getDate() - 6);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dayName = DAYS[d.getDay()];
      const dateStr = d.toISOString().slice(0, 10);
      const dayAppointments = appointments.filter((a) => a.date === dateStr);
      byDay[dayName].agendamentos = dayAppointments.length;
      byDay[dayName].receita = dayAppointments.reduce((s, a) => s + (a.price_cents || 0), 0);
    }
    return DAYS.map((day) => ({ day, ...byDay[day] }));
  })();

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

  const metrics = [
    { label: "Hoje", value: todayAppointments.length.toString(), sub: "agendamentos", subColor: "text-gray-400", icon: "calendar_today" },
    { label: "Esta semana", value: totalWeek.toString(), sub: "agendamentos", subColor: "text-gray-400", icon: "date_range" },
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bom dia, {firstName}! 👋</h1>
        <p className="text-gray-600 text-sm mt-1">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
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

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Hoje</h2>
            <Link href="/dashboard/agendamentos" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todos <span className="material-symbols-outlined text-xs">chevron_right</span>
            </Link>
          </div>

          <div className="space-y-3">
            {todayAppointments.length === 0 ? (
              <EmptyState
                icon="calendar_today"
                title="Nenhum agendamento hoje"
                desc="Compartilhe sua página para receber agendamentos"
                action={{ label: "Compartilhar página", href: "/dashboard/personalizacao" }}
              />
            ) : (
              todayAppointments.map((apt) => {
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
                        <button className="bg-white hover:bg-gray-50 text-xs font-semibold text-gray-600 py-3 transition-colors flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-sm">person_off</span>
                          Faltou
                        </button>
                        <button className="bg-primary/10 hover:bg-primary/20 text-xs font-bold text-primary py-3 transition-colors flex items-center justify-center gap-1">
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

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Link
              href="/dashboard/agendamentos"
              className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 hover:border-primary/40 rounded-xl text-sm font-semibold text-gray-700 hover:text-gray-900 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-primary text-base">add_circle</span>
              Novo agendamento
            </Link>
            <Link
              href="/dashboard/disponibilidade"
              className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 hover:border-primary/40 rounded-xl text-sm font-semibold text-gray-700 hover:text-gray-900 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-primary text-base">block</span>
              Bloquear horário
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Últimos 7 dias</h2>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekData} barSize={20}>
                <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={{ color: "#13EC5B" }}
                  formatter={(v: number) => [`${v} agend.`, ""]}
                />
                <Bar dataKey="agendamentos" radius={[4, 4, 0, 0]}>
                  {weekData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.day === "Sáb" ? "#13EC5B" : "#d1d5db"} />
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
