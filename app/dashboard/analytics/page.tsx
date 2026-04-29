"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";

const DAYS_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** YYYY-MM-DD no fuso local (alinha com datas de agendamento no calendário). */
function localISODate(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Period = "hoje" | "7d" | "30d" | "90d";

type AptRow = {
  date: string;
  time_start: string;
  price_cents: number;
  status: string;
  client_id: string | null;
  service_id: string;
  services: { name: string } | { name: string }[] | null;
};

function serviceName(row: AptRow): string {
  const s = row.services;
  if (!s) return "Serviço";
  if (Array.isArray(s)) return s[0]?.name ?? "Serviço";
  return s.name ?? "Serviço";
}

function centsToReais(c: number) {
  return (c ?? 0) / 100;
}

function getPeriodBounds(period: Period): {
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
} {
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const endStr = localISODate(end);

  let len = 1;
  if (period === "7d") len = 7;
  else if (period === "30d") len = 30;
  else if (period === "90d") len = 90;

  const start = new Date(end);
  if (period === "hoje") {
    start.setTime(end.getTime());
  } else {
    start.setDate(start.getDate() - (len - 1));
  }
  const startStr = start.toISOString().slice(0, 10);

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  if (period !== "hoje") {
    prevStart.setDate(prevStart.getDate() - (len - 1));
  }

  return {
    start: startStr,
    end: endStr,
    prevStart: prevStart.toISOString().slice(0, 10),
    prevEnd: prevEnd.toISOString().slice(0, 10),
  };
}

function filterByRange(rows: AptRow[], from: string, to: string) {
  return rows.filter((a) => a.date >= from && a.date <= to);
}

function sumRevenueNonCancelled(rows: AptRow[]) {
  return rows
    .filter((a) => a.status !== "cancelado")
    .reduce((s, a) => s + (a.price_cents ?? 0), 0);
}

function mondayKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return localISODate(d);
}

function buildBarSeries(
  period: Period,
  filtered: AptRow[]
): { label: string; agendamentos: number; receita: number }[] {
  if (period === "hoje") {
    const today = localISODate();
    const apts = filtered.filter((a) => a.date === today);
    return [
      {
        label: "Hoje",
        agendamentos: apts.length,
        receita: apts.reduce((s, a) => s + (a.price_cents ?? 0), 0),
      },
    ];
  }

  if (period === "7d" || period === "30d") {
    const days = period === "7d" ? 7 : 30;
    const out: { label: string; agendamentos: number; receita: number }[] = [];
    const end = new Date();
    end.setHours(12, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const ds = localISODate(d);
      const apts = filtered.filter((a) => a.date === ds);
      out.push({
        label:
          period === "7d"
            ? d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" })
            : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        agendamentos: apts.length,
        receita: apts.reduce((s, a) => s + (a.price_cents ?? 0), 0),
      });
    }
    return out;
  }

  const map = new Map<string, { agendamentos: number; receita: number }>();
  filtered.forEach((a) => {
    const k = mondayKey(a.date);
    const cur = map.get(k) ?? { agendamentos: 0, receita: 0 };
    cur.agendamentos += 1;
    cur.receita += a.price_cents ?? 0;
    map.set(k, cur);
  });
  return Array.from(map.entries())
    .sort((x, y) => x[0].localeCompare(y[0]))
    .map(([start, v]) => {
      const d = new Date(start + "T12:00:00");
      return {
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        agendamentos: v.agendamentos,
        receita: v.receita,
      };
    });
}

function buildFunnel(filtered: AptRow[]) {
  const total = filtered.length;
  const naoCancel = filtered.filter((a) => a.status !== "cancelado").length;
  const confirmPipeline = filtered.filter((a) =>
    ["confirmado", "compareceu", "faltou"].includes(a.status)
  ).length;
  const compareceu = filtered.filter((a) => a.status === "compareceu").length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  return [
    { step: "Agendamentos", value: total, pct: 100 },
    { step: "Não cancelados", value: naoCancel, pct: pct(naoCancel) },
    { step: "Confirmados / realizados", value: confirmPipeline, pct: pct(confirmPipeline) },
    { step: "Compareceram", value: compareceu, pct: pct(compareceu) },
  ];
}

