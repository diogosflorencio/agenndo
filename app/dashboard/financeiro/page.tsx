"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";

type RecordRow = {
  id: string;
  date: string;
  client_name: string | null;
  service_name: string | null;
  collaborator_name: string | null;
  amount_cents: number;
  paid: boolean;
};

const PIE_COLORS = ["#13EC5B", "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B"];

export default function FinanceiroPage() {
  const { theme } = useTheme();
  const { business } = useDashboard();
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");
  const [showAddModal, setShowAddModal] = useState(false);
  const isDark = theme === "dark";
  const tooltipStyle = isDark
    ? { background: "#0f1c15", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }
    : { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" };

  useEffect(() => {
    if (!business?.id) return;
    const supabase = createClient();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    supabase
      .from("financial_records")
      .select("id, date, client_name, service_name, collaborator_name, amount_cents, paid")
      .eq("business_id", business.id)
      .gte("date", start.toISOString().slice(0, 10))
      .order("date", { ascending: false })
      .then(({ data }) => {
        setRecords((data as RecordRow[]) ?? []);
        setLoading(false);
      });
  }, [business?.id]);

  const totalMonth = records.reduce((s, r) => s + Number(r.amount_cents), 0);
  const paidMonth = records.filter((r) => r.paid).reduce((s, r) => s + Number(r.amount_cents), 0);
  const pendingMonth = totalMonth - paidMonth;
  const todayStr = new Date().toISOString().slice(0, 10);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStr = weekStart.toISOString().slice(0, 10);
  const todayTotal = records.filter((r) => r.date === todayStr).reduce((s, r) => s + Number(r.amount_cents), 0);
  const weekTotal = records.filter((r) => r.date >= weekStr).reduce((s, r) => s + Number(r.amount_cents), 0);

  const byService: Record<string, number> = {};
  records.forEach((r) => {
    const name = r.service_name ?? "Outros";
    byService[name] = (byService[name] ?? 0) + Number(r.amount_cents);
  });
  const totalS = Object.values(byService).reduce((a, b) => a + b, 0);
  const SERVICE_REVENUE = Object.entries(byService)
    .map(([name, value]) => ({ name, value, pct: totalS ? Math.round((value / totalS) * 100) : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const byCollab: Record<string, number> = {};
  records.forEach((r) => {
    const name = r.collaborator_name ?? "—";
    byCollab[name] = (byCollab[name] ?? 0) + Number(r.amount_cents);
  });
  const COLLAB_REVENUE = Object.entries(byCollab).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

  const byDay: Record<number, number> = {};
  const start = new Date();
  start.setDate(start.getDate() - 29);
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    byDay[d.getDate()] = 0;
  }
  records.forEach((r) => {
    const day = new Date(r.date).getDate();
    byDay[day] = (byDay[day] ?? 0) + Number(r.amount_cents);
  });
  const MONTHLY_CHART_DATA = Object.entries(byDay).map(([day, receita]) => ({ day: Number(day), receita })).sort((a, b) => a.day - b.day);

  const exportCsv = () => {
    const rows: string[] = ["Relatório Financeiro - Agenndo", `Exportado em,${new Date().toLocaleString("pt-BR")}`, "", "Indicador;Valor", `Este mês;${formatCurrency(totalMonth / 100)}`, `Pendente;${formatCurrency(pendingMonth / 100)}`, "", "data;cliente;serviço;colaborador;valor;pago"];
    records.forEach((r) => rows.push(`${r.date};${r.client_name ?? ""};${r.service_name ?? ""};${r.collaborator_name ?? ""};${(r.amount_cents / 100).toFixed(2)};${r.paid ? "Sim" : "Não"}`));
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `financeiro-agenndo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-600 text-sm mt-1">Acompanhe sua receita e pagamentos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="px-3 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Exportar CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)]"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Entrada manual
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Hoje", value: formatCurrency(todayTotal / 100), sub: `${records.filter((r) => r.date === todayStr).length} atend.`, color: "text-gray-900" },
          { label: "Esta semana", value: formatCurrency(weekTotal / 100), sub: "Últimos 7 dias", color: "text-gray-900" },
          { label: "Este mês", value: formatCurrency(totalMonth / 100), sub: "Receita bruta", color: "text-primary" },
          { label: "Pendente", value: formatCurrency(pendingMonth / 100), sub: "A receber", color: "text-yellow-600" },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-2">{card.label}</p>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Period toggle + chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">Receita</h2>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {[
              { key: "day", label: "Dia" },
              { key: "week", label: "Semana" },
              { key: "month", label: "Mês" },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key as typeof period)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  period === p.key
                    ? "bg-primary text-black"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={MONTHLY_CHART_DATA}>
            <XAxis
              dataKey="day"
              tick={{ fill: "#6b7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: isDark ? "#e5e7eb" : "#111827" }}
              itemStyle={{ color: "#13EC5B" }}
              formatter={(v) => [formatCurrency(Number(v) / 100), "Receita"]}
            />
            <Line
              type="monotone"
              dataKey="receita"
              stroke="#13EC5B"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#13EC5B" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* By service */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Por serviço</h2>
          <div className="space-y-3">
            {SERVICE_REVENUE.map((item, i) => (
              <div key={item.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{item.pct}%</span>
                    <span className="text-xs font-bold text-gray-900">{formatCurrency(item.value / 100)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${item.pct}%`,
                      backgroundColor: PIE_COLORS[i],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By collaborator */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Por colaborador</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={COLLAB_REVENUE} layout="vertical" barSize={16}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v) / 100), "Receita"]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {COLLAB_REVENUE.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#213428]">
          <h2 className="text-sm font-bold text-gray-900">Entradas</h2>
          <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors">
            <span className="material-symbols-outlined text-sm">download</span>
            Exportar CSV
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 flex justify-center"><div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">Nenhum lançamento. Entradas aparecem ao marcar agendamentos como compareceu ou por entrada manual.</div>
          ) : (
            records.map((record) => (
              <div key={record.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm font-medium truncate">{record.client_name ?? "—"}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{record.service_name ?? "—"} · {record.collaborator_name ?? "—"}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">{new Date(record.date).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${record.paid ? "bg-primary/10 text-primary" : "bg-yellow-400/10 text-yellow-400"}`}>
                    {record.paid ? "Pago" : "Pendente"}
                  </span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(record.amount_cents / 100)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
