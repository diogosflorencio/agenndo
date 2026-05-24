"use client";

import { useState, useEffect, useCallback, useMemo, useLayoutEffect, useRef } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";
import { getDashboardSurfaces } from "@/lib/dashboard-surfaces";
import { recalcClientTotalSpent } from "@/lib/appointment-finance";
import { recalculateCommissionAmountForAppointment } from "@/lib/commission-sync";
import { CommissionsModule } from "@/components/dashboard/commissions-module";
import { useAppAlert } from "@/components/app-alert-provider";
import {
  DashboardFullScreenOverlay,
  useFullScreenOverlayRequestClose,
} from "@/components/dashboard/dashboard-full-screen-overlay";
import { HotkeyHint, useRegisterDashboardHotkeys } from "@/lib/dashboard-hotkeys";

type RecordRow = {
  id: string;
  appointment_id: string | null;
  date: string;
  client_id: string | null;
  client_name: string | null;
  service_name: string | null;
  collaborator_name: string | null;
  amount_cents: number;
  paid: boolean;
};

type ClientOption = { id: string; name: string };

const PIE_COLORS = ["#13EC5B", "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B"];

/** Data local YYYY-MM-DD (alinha com `date` dos lançamentos). */
function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseReaisToCents(value: string): number | null {
  const t = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function uniqueClientIdsForRecalc(a: string | null | undefined, b: string | null | undefined): string[] {
  const out: string[] = [];
  if (a) out.push(a);
  if (b && b !== a) out.push(b);
  return out;
}

async function recalcClientIds(supabase: ReturnType<typeof createClient>, ids: string[]) {
  for (const id of ids) {
    const r = await recalcClientTotalSpent(supabase, id);
    if (r.error) return r;
  }
  return {};
}

function FinanceManualModalFooter({ saving }: { saving: boolean }) {
  const requestClose = useFullScreenOverlayRequestClose();
  const { theme } = useTheme();
  const surfaces = getDashboardSurfaces(theme === "dark");
  return (
    <>
      <button
        type="button"
        disabled={saving}
        onClick={() => void requestClose()}
        className={cn(
          "relative inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 pr-4 text-sm font-semibold transition-colors disabled:opacity-50 sm:w-auto sm:min-w-[140px] lg:pr-[4.75rem]",
          surfaces.btnSecondary
        )}
      >
        <span className="flex min-w-0 flex-1 justify-center">Cancelar</span>
        <HotkeyHint action="cancel" layout="floating-end" />
      </button>
      <button
        type="submit"
        form="finance-manual-add-form"
        disabled={saving}
        className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 pr-4 text-sm font-bold text-black transition-colors hover:opacity-90 disabled:opacity-50 sm:min-w-[180px] sm:w-auto lg:pr-[4.75rem]"
      >
        <span className="flex min-w-0 flex-1 justify-center">{saving ? "Salvando…" : "Salvar"}</span>
        {!saving ? <HotkeyHint action="save" variant="primary" layout="floating-end" /> : null}
      </button>
    </>
  );
}

function FinanceEditModalFooter({ saving }: { saving: boolean }) {
  const requestClose = useFullScreenOverlayRequestClose();
  const { theme } = useTheme();
  const surfaces = getDashboardSurfaces(theme === "dark");
  return (
    <>
      <button
        type="button"
        disabled={saving}
        onClick={() => void requestClose()}
        className={cn(
          "relative inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 pr-4 text-sm font-semibold transition-colors disabled:opacity-50 sm:w-auto sm:min-w-[140px] lg:pr-[4.75rem]",
          surfaces.btnSecondary
        )}
      >
        <span className="flex min-w-0 flex-1 justify-center">Cancelar</span>
        <HotkeyHint action="cancel" layout="floating-end" />
      </button>
      <button
        type="submit"
        form="finance-edit-record-form"
        disabled={saving}
        className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 pr-4 text-sm font-bold text-black transition-colors hover:opacity-90 disabled:opacity-50 sm:min-w-[200px] sm:w-auto lg:pr-[4.75rem]"
      >
        <span className="flex min-w-0 flex-1 justify-center">{saving ? "Salvando…" : "Salvar alterações"}</span>
        {!saving ? <HotkeyHint action="save" variant="primary" layout="floating-end" /> : null}
      </button>
    </>
  );
}

export default function FinanceiroPage() {
  const { showAlert, showConfirm } = useAppAlert();
  const { theme } = useTheme();
  const { business, profile } = useDashboard();
  const [financeTab, setFinanceTab] = useState<"revenue" | "commissions">("revenue");
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    client_id: "",
    client_name: "",
    service_name: "",
    collaborator_name: "",
    amount: "",
    paid: true,
  });
  const [editingRecord, setEditingRecord] = useState<RecordRow | null>(null);
  const [editForm, setEditForm] = useState({
    date: "",
    client_id: "",
    client_name: "",
    service_name: "",
    collaborator_name: "",
    amount: "",
    paid: true,
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isDark = theme === "dark";
  const surfaces = getDashboardSurfaces(isDark);
  const tooltipStyle = isDark
    ? { background: "#0f1c15", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }
    : { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" };

  const loadRecords = useCallback(() => {
    if (!business?.id) return;
    setLoading(true);
    const supabase = createClient();
    const start = new Date();
    start.setMonth(start.getMonth() - 14);
    void Promise.all([
      supabase
        .from("financial_records")
        .select("id, appointment_id, date, client_id, client_name, service_name, collaborator_name, amount_cents, paid")
        .eq("business_id", business.id)
        .gte("date", start.toISOString().slice(0, 10))
        .order("date", { ascending: false }),
      supabase.from("clients").select("id, name").eq("business_id", business.id).order("name"),
    ]).then(([recRes, cliRes]) => {
      if (!recRes.error) setRecords((recRes.data as RecordRow[]) ?? []);
      if (!cliRes.error) setClients((cliRes.data as ClientOption[]) ?? []);
      setLoading(false);
    });
  }, [business?.id]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useRegisterDashboardHotkeys(
    financeTab === "revenue" && !showAddModal && !editingRecord && !!business?.id,
    "financeiro-novo",
    {
      novo: () => setShowAddModal(true),
    }
  );

  const manualFormRef = useRef(manualForm);
  manualFormRef.current = manualForm;

  const manualPrevOpenRef = useRef(false);
  const manualBaselineRef = useRef("");
  const manualBaselineReadyRef = useRef(false);
  useLayoutEffect(() => {
    if (!showAddModal) {
      manualBaselineReadyRef.current = false;
    } else if (!manualPrevOpenRef.current) {
      manualBaselineRef.current = JSON.stringify(manualFormRef.current);
      manualBaselineReadyRef.current = true;
    }
    manualPrevOpenRef.current = showAddModal;
  }, [showAddModal]);

  const manualDirty =
    showAddModal &&
    manualBaselineReadyRef.current &&
    JSON.stringify(manualForm) !== manualBaselineRef.current;

  const editFormRef = useRef(editForm);
  editFormRef.current = editForm;

  const editPrevIdRef = useRef<string | null>(null);
  const editBaselineRef = useRef("");
  const editBaselineReadyRef = useRef(false);
  useLayoutEffect(() => {
    const id = editingRecord?.id ?? null;
    if (!id) {
      editPrevIdRef.current = null;
      editBaselineReadyRef.current = false;
      return;
    }
    if (editPrevIdRef.current !== id) {
      editPrevIdRef.current = id;
      editBaselineRef.current = JSON.stringify(editFormRef.current);
      editBaselineReadyRef.current = true;
    }
  }, [editingRecord?.id]);

  const editDirty =
    !!editingRecord &&
    editBaselineReadyRef.current &&
    JSON.stringify(editForm) !== editBaselineRef.current;

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
    const name = r.collaborator_name ?? "-";
    byCollab[name] = (byCollab[name] ?? 0) + Number(r.amount_cents);
  });
  const COLLAB_REVENUE = Object.entries(byCollab).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

  const revenueChartData = useMemo(() => {
    const sumBetween = (from: string, to: string) =>
      records
        .filter((r) => r.date >= from && r.date <= to)
        .reduce((s, r) => s + Number(r.amount_cents), 0);

    if (period === "day") {
      const out: { key: string; label: string; receita: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const ymd = localYmd(d);
        out.push({
          key: ymd,
          label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          receita: sumBetween(ymd, ymd),
        });
      }
      return out;
    }

    if (period === "week") {
      const out: { key: string; label: string; receita: number }[] = [];
      for (let w = 7; w >= 0; w--) {
        const end = new Date();
        end.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - w * 7);
        const startD = new Date(end);
        startD.setDate(startD.getDate() - 6);
        const from = localYmd(startD);
        const to = localYmd(end);
        out.push({
          key: `${from}_${to}`,
          label: `${startD.getDate()}/${startD.getMonth() + 1}–${end.getDate()}/${end.getMonth() + 1}`,
          receita: sumBetween(from, to),
        });
      }
      return out;
    }

    const out: { key: string; label: string; receita: number }[] = [];
    for (let m = 11; m >= 0; m--) {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      d.setMonth(d.getMonth() - m);
      const y = d.getFullYear();
      const mo = d.getMonth();
      const receita = records
        .filter((r) => {
          const [ry, rm, rd] = r.date.split("-").map(Number);
          if (!ry || !rm || !rd) return false;
          return ry === y && rm - 1 === mo;
        })
        .reduce((s, r) => s + Number(r.amount_cents), 0);
      out.push({
        key: `${y}-${String(mo + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        receita,
      });
    }
    return out;
  }, [records, period]);

  const chartXAxisInterval = period === "day" ? 2 : period === "week" ? 0 : 1;

  const openEditRecord = (r: RecordRow) => {
    setEditingRecord(r);
    setEditError(null);
    setEditForm({
      date: r.date.slice(0, 10),
      client_id: r.client_id ?? "",
      client_name: r.client_name ?? "",
      service_name: r.service_name ?? "",
      collaborator_name: r.collaborator_name ?? "",
      amount: (r.amount_cents / 100).toFixed(2).replace(".", ","),
      paid: r.paid,
    });
  };

  const handleDeleteRecord = async (r: RecordRow) => {
    if (!business?.id) return;
    const extra = r.appointment_id
      ? "\n\nObs.: este valor veio de um agendamento (compareceu). O agendamento continua marcado; só o lançamento financeiro some."
      : "";
    const ok = await showConfirm({
      title: "Excluir lançamento",
      message: `Excluir este lançamento?${extra}`,
      confirmLabel: "Excluir",
      cancelLabel: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;
    setDeletingId(r.id);
    const supabase = createClient();
    const { error } = await supabase.from("financial_records").delete().eq("id", r.id);
    if (error) {
      showAlert(error.message, { title: "Financeiro" });
      setDeletingId(null);
      return;
    }
    if (r.client_id) {
      const rec = await recalcClientIds(supabase, [r.client_id]);
      if (rec.error) showAlert(rec.error, { title: "Financeiro" });
    }
    setDeletingId(null);
    loadRecords();
  };

  const submitManualAdd = useCallback(async (): Promise<boolean> => {
    if (!business?.id) return false;
    const cents = parseReaisToCents(manualForm.amount);
    if (cents == null || cents <= 0) {
      setManualError("Informe um valor válido (ex.: 120 ou 120,50).");
      return false;
    }
    setManualError(null);
    setManualSaving(true);
    const supabase = createClient();
    const cid = manualForm.client_id.trim();
    const { error } = await supabase.from("financial_records").insert({
      business_id: business.id,
      appointment_id: null,
      client_id: cid || null,
      date: manualForm.date,
      client_name: manualForm.client_name.trim() || null,
      service_name: manualForm.service_name.trim() || null,
      collaborator_name: manualForm.collaborator_name.trim() || null,
      amount_cents: cents,
      paid: manualForm.paid,
    });
    setManualSaving(false);
    if (error) {
      setManualError(error.message);
      return false;
    }
    if (cid) {
      const rMan = await recalcClientIds(supabase, [cid]);
      if (rMan.error) {
        setManualError(rMan.error);
        loadRecords();
        return false;
      }
    }
    setShowAddModal(false);
    setManualForm({
      date: new Date().toISOString().slice(0, 10),
      client_id: "",
      client_name: "",
      service_name: "",
      collaborator_name: "",
      amount: "",
      paid: true,
    });
    loadRecords();
    return true;
  }, [business?.id, manualForm, loadRecords]);

  const submitEditRecord = useCallback(async (): Promise<boolean> => {
    if (!business?.id || !editingRecord) return false;
    const cents = parseReaisToCents(editForm.amount);
    if (cents == null || cents <= 0) {
      setEditError("Informe um valor válido (ex.: 120 ou 120,50).");
      return false;
    }
    setEditSaving(true);
    setEditError(null);
    const supabase = createClient();
    const newCid = editForm.client_id.trim() || null;
    const oldCid = editingRecord.client_id;
    const { error } = await supabase
      .from("financial_records")
      .update({
        date: editForm.date,
        client_id: newCid,
        client_name: editForm.client_name.trim() || null,
        service_name: editForm.service_name.trim() || null,
        collaborator_name: editForm.collaborator_name.trim() || null,
        amount_cents: cents,
        paid: editForm.paid,
      })
      .eq("id", editingRecord.id);
    if (error) {
      setEditError(error.message);
      setEditSaving(false);
      return false;
    }
    if (editingRecord.appointment_id) {
      await supabase
        .from("appointments")
        .update({ price_cents: cents })
        .eq("id", editingRecord.appointment_id)
        .eq("business_id", business.id);
      const rc = await recalculateCommissionAmountForAppointment({
        supabase,
        businessId: business.id,
        appointmentId: editingRecord.appointment_id,
      });
      if ("error" in rc && rc.error) {
        setEditError(rc.error);
        setEditSaving(false);
        return false;
      }
    }
    const ids = uniqueClientIdsForRecalc(oldCid, newCid);
    let recalcErr: string | undefined;
    if (ids.length) {
      const rec = await recalcClientIds(supabase, ids);
      recalcErr = rec.error;
      if (rec.error) setEditError(rec.error);
    }
    setEditSaving(false);
    loadRecords();
    if (recalcErr) return false;
    setEditingRecord(null);
    return true;
  }, [business?.id, editingRecord, editForm, loadRecords]);

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
          <h1 className={cn("text-2xl font-bold", surfaces.title)}>Financeiro</h1>
          <p className={cn("text-sm mt-1", surfaces.subtitle)}>Acompanhe sua receita e pagamentos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn("flex gap-1 p-1 rounded-xl mr-1 border", isDark ? "bg-white/5 border-white/10" : "bg-gray-100 border-gray-200")}>
            <button
              type="button"
              onClick={() => setFinanceTab("revenue")}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-bold transition-all",
                financeTab === "revenue"
                  ? cn(isDark ? "bg-white/10 text-white" : "bg-white shadow-sm text-gray-900")
                  : cn(surfaces.subtitle, isDark ? "hover:text-white" : "hover:text-gray-900")
              )}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => setFinanceTab("commissions")}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-bold transition-all",
                financeTab === "commissions"
                  ? cn(isDark ? "bg-white/10 text-white" : "bg-white shadow-sm text-gray-900")
                  : cn(surfaces.subtitle, isDark ? "hover:text-white" : "hover:text-gray-900")
              )}
            >
              Comissões
            </button>
          </div>
          {financeTab === "revenue" ? (
            <>
              <button
                type="button"
                onClick={exportCsv}
                className={cn("px-3 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5 border", surfaces.btnSecondary)}
              >
                <span className="material-symbols-outlined text-base">download</span>
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)]"
              >
                <span className="material-symbols-outlined shrink-0 text-base">add</span>
                <span className="min-w-0 flex-1 text-left">Entrada manual</span>
                <HotkeyHint action="novo" variant="primary" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {financeTab === "commissions" && business?.id && profile?.id ? (
        <CommissionsModule businessId={business.id} profileId={profile.id} />
      ) : null}

      {financeTab === "revenue" ? (
        <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Hoje", value: formatCurrency(todayTotal / 100), sub: `${records.filter((r) => r.date === todayStr).length} atend.`, color: "text-gray-900" },
          { label: "Esta semana", value: formatCurrency(weekTotal / 100), sub: "Últimos 7 dias", color: "text-gray-900" },
          { label: "Este mês", value: formatCurrency(totalMonth / 100), sub: "Receita bruta", color: "text-primary" },
          { label: "Pendente", value: formatCurrency(pendingMonth / 100), sub: "A receber", color: "text-yellow-600" },
        ].map((card) => (
          <div key={card.label} className={cn(surfaces.panel, "p-4")}>
            <p className={cn("text-xs mb-2", surfaces.muted)}>{card.label}</p>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            <p className={cn("text-xs mt-1", surfaces.muted)}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Period toggle + chart */}
      <div className={cn(surfaces.panel, "p-5 mb-6")}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={cn("text-sm font-bold", surfaces.title)}>Receita</h2>
          <div className={cn("flex gap-1 p-1 rounded-lg", isDark ? "bg-white/5" : "bg-gray-100")}>
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

        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={revenueChartData} margin={{ bottom: 8, left: 4, right: 8 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: "#6b7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={chartXAxisInterval}
              angle={period === "month" ? 0 : -28}
              textAnchor={period === "month" ? "middle" : "end"}
              height={period === "month" ? 28 : 52}
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
        <div className={cn(surfaces.panel, "p-5")}>
          <h2 className={cn("text-sm font-bold mb-4", surfaces.title)}>Por serviço</h2>
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
        <div className={cn(surfaces.panel, "p-5")}>
          <h2 className={cn("text-sm font-bold mb-4", surfaces.title)}>Por colaborador</h2>
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
      <div className={cn(surfaces.panel, "overflow-hidden")}>
        <div className={cn("flex items-center justify-between p-4 border-b", isDark ? "border-white/10" : "border-gray-200")}>
          <h2 className={cn("text-sm font-bold", surfaces.title)}>Entradas</h2>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
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
              <div
                key={record.id}
                className="flex flex-wrap items-center gap-3 sm:gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0 basis-[min(100%,12rem)]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-gray-900 text-sm font-medium truncate">{record.client_name ?? "-"}</p>
                    {record.appointment_id && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        Agendamento
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{record.service_name ?? "-"} · {record.collaborator_name ?? "-"}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">{new Date(record.date).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-auto sm:ml-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${record.paid ? "bg-primary/10 text-primary" : "bg-yellow-400/10 text-yellow-400"}`}
                  >
                    {record.paid ? "Pago" : "Pendente"}
                  </span>
                  <span className="text-sm font-bold text-gray-900 tabular-nums min-w-[4.5rem] text-right">
                    {formatCurrency(record.amount_cents / 100)}
                  </span>
                  <div className="flex items-center gap-0.5 border-l border-gray-200 pl-2 ml-1">
                    <button
                      type="button"
                      onClick={() => openEditRecord(record)}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                      aria-label="Editar lançamento"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === record.id}
                      onClick={() => void handleDeleteRecord(record)}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                      aria-label="Excluir lançamento"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
        </>
      ) : null}

      {showAddModal && (
        <DashboardFullScreenOverlay
          title="Entrada manual"
          subtitle='Registre um valor sem vínculo com agendamento. Se escolher um cliente cadastrado e marcar "Já pago", o total gasto dele é atualizado.'
          onClose={() => !manualSaving && setShowAddModal(false)}
          closeOnEscape={!manualSaving}
          closeBlocked={manualSaving}
          dirty={manualDirty}
          onSaveBeforeClose={submitManualAdd}
          hotkeys={{
            save: () => {
              if (manualSaving) return;
              const el = document.getElementById("finance-manual-add-form");
              if (el instanceof HTMLFormElement) el.requestSubmit();
            },
          }}
          banner={
            manualError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {manualError}
              </div>
            ) : undefined
          }
          footer={<FinanceManualModalFooter saving={manualSaving} />}
        >
          <form
            id="finance-manual-add-form"
            className={cn(surfaces.panel, "overflow-hidden")}
            onSubmit={(e) => {
              e.preventDefault();
              void submitManualAdd();
            }}
          >
            <div className={cn(surfaces.accentCard, "p-5 border-b", isDark ? "border-white/[0.06] rounded-none" : "border-gray-100 rounded-none")}>
              <div className="flex items-start gap-3">
                <div className="size-11 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-2xl">payments</span>
                </div>
                <div className="min-w-0">
                  <p className={cn("text-sm font-bold", surfaces.accentCardTitle)}>Novo lançamento avulso</p>
                  <p className={cn("text-xs mt-1 leading-relaxed", surfaces.accentCardBody)}>
                    Use para vendas, gorjetas ou receitas fora da agenda. Campos opcionais ajudam a organizar relatórios.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              <section>
                <h3 className={cn("text-[11px] font-bold uppercase tracking-wide mb-3", surfaces.muted)}>Valor e data</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={cn("block text-xs font-medium", surfaces.label)}>
                    Data
                    <input
                      type="date"
                      required
                      value={manualForm.date}
                      onChange={(e) => setManualForm((f) => ({ ...f, date: e.target.value }))}
                      className={cn("mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary", surfaces.input)}
                    />
                  </label>
                  <label className={cn("block text-xs font-medium", surfaces.label)}>
                    Valor (R$)
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="ex.: 150 ou 150,50"
                      value={manualForm.amount}
                      onChange={(e) => setManualForm((f) => ({ ...f, amount: e.target.value }))}
                      className={cn("mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary", surfaces.input)}
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3 className={cn("text-[11px] font-bold uppercase tracking-wide mb-3", surfaces.muted)}>Cliente</h3>
                <div className={cn(surfaces.cardInset, "p-4 space-y-4")}>
                  <label className={cn("block text-xs font-medium", surfaces.label)}>
                    Cliente cadastrado (opcional)
                    <select
                      value={manualForm.client_id}
                      onChange={(e) => {
                        const v = e.target.value;
                        const c = clients.find((x) => x.id === v);
                        setManualForm((f) => ({
                          ...f,
                          client_id: v,
                          client_name: c ? c.name : f.client_name,
                        }));
                      }}
                      className={cn("mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary", surfaces.input)}
                    >
                      <option value="">(nenhum)</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={cn("block text-xs font-medium", surfaces.label)}>
                    Nome no lançamento (opcional)
                    <input
                      type="text"
                      value={manualForm.client_name}
                      onChange={(e) => setManualForm((f) => ({ ...f, client_name: e.target.value }))}
                      placeholder="Texto livre se não usar cliente acima"
                      className={cn("mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary", surfaces.input)}
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3 className={cn("text-[11px] font-bold uppercase tracking-wide mb-3", surfaces.muted)}>Detalhes do atendimento</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={cn("block text-xs font-medium", surfaces.label)}>
                    Serviço (opcional)
                    <input
                      type="text"
                      value={manualForm.service_name}
                      onChange={(e) => setManualForm((f) => ({ ...f, service_name: e.target.value }))}
                      placeholder="Ex.: Corte, barba, pacote…"
                      className={cn("mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary", surfaces.input)}
                    />
                  </label>
                  <label className={cn("block text-xs font-medium", surfaces.label)}>
                    Colaborador (opcional)
                    <input
                      type="text"
                      value={manualForm.collaborator_name}
                      onChange={(e) => setManualForm((f) => ({ ...f, collaborator_name: e.target.value }))}
                      placeholder="Quem realizou o atendimento"
                      className={cn("mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary", surfaces.input)}
                    />
                  </label>
                </div>
              </section>

              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                  manualForm.paid
                    ? cn(surfaces.accentSelected, "border")
                    : cn(surfaces.cardInset, "hover:border-primary/20")
                )}
              >
                <input
                  type="checkbox"
                  checked={manualForm.paid}
                  onChange={(e) => setManualForm((f) => ({ ...f, paid: e.target.checked }))}
                  className="size-4 rounded border-gray-300 accent-primary"
                />
                <div>
                  <p className={cn("text-sm font-semibold", surfaces.title)}>Já pago</p>
                  <p className={cn("text-xs mt-0.5", surfaces.muted)}>
                    Atualiza o total gasto do cliente cadastrado quando marcado.
                  </p>
                </div>
              </label>
            </div>
          </form>
        </DashboardFullScreenOverlay>
      )}

      {editingRecord && (
        <DashboardFullScreenOverlay
          title="Editar lançamento"
          subtitle='Marque "Já pago" quando receber; o total gasto do cliente (se houver cadastro) é recalculado.'
          onClose={() => !editSaving && setEditingRecord(null)}
          closeOnEscape={!editSaving}
          closeBlocked={editSaving}
          dirty={editDirty}
          onSaveBeforeClose={submitEditRecord}
          hotkeys={{
            save: () => {
              if (editSaving) return;
              const el = document.getElementById("finance-edit-record-form");
              if (el instanceof HTMLFormElement) el.requestSubmit();
            },
          }}
          banner={
            editError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{editError}</div>
            ) : undefined
          }
          footer={<FinanceEditModalFooter saving={editSaving} />}
        >
          <div className={cn(surfaces.panel, "p-5 sm:p-6 space-y-4")}>
            {editingRecord.appointment_id ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Ligado a um agendamento. Ao alterar o valor, o preço do agendamento é atualizado para manter o mesmo
                número.
              </p>
            ) : null}
            <form
              id="finance-edit-record-form"
              onSubmit={(e) => {
                e.preventDefault();
                void submitEditRecord();
              }}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <label className={cn("block text-xs font-medium", surfaces.label)}>
                  Data
                  <input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                    className={cn("mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary", surfaces.input)}
                  />
                </label>
                <label className={cn("block text-xs font-medium", surfaces.label)}>
                  Valor (R$)
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={editForm.amount}
                    onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                    className={cn("mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary", surfaces.input)}
                  />
                </label>
                <label className={cn("block text-xs font-medium lg:col-span-2", surfaces.label)}>
                  Cliente cadastrado (opcional)
                  <select
                    value={editForm.client_id}
                    onChange={(e) => {
                      const v = e.target.value;
                      const c = clients.find((x) => x.id === v);
                      setEditForm((f) => ({
                        ...f,
                        client_id: v,
                        client_name: c ? c.name : f.client_name,
                      }));
                    }}
                    className={cn("mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary", surfaces.input)}
                  >
                    <option value="">(nenhum)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={cn("block text-xs font-medium lg:col-span-2", surfaces.label)}>
                  Nome no lançamento (opcional)
                  <input
                    type="text"
                    value={editForm.client_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, client_name: e.target.value }))}
                    className={cn("mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary", surfaces.input)}
                  />
                </label>
                <label className={cn("block text-xs font-medium", surfaces.label)}>
                  Serviço (opcional)
                  <input
                    type="text"
                    value={editForm.service_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, service_name: e.target.value }))}
                    className={cn("mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary", surfaces.input)}
                  />
                </label>
                <label className={cn("block text-xs font-medium", surfaces.label)}>
                  Colaborador (opcional)
                  <input
                    type="text"
                    value={editForm.collaborator_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, collaborator_name: e.target.value }))}
                    className={cn("mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary", surfaces.input)}
                  />
                </label>
              </div>
              <label className={cn("mt-5 flex cursor-pointer items-center gap-2 text-sm", surfaces.label)}>
                <input
                  type="checkbox"
                  checked={editForm.paid}
                  onChange={(e) => setEditForm((f) => ({ ...f, paid: e.target.checked }))}
                  className="rounded border-gray-300 accent-primary"
                />
                Já pago
              </label>
            </form>
          </div>
        </DashboardFullScreenOverlay>
      )}
    </div>
  );
}