function buildClientEvolution(allRows: AptRow[]) {
  const months: { key: string; label: string; start: string; end: string }[] = [];
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const start = localISODate(new Date(y, m, 1));
    const end = localISODate(new Date(y, m + 1, 0));
    months.push({
      key: `${y}-${m}`,
      label: d.toLocaleDateString("pt-BR", { month: "short" }),
      start,
      end,
    });
  }

  const firstByClient = new Map<string, string>();
  const withClient = allRows.filter((a) => a.client_id);
  withClient
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((a) => {
      const id = a.client_id as string;
      if (!firstByClient.has(id)) firstByClient.set(id, a.date);
    });

  return months.map(({ key, label, start, end }) => {
    const inMonth = allRows.filter((a) => a.date >= start && a.date <= end && a.client_id);
    const novos = new Set<string>();
    const recorrentes = new Set<string>();
    inMonth.forEach((a) => {
      const cid = a.client_id as string;
      const first = firstByClient.get(cid);
      if (!first) return;
      if (first >= start && first <= end) novos.add(cid);
      else if (first < start) recorrentes.add(cid);
    });
    return { mes: label, novos: novos.size, recorrentes: recorrentes.size, key };
  });
}

function pctChangeLabel(curr: number, prev: number, invert = false): { text: string; up: boolean } {
  if (prev === 0 && curr === 0) return { text: "Sem período anterior", up: true };
  if (prev === 0) return { text: "Novo vs período anterior", up: !invert };
  const raw = ((curr - prev) / prev) * 100;
  const rounded = Math.round(raw * 10) / 10;
  const up = invert ? raw < 0 : raw > 0;
  const sign = raw > 0 ? "+" : "";
  return { text: `${sign}${rounded}% vs período anterior`, up: raw === 0 ? true : up };
}

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const { business } = useDashboard();
  const [period, setPeriod] = useState<Period>("30d");
  const [appointments, setAppointments] = useState<AptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!business?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const from = new Date();
    from.setMonth(from.getMonth() - 24);
    const fromStr = localISODate(from);

    supabase
      .from("appointments")
      .select(
        "date, time_start, price_cents, status, client_id, service_id, services ( name )"
      )
      .eq("business_id", business.id)
      .gte("date", fromStr)
      .order("date", { ascending: true })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
          setAppointments([]);
        } else {
          setAppointments((data ?? []) as unknown as AptRow[]);
        }
        setLoading(false);
      });
  }, [business?.id]);

  const bounds = useMemo(() => getPeriodBounds(period), [period]);
  const filtered = useMemo(
    () => filterByRange(appointments, bounds.start, bounds.end),
    [appointments, bounds.start, bounds.end]
  );
  const prevFiltered = useMemo(
    () => filterByRange(appointments, bounds.prevStart, bounds.prevEnd),
    [appointments, bounds.prevStart, bounds.prevEnd]
  );

  const barSeries = useMemo(() => buildBarSeries(period, filtered), [period, filtered]);
  const funnelData = useMemo(() => buildFunnel(filtered), [filtered]);
  const clientEvolution = useMemo(() => buildClientEvolution(appointments), [appointments]);

  const kpis = useMemo(() => {
    const active = filtered.filter((a) => a.status !== "cancelado");
    const cancelados = filtered.filter((a) => a.status === "cancelado").length;
    const compareceu = filtered.filter((a) => a.status === "compareceu").length;
    const faltou = filtered.filter((a) => a.status === "faltou").length;
    const realizados = compareceu + faltou;
    const taxaPresenca = realizados > 0 ? Math.round((compareceu / realizados) * 1000) / 10 : null;
    const taxaCancel = filtered.length > 0 ? Math.round((cancelados / filtered.length) * 1000) / 10 : 0;
    const receitaCents = sumRevenueNonCancelled(filtered);
    const prevReceita = sumRevenueNonCancelled(prevFiltered);
    const prevActive = prevFiltered.filter((a) => a.status !== "cancelado");
    const ticketCents = active.length > 0 ? receitaCents / active.length : 0;
    const prevTicketCents = prevActive.length > 0 ? prevReceita / prevActive.length : 0;

    const firstByClient = new Map<string, string>();
    appointments
      .filter((a) => a.client_id)
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((a) => {
        const id = a.client_id as string;
        if (!firstByClient.has(id)) firstByClient.set(id, a.date);
      });
    const novosClientes = new Set(
      filtered
        .filter((a) => a.client_id)
        .map((a) => a.client_id as string)
        .filter((cid) => {
          const f = firstByClient.get(cid);
          return f && f >= bounds.start && f <= bounds.end;
        })
    ).size;

    const prevNovos = new Set(
      prevFiltered
        .filter((a) => a.client_id)
        .map((a) => a.client_id as string)
        .filter((cid) => {
          const f = firstByClient.get(cid);
          return f && f >= bounds.prevStart && f <= bounds.prevEnd;
        })
    ).size;

    const distinctClientsPeriod = new Set(
      filtered.map((a) => a.client_id).filter(Boolean)
    ).size;
    const pctNovos =
      distinctClientsPeriod > 0
        ? Math.round((novosClientes / distinctClientsPeriod) * 1000) / 10
        : 0;

    const prevCompareceu = prevFiltered.filter((a) => a.status === "compareceu").length;
    const prevFaltou = prevFiltered.filter((a) => a.status === "faltou").length;
    const prevRealizados = prevCompareceu + prevFaltou;
    const prevTaxa =
      prevRealizados > 0 ? (prevCompareceu / prevRealizados) * 100 : null;

    return {
      agendamentos: { curr: filtered.length, prev: prevFiltered.length },
      taxaPresenca: {
        curr: taxaPresenca,
        prev: prevTaxa !== null ? Math.round(prevTaxa * 10) / 10 : null,
      },
      taxaCancel: { curr: taxaCancel, prev: prevFiltered.length > 0 ? Math.round((prevFiltered.filter((a) => a.status === "cancelado").length / prevFiltered.length) * 1000) / 10 : 0 },
      receita: { curr: receitaCents, prev: prevReceita },
      ticket: { curr: ticketCents, prev: prevTicketCents },
      novosClientes: { curr: novosClientes, prev: prevNovos, pctNovos },
    };
  }, [filtered, prevFiltered, appointments, bounds]);

  const heatmapByKey: Record<string, number> = {};
  filtered.forEach((a) => {
    const d = new Date(a.date + "T12:00:00");
    const day = DAYS_LABELS[d.getDay()];
    const hour = parseInt(a.time_start?.slice(0, 2) ?? "0", 10);
    const key = `${day}-${hour}`;
    heatmapByKey[key] = (heatmapByKey[key] ?? 0) + 1;
  });
  const HEATMAP_DATA = DAYS_LABELS.flatMap((day) =>
    Array.from({ length: 12 }, (_, i) => {
      const hour = i + 8;
      return { day, hour, value: heatmapByKey[`${day}-${hour}`] ?? 0 };
    })
  );
  const maxHeat = Math.max(...HEATMAP_DATA.map((h) => h.value), 1);

  const popularSlots = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((a) => {
      const d = new Date(a.date + "T12:00:00");
      const day = DAYS_LABELS[d.getDay()];
      const hour = parseInt(a.time_start?.slice(0, 2) ?? "0", 10);
      const key = `${day} · ${String(hour).padStart(2, "0")}h`;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 12);
  }, [filtered]);

  const insights = useMemo(() => {
    const out: { icon: string; color: string; text: string }[] = [];
    if (popularSlots.length > 0) {
      const [label, count] = popularSlots[0];
      out.push({
        icon: "schedule",
        color: "text-primary bg-primary/10",
        text: `${label} é o horário mais solicitado no período (${count} agendamento${count > 1 ? "s" : ""}).`,
      });
    }
    const byService = new Map<string, { total: number; cancel: number }>();
    filtered.forEach((a) => {
      const name = serviceName(a);
      const cur = byService.get(name) ?? { total: 0, cancel: 0 };
      cur.total += 1;
      if (a.status === "cancelado") cur.cancel += 1;
      byService.set(name, cur);
    });
    const worst = Array.from(byService.entries()).reduce<{
      name: string;
      rate: number;
      total: number;
    } | null>((acc, [svcName, v]) => {
      if (v.total < 3) return acc;
      const rate = v.cancel / v.total;
      if (!acc || rate > acc.rate) return { name: svcName, rate, total: v.total };
      return acc;
    }, null);
    if (worst !== null && worst.rate >= 0.15) {
      out.push({
        icon: "warning",
        color: "text-orange-400 bg-orange-400/10",
        text: `"${worst.name}" concentra ${Math.round(worst.rate * 100)}% de cancelamentos (${worst.total} agendamentos). Revise política ou lembretes.`,
      });
    }
    const byDay: Record<number, number> = {};
    filtered.forEach((a) => {
      const dow = new Date(a.date + "T12:00:00").getDay();
      byDay[dow] = (byDay[dow] ?? 0) + 1;
    });
    let maxD = 0;
    let maxC = 0;
    Object.entries(byDay).forEach(([d, c]) => {
      if (c > maxC) {
        maxC = c;
        maxD = Number(d);
      }
    });
    if (filtered.length >= 5 && maxC > 0) {
      const pct = Math.round((maxC / filtered.length) * 100);
      if (pct >= 25) {
        out.push({
          icon: "calendar_month",
          color: "text-blue-400 bg-blue-400/10",
          text: `${DAYS_LABELS[maxD]} concentra ${pct}% dos agendamentos do período. Vale ajustar disponibilidade ou equipe nesse dia.`,
        });
      }
    }
    const sat = filtered.filter((a) => new Date(a.date + "T12:00:00").getDay() === 6).length;
    if (filtered.length >= 8 && sat / filtered.length >= 0.35) {
      out.push({
        icon: "trending_up",
        color: "text-primary bg-primary/10",
        text: "Sábados respondem por grande parte da demanda. Considere reforçar horários ou precificação nesse dia.",
      });
    }
    if (out.length === 0 && filtered.length === 0) {
      out.push({
        icon: "info",
        color: "text-gray-400 bg-gray-100",
        text: "Quando houver agendamentos no período, mostraremos insights automáticos aqui.",
      });
    }
    return out.slice(0, 4);
  }, [filtered, popularSlots]);

  const isDark = theme === "dark";
  const tooltipStyle = isDark
    ? {
        background: "#0f1c15",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "8px",
        fontSize: "12px",
      }
    : {
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        fontSize: "12px",
      };
  const tickFill = isDark ? "#9ca3af" : "#6b7280";

  const DAYS_OF_WEEK = DAYS_LABELS;
  const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

  const getHeatValue = (day: string, hour: number) =>
    HEATMAP_DATA.find((h) => h.day === day && h.hour === hour)?.value ?? 0;

  const todayStr = localISODate();
  const highlightBarIndex =
    period === "7d"
      ? barSeries.findIndex((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return localISODate(d) === todayStr;
        })
      : -1;

  const exportCsv = () => {
    const rows: string[] = [
      "Relatório Analytics - Agenndo",
      `Período,${period}`,
      "",
      "Rótulo,Agendamentos,Receita (centavos)",
    ];
    barSeries.forEach((r) =>
      rows.push(`${r.label},${r.agendamentos},${r.receita}`)
    );
    rows.push("", "Dia da semana;Horário;Agendamentos");
    HEATMAP_DATA.forEach((h) => rows.push(`${h.day};${h.hour};${h.value}`));
    const csv = rows.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `analytics-agenndo-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const mAg = pctChangeLabel(kpis.agendamentos.curr, kpis.agendamentos.prev);
  const mRec = pctChangeLabel(kpis.receita.curr, kpis.receita.prev);
  const mTicket = pctChangeLabel(kpis.ticket.curr, kpis.ticket.prev);
  const mNovos = pctChangeLabel(kpis.novosClientes.curr, kpis.novosClientes.prev);

  const taxaCurr = kpis.taxaPresenca.curr;
  const taxaPrev = kpis.taxaPresenca.prev;
  let mTaxa = { text: "Sem comparecimentos no período", up: true };
  if (taxaCurr !== null && taxaPrev !== null) {
    mTaxa = pctChangeLabel(taxaCurr, taxaPrev);
  } else if (taxaCurr !== null && taxaPrev === null) {
    mTaxa = { text: "Sem período anterior comparável", up: true };
  }

  const mCancel = pctChangeLabel(kpis.taxaCancel.curr, kpis.taxaCancel.prev, true);

  const metricCards = [
    {
      label: "Agendamentos",
      value: String(kpis.agendamentos.curr),
      sub: mAg.text,
      up: mAg.up,
    },
    {
      label: "Taxa de presença",
      value:
        taxaCurr !== null ? `${taxaCurr}%` : "-",
      sub: mTaxa.text,
      up: mTaxa.up,
    },
    {
      label: "Cancelamentos",
      value: `${kpis.taxaCancel.curr}%`,
      sub: mCancel.text,
      up: mCancel.up,
    },
    {
      label: "Receita (não cancelada)",
      value: formatCurrency(centsToReais(kpis.receita.curr)),
      sub: mRec.text,
      up: mRec.up,
    },
    {
      label: "Ticket médio",
      value:
        kpis.agendamentos.curr > 0
          ? formatCurrency(centsToReais(kpis.ticket.curr))
          : "-",
      sub: mTicket.text,
      up: mTicket.up,
    },
    {
      label: "Novos clientes",
      value: String(kpis.novosClientes.curr),
      sub:
        kpis.novosClientes.pctNovos > 0
          ? `${kpis.novosClientes.pctNovos}% dos clientes no período · ${mNovos.text}`
          : mNovos.text,
      up: mNovos.up,
    },
  ];

  if (!business?.id) {
    return (
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 text-sm mt-2">Carregue um negócio para ver as métricas.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-4">Carregando dados…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-red-600 text-sm mt-4">{error}</p>
      </div>
    );
  }

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
            {(
              [
                { key: "hoje", label: "Hoje" },
                { key: "7d", label: "7d" },
                { key: "30d", label: "30d" },
                { key: "90d", label: "90d" },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
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

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        {metricCards.map((metric) => (
          <div
            key={metric.label}
            className="bg-white border border-gray-200 rounded-xl p-3 md:p-4 shadow-sm min-w-0"
          >
            <p className="text-[10px] md:text-xs text-gray-500 mb-1 truncate">{metric.label}</p>
            <p className="text-lg md:text-2xl font-bold text-gray-900 mb-0.5 tabular-nums truncate">
              {metric.value}
            </p>
            <p
              className={`text-[10px] md:text-xs font-medium flex items-center gap-0.5 ${
                metric.up ? "text-primary" : "text-red-400"
              }`}
            >
              <span className="material-symbols-outlined text-[10px] md:text-xs">
                {metric.up ? "trending_up" : "trending_down"}
              </span>
              <span className="truncate">{metric.sub}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-4">
        <div className="xl:col-span-5 bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm min-w-0">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Agendamentos por período</h2>
          <div className={period === "30d" ? "overflow-x-auto" : ""}>
            <div className={period === "30d" ? "min-w-[640px]" : ""}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barSeries} barSize={period === "30d" ? 10 : 24}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: tickFill, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={period === "30d" ? 2 : 0}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number | string) => [`${v} agend.`, ""]}
                  />
                  <Bar dataKey="agendamentos" radius={[4, 4, 0, 0]}>
                    {barSeries.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          i === highlightBarIndex
                            ? "#13EC5B"
                            : isDark
                              ? "#213428"
                              : "#d1d5db"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm min-w-0">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Funil (status)</h2>
          <p className="text-[11px] text-gray-500 mb-2">
            Proporção sobre o total de agendamentos no período selecionado.
          </p>
          <div className="space-y-2">
            {funnelData.map((item, i) => (
              <div key={item.step}>
                <div className="flex justify-between items-center mb-0.5 gap-2">
                  <span className="text-xs text-gray-500 truncate">{item.step}</span>
                  <span className="text-xs font-bold text-gray-900 flex-shrink-0">{item.value}</span>
                </div>
                <div className="h-4 bg-gray-100 rounded overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${item.pct}%`,
                      background: `linear-gradient(90deg, #13EC5B ${100 - i * 20}%, #0fc44c)`,
                      opacity: 1 - i * 0.15,
                    }}
                  />
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-gray-900">
                    {item.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm min-w-0">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Evolução de clientes</h2>
          <p className="text-[11px] text-gray-500 mb-2">Últimos 6 meses (com identificação de cliente).</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={clientEvolution} barSize={8}>
              <XAxis
                dataKey="mes"
                tick={{ fill: tickFill, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="novos" fill="#13EC5B" radius={[2, 2, 0, 0]} name="Novos" />
              <Bar dataKey="recorrentes" fill="#3B82F6" radius={[2, 2, 0, 0]} name="Recorrentes" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <div className="size-2 rounded bg-primary shrink-0" /> Novos
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <div className="size-2 rounded bg-blue-400 shrink-0" /> Recorrentes
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm mb-4 overflow-hidden">
        <h2 className="text-sm font-bold text-gray-900 mb-2">Horários mais populares</h2>
        <p className="text-[11px] text-gray-500 mb-3">
          Ranqueados por volume no período selecionado ({period}).
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {popularSlots.length === 0 ? (
            <span className="text-xs text-gray-400">Sem dados de horário neste período.</span>
          ) : (
            popularSlots.map(([label, count]) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"
              >
                <span className="text-primary font-bold tabular-nums">{count}</span>
                <span className="text-gray-600">{label}</span>
              </span>
            ))
          )}
        </div>
        <div className="w-full overflow-x-auto pb-1">
          <div className="min-w-[520px]">
            <div className="flex gap-1 mb-1 pl-14">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="flex-1 min-w-[28px] text-center text-[9px] text-gray-500 tabular-nums"
                >
                  {hour}h
                </div>
              ))}
            </div>
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="flex items-stretch gap-1 mb-1">
                <span className="w-12 shrink-0 text-[10px] text-gray-500 flex items-center justify-end pr-1">
                  {day.slice(0, 3)}
                </span>
                <div className="flex flex-1 gap-1 min-w-0">
                  {HOURS.map((hour) => {
                    const val = getHeatValue(day, hour);
                    const intensity = maxHeat > 0 ? val / maxHeat : 0;
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="flex-1 min-w-[24px] h-7 rounded-sm transition-all cursor-default shrink-0"
                        style={{
                          backgroundColor:
                            intensity === 0
                              ? isDark
                                ? "#213428"
                                : "#e5e7eb"
                              : `rgba(19, 236, 91, ${0.2 + intensity * 0.8})`,
                        }}
                        title={`${day} ${hour}h · ${val} agend.`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 justify-end flex-wrap">
          <span className="text-[10px] text-gray-500">Menos</span>
          <div className="flex gap-0.5">
            {[0.15, 0.35, 0.55, 0.75, 1].map((i) => (
              <div
                key={i}
                className="h-3 w-4 rounded-sm"
                style={{ backgroundColor: `rgba(19, 236, 91, ${i})` }}
              />
            ))}
          </div>
          <span className="text-[10px] text-gray-500">Mais</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Insights automáticos</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div
                  className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 ${insight.color}`}
                >
                  <span className="material-symbols-outlined text-base">{insight.icon}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{insight.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
