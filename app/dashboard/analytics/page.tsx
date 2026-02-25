"use client";

import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { WEEKLY_CHART_DATA, HEATMAP_DATA } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";

type Period = "hoje" | "7d" | "30d" | "90d";

const FUNNEL_DATA = [
  { step: "Visitas à página", value: 1250, pct: 100 },
  { step: "Iniciou agendamento", value: 380, pct: 30 },
  { step: "Completou", value: 280, pct: 22 },
  { step: "Compareceu", value: 248, pct: 20 },
];

const CLIENT_EVOLUTION = [
  { mes: "Ago", novos: 12, recorrentes: 18 },
  { mes: "Set", novos: 15, recorrentes: 22 },
  { mes: "Out", novos: 11, recorrentes: 25 },
  { mes: "Nov", novos: 18, recorrentes: 30 },
  { mes: "Dez", novos: 14, recorrentes: 35 },
  { mes: "Jan", novos: 22, recorrentes: 40 },
];

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<Period>("30d");
  const isDark = theme === "dark";
  const tooltipStyle = isDark
    ? { background: "#0f1c15", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }
    : { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" };
  const tickFill = isDark ? "#9ca3af" : "#6b7280";

  const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

  const getHeatValue = (day: string, hour: number) => {
    return HEATMAP_DATA.find((h) => h.day === day && h.hour === hour)?.value ?? 0;
  };

  const maxHeat = Math.max(...HEATMAP_DATA.map((h) => h.value));

  const exportCsv = () => {
    const rows: string[] = [];
    rows.push("Relatório Analytics - Agenndo");
    rows.push(`Período,${period}`);
    rows.push("");
    rows.push("Métricas gerais");
    rows.push("Indicador,Valor,Comparativo");
    rows.push("Agendamentos,127,+12% vs período anterior");
    rows.push("Taxa de presença,89%,+3% vs período anterior");
    rows.push("Cancelamentos,8%,-2% vs período anterior");
    rows.push("Receita total,R$ 9.100,00,+18% vs anterior");
    rows.push("Ticket médio,R$ 71,65,+5% vs anterior");
    rows.push("Novos clientes,22,34% do total");
    rows.push("");
    rows.push("Agendamentos por dia");
    rows.push("Dia,Agendamentos,Receita");
    WEEKLY_CHART_DATA.forEach((r) => rows.push(`${r.day},${r.agendamentos},${r.receita}`));
    rows.push("");
    rows.push("Horários mais populares (dia;hora;quantidade)");
    rows.push("Dia da semana;Horário;Agendamentos");
    HEATMAP_DATA.forEach((h) => rows.push(`${h.day};${h.hour};${h.value}`));
    rows.push("");
    rows.push("Funil de conversão");
    rows.push("Etapa;Quantidade;Percentual");
    FUNNEL_DATA.forEach((f) => rows.push(`${f.step};${f.value};${f.pct}%`));
    rows.push("");
    rows.push("Evolução de clientes");
    rows.push("Mês;Novos;Recorrentes");
    CLIENT_EVOLUTION.forEach((c) => rows.push(`${c.mes};${c.novos};${c.recorrentes}`));
    const csv = rows.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `analytics-agenndo-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 text-sm mt-1">Métricas e insights do seu negócio</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={exportCsv}
            className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Exportar CSV
          </button>
        <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl">
          {[
            { key: "hoje", label: "Hoje" },
            { key: "7d", label: "7d" },
            { key: "30d", label: "30d" },
            { key: "90d", label: "90d" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key as Period)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p.key
                  ? "bg-primary text-black"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Agendamentos", value: "127", sub: "+12% vs período anterior", up: true },
          { label: "Taxa de presença", value: "89%", sub: "+3% vs período anterior", up: true },
          { label: "Cancelamentos", value: "8%", sub: "-2% vs período anterior", up: false },
          { label: "Receita total", value: formatCurrency(9100), sub: "+18% vs anterior", up: true },
          { label: "Ticket médio", value: formatCurrency(71.65), sub: "+5% vs anterior", up: true },
          { label: "Novos clientes", value: "22", sub: "34% do total", up: true },
        ].map((metric) => (
          <div key={metric.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-2">{metric.label}</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
            <p className={`text-xs font-medium flex items-center gap-1 ${metric.up ? "text-primary" : "text-red-400"}`}>
              <span className="material-symbols-outlined text-xs">{metric.up ? "trending_up" : "trending_down"}</span>
              {metric.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Appointments chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Agendamentos por dia</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={WEEKLY_CHART_DATA} barSize={28}>
            <XAxis dataKey="day" tick={{ fill: tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} agend.`, ""]} />
            <Bar dataKey="agendamentos" radius={[4, 4, 0, 0]}>
              {WEEKLY_CHART_DATA.map((_, i) => (
                <Cell key={i} fill={i === 5 ? "#13EC5B" : isDark ? "#213428" : "#d1d5db"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Horários + Funil + Evolução na mesma linha */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Horários mais populares — quadrados com largura conforme o container */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Horários mais populares</h2>
          <div className="w-full min-w-0">
            <div className="flex gap-0.5 mb-0.5 pl-7 sm:pl-8">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex-1 min-w-0 text-center text-[10px] text-gray-500">
                  {day.slice(0, 2)}
                </div>
              ))}
            </div>
            {HOURS.map((hour) => (
              <div key={hour} className="flex items-center gap-0.5 mb-0.5">
                <span className="w-6 sm:w-7 text-[10px] text-gray-500 text-right pr-0.5 flex-shrink-0">
                  {hour}h
                </span>
                <div className="flex flex-1 gap-0.5 min-w-0">
                  {DAYS_OF_WEEK.map((day) => {
                    const val = getHeatValue(day, hour);
                    const intensity = maxHeat > 0 ? val / maxHeat : 0;
                    return (
                      <div
                        key={day}
                        className="flex-1 aspect-square min-w-0 rounded transition-all cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: intensity === 0
                            ? (isDark ? "#213428" : "#e5e7eb")
                            : `rgba(19, 236, 91, ${0.15 + intensity * 0.85})`,
                        }}
                        title={`${day} ${hour}h: ${val} agend.`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-2 justify-end">
            <span className="text-[10px] text-gray-500">Menos</span>
            <div className="flex gap-0.5">
              {[0.1, 0.3, 0.5, 0.7, 1].map((i) => (
                <div key={i} className="size-2 rounded" style={{ backgroundColor: `rgba(19, 236, 91, ${i})` }} />
              ))}
            </div>
            <span className="text-[10px] text-gray-500">Mais</span>
          </div>
        </div>

        {/* Funil de conversão */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Funil de conversão</h2>
          <div className="space-y-2">
            {FUNNEL_DATA.map((item, i) => (
              <div key={item.step}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs text-gray-500 truncate pr-1">{item.step}</span>
                  <span className="text-xs font-bold text-gray-900 flex-shrink-0">{item.value}</span>
                </div>
                <div className="h-5 bg-gray-100 rounded overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${item.pct}%`,
                      background: `linear-gradient(90deg, #13EC5B ${100 - i * 20}%, #0fc44c)`,
                      opacity: 1 - i * 0.15,
                    }}
                  />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-900">
                    {item.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evolução de clientes */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Evolução de clientes</h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={CLIENT_EVOLUTION} barSize={10}>
              <XAxis dataKey="mes" tick={{ fill: tickFill, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="novos" fill="#13EC5B" radius={[2, 2, 0, 0]} name="Novos" />
              <Bar dataKey="recorrentes" fill="#3B82F6" radius={[2, 2, 0, 0]} name="Recorrentes" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-3 mt-1.5">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="size-2 rounded bg-primary" /> Novos
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="size-2 rounded bg-blue-400" /> Recorrentes
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Insights automáticos</h2>
        <div className="space-y-3">
          {[
            { icon: "lightbulb", color: "text-yellow-400 bg-yellow-400/10", text: "Terça-feira às 10h é seu horário mais cheio — considere adicionar buffer de 15min." },
            { icon: "warning", color: "text-orange-400 bg-orange-400/10", text: '"Manicure" tem 32% de cancelamentos — verifique a política de cancelamento.' },
            { icon: "person_search", color: "text-blue-400 bg-blue-400/10", text: 'João Silva não agenda há 45 dias. Sugestão: enviar mensagem de reativação.' },
            { icon: "trending_up", color: "text-primary bg-primary/10", text: 'Sábados estão com 95% de ocupação. Considere abrir mais horários ou aumentar preços.' },
          ].map((insight, i) => (
            <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
              <div className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 ${insight.color}`}>
                <span className="material-symbols-outlined text-base">{insight.icon}</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{insight.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
