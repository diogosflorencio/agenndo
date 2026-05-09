"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, cn } from "@/lib/utils";
import { useAppAlert } from "@/components/app-alert-provider";
import { SwitchToggle } from "@/components/switch-toggle";
import { jsPDF } from "jspdf";

type CommissionSettings = {
  enabled: boolean;
  default_percent: number;
  calculation_base: "gross" | "net";
};

type CollabRow = { id: string; name: string; percent: string };
type ServiceRow = { id: string; name: string };
type RuleRow = { id: string; service_id: string; collaborator_id: string | null; percent: number };
type LineRow = {
  id: string;
  appointment_id: string;
  amount_cents: number;
  percent_applied: number;
  base_amount_cents: number;
  status: "pending" | "approved" | "paid" | "void";
  created_at: string;
  paid_at: string | null;
  approved_at: string | null;
  payout_batch_id: string | null;
  collaborators: { name: string } | null;
  services: { name: string } | null;
  appointments: { date: string; price_cents: number } | null;
  approved_by: string | null;
};

type BatchRow = {
  id: string;
  total_cents: number;
  created_at: string;
  notes: string | null;
  approved_by: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  paid: "Paga",
  void: "Estornada",
};

function localYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CommissionsModule({ businessId, profileId }: { businessId: string; profileId: string }) {
  const { showAlert, showConfirm } = useAppAlert();
  const [section, setSection] = useState<"config" | "lines" | "payouts">("config");
  const [settings, setSettings] = useState<CommissionSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [collabs, setCollabs] = useState<{ id: string; name: string }[]>([]);
  const [collabDefaults, setCollabDefaults] = useState<CollabRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [period, setPeriod] = useState<"day" | "week" | "month" | "custom">("month");
  const [customFrom, setCustomFrom] = useState(() => localYmd(new Date()));
  const [customTo, setCustomTo] = useState(() => localYmd(new Date()));
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCollab, setFilterCollab] = useState<string>("all");

  const [newRule, setNewRule] = useState({ service_id: "", collaborator_id: "", percent: "" });

  const loadSettings = useCallback(async () => {
    if (!businessId) return;
    setSettingsLoading(true);
    const supabase = createClient();
    const { data: s } = await supabase
      .from("business_commission_settings")
      .select("enabled, default_percent, calculation_base")
      .eq("business_id", businessId)
      .maybeSingle();
    if (s) {
      setSettings({
        enabled: s.enabled,
        default_percent: Number(s.default_percent),
        calculation_base: s.calculation_base as "gross" | "net",
      });
    } else {
      setSettings({ enabled: false, default_percent: 0, calculation_base: "gross" });
    }

    const [cRes, svcRes, rRes] = await Promise.all([
      supabase.from("collaborators").select("id, name").eq("business_id", businessId).order("name"),
      supabase.from("services").select("id, name").eq("business_id", businessId).is("archived_at", null).order("name"),
      supabase.from("commission_service_rules").select("id, service_id, collaborator_id, percent").eq("business_id", businessId),
    ]);

    const cl = (cRes.data as { id: string; name: string }[]) ?? [];
    setCollabs(cl);
    const idList = cl.map((c) => c.id);
    const { data: dData } =
      idList.length > 0
        ? await supabase
            .from("commission_collaborator_defaults")
            .select("collaborator_id, percent")
            .in("collaborator_id", idList)
        : { data: [] as { collaborator_id: string; percent: number }[] };
    const defs: CollabRow[] =
      (dData as { collaborator_id: string; percent: number | string }[])?.map((x) => ({
        id: x.collaborator_id,
        name: cl.find((c) => c.id === x.collaborator_id)?.name ?? "?",
        percent: String(Number(x.percent)),
      })) ?? [];
    setCollabDefaults(defs);
    setServices((svcRes.data as ServiceRow[]) ?? []);
    setRules(
      (rRes.data as { id: string; service_id: string; collaborator_id: string | null; percent: number | string }[])?.map(
        (x) => ({
          id: x.id,
          service_id: x.service_id,
          collaborator_id: x.collaborator_id,
          percent: Number(x.percent),
        })
      ) ?? []
    );
    setSettingsLoading(false);
  }, [businessId]);

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    if (period === "day") {
      return { from: localYmd(end), to: localYmd(end) };
    }
    if (period === "week") {
      start.setDate(start.getDate() - 6);
      return { from: localYmd(start), to: localYmd(end) };
    }
    if (period === "month") {
      start.setMonth(start.getMonth() - 1);
      return { from: localYmd(start), to: localYmd(end) };
    }
    return { from: customFrom, to: customTo };
  }, [period, customFrom, customTo]);

  const loadLines = useCallback(async () => {
    if (!businessId) return;
    setLinesLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("appointment_commissions")
      .select(
        "id, collaborator_id, appointment_id, amount_cents, percent_applied, base_amount_cents, status, created_at, paid_at, approved_at, payout_batch_id, approved_by, collaborators(name), services(name), appointments(date, price_cents)"
      )
      .eq("business_id", businessId)
      .gte("created_at", dateRange.from + "T00:00:00")
      .lte("created_at", dateRange.to + "T23:59:59")
      .order("created_at", { ascending: false });

    if (filterStatus !== "all") {
      q = q.eq("status", filterStatus);
    }
    if (filterCollab !== "all") {
      q = q.eq("collaborator_id", filterCollab);
    }

    const { data, error } = await q;
    if (error) {
      showAlert(error.message, { title: "Comissões" });
      setLinesLoading(false);
      return;
    }
    setLines((data ?? []) as unknown as LineRow[]);
    setLinesLoading(false);
  }, [businessId, dateRange.from, dateRange.to, filterStatus, filterCollab, showAlert]);

  const loadBatches = useCallback(async () => {
    if (!businessId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("commission_payout_batches")
      .select("id, total_cents, created_at, notes, approved_by")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(50);
    setBatches((data as BatchRow[]) ?? []);
  }, [businessId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (section === "lines") void loadLines();
  }, [section, loadLines, dateRange.from, dateRange.to, filterStatus, filterCollab, period, customFrom, customTo]);

  useEffect(() => {
    if (section === "payouts") void loadBatches();
  }, [section, loadBatches]);

  const persistSettings = async () => {
    if (!settings || !businessId) return;
    setSavingSettings(true);
    const supabase = createClient();
    const { error } = await supabase.from("business_commission_settings").upsert(
      {
        business_id: businessId,
        enabled: settings.enabled,
        default_percent: settings.default_percent,
        calculation_base: settings.calculation_base,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id" }
    );
    setSavingSettings(false);
    if (error) showAlert(error.message, { title: "Comissões" });
    else showAlert("Configuração salva.", { title: "Comissões" });
  };

  const saveCollabPercent = async (collaboratorId: string, percentStr: string) => {
    const supabase = createClient();
    const n = Number(percentStr.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      showAlert("Percentual entre 0 e 100.", { title: "Comissões" });
      return;
    }
    const { error } = await supabase.from("commission_collaborator_defaults").upsert(
      { collaborator_id: collaboratorId, percent: n },
      { onConflict: "collaborator_id" }
    );
    if (error) showAlert(error.message, { title: "Comissões" });
    else void loadSettings();
  };

  const removeCollabDefault = async (collaboratorId: string) => {
    const supabase = createClient();
    await supabase.from("commission_collaborator_defaults").delete().eq("collaborator_id", collaboratorId);
    void loadSettings();
  };

  const addRule = async () => {
    const supabase = createClient();
    const pct = Number(newRule.percent.replace(",", "."));
    if (!newRule.service_id || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      showAlert("Informe serviço e percentual válido.", { title: "Comissões" });
      return;
    }
    const payload = {
      business_id: businessId,
      service_id: newRule.service_id,
      collaborator_id: newRule.collaborator_id.trim() ? newRule.collaborator_id : null,
      percent: pct,
    };
    const { error } = await supabase.from("commission_service_rules").insert(payload);
    if (error) showAlert(error.message, { title: "Comissões" });
    else {
      setNewRule({ service_id: "", collaborator_id: "", percent: "" });
      void loadSettings();
    }
  };

  const deleteRule = async (id: string) => {
    const ok = await showConfirm({
      title: "Remover regra",
      message: "Remover esta regra de comissão?",
      confirmLabel: "Remover",
      cancelLabel: "Voltar",
      variant: "danger",
    });
    if (!ok) return;
    const supabase = createClient();
    await supabase.from("commission_service_rules").delete().eq("id", id);
    void loadSettings();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectedLines = lines.filter((l) => selected.has(l.id));

  const runApprove = async () => {
    if (selectedLines.length === 0) return;
    const supabase = createClient();
    const now = new Date().toISOString();
    for (const line of selectedLines) {
      if (line.status !== "pending") continue;
      await supabase
        .from("appointment_commissions")
        .update({ status: "approved", approved_at: now, approved_by: profileId })
        .eq("id", line.id)
        .eq("business_id", businessId);
    }
    setSelected(new Set());
    void loadLines();
  };

  const runPay = async (createBatch: boolean) => {
    const payLines = selectedLines.filter((l) => l.status === "pending" || l.status === "approved");
    if (payLines.length === 0) {
      showAlert("Selecione linhas pendentes ou aprovadas.", { title: "Comissões" });
      return;
    }
    const total = payLines.reduce((s, l) => s + Number(l.amount_cents), 0);
    const ok = await showConfirm({
      title: "Registrar pagamento",
      message: `Marcar ${payLines.length} comissão(ões) como pagas (${formatCurrency(total / 100)})?`,
      confirmLabel: "Confirmar",
      cancelLabel: "Voltar",
    });
    if (!ok) return;

    const supabase = createClient();
    const now = new Date().toISOString();
    let batchId: string | null = null;

    if (createBatch && payLines.length > 1) {
      const { data: batch, error: bErr } = await supabase
        .from("commission_payout_batches")
        .insert({
          business_id: businessId,
          total_cents: total,
          approved_by: profileId,
          notes: `Lote ${new Date().toLocaleString("pt-BR")}`,
        })
        .select("id")
        .single();
      if (bErr) {
        showAlert(bErr.message, { title: "Comissões" });
        return;
      }
      batchId = batch?.id ?? null;
    }

    for (const line of payLines) {
      await supabase
        .from("appointment_commissions")
        .update({
          status: "paid",
          paid_at: now,
          approved_at: line.approved_at ?? now,
          approved_by: line.approved_by ?? profileId,
          payout_batch_id: batchId,
        })
        .eq("id", line.id)
        .eq("business_id", businessId);
    }

    setSelected(new Set());
    void loadLines();
    void loadBatches();
  };

  const exportCsvLines = () => {
    const rows = [
      "\uFEFFdata;colaborador;serviço;valor_atendimento;base;percentual;comissão;status",
      ...lines.map((l) =>
        [
          (l.appointments?.date ?? "").slice(0, 10),
          l.collaborators?.name ?? "",
          l.services?.name ?? "",
          ((l.appointments?.price_cents ?? 0) / 100).toFixed(2),
          (l.base_amount_cents / 100).toFixed(2),
          String(l.percent_applied),
          (l.amount_cents / 100).toFixed(2),
          STATUS_LABEL[l.status] ?? l.status,
        ].join(";")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `comissoes-${businessId.slice(0, 8)}-${localYmd(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportPdfSummary = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFontSize(14);
    doc.text("Relatório de comissões — Agenndo", 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${dateRange.from} a ${dateRange.to}`, 14, 26);
    let y = 34;
    lines.slice(0, 40).forEach((l) => {
      const line = `${(l.appointments?.date ?? "").slice(0, 10)} | ${l.collaborators?.name ?? "-"} | ${formatCurrency(l.amount_cents / 100)} | ${STATUS_LABEL[l.status] ?? l.status}`;
      doc.text(line.substring(0, 110), 14, y);
      y += 6;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save(`comissoes-${localYmd(new Date())}.pdf`);
  };

  const rankingByCollab = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) {
      if (l.status === "void") continue;
      const name = l.collaborators?.name ?? "?";
      m.set(name, (m.get(name) ?? 0) + Number(l.amount_cents));
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [lines]);

  if (settingsLoading || !settings) {
    return (
      <div className="flex justify-center py-16">
        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {(
          [
            { key: "config" as const, label: "Configuração" },
            { key: "lines" as const, label: "Lançamentos" },
            { key: "payouts" as const, label: "Histórico de lotes" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSection(t.key)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all",
              section === t.key ? "bg-primary text-black" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === "config" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Módulo de comissões</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Desligado: o sistema segue como hoje, sem lançar comissões. Ligado: cada “compareceu” gera uma linha
                  congelada.
                </p>
              </div>
              <SwitchToggle
                checked={settings.enabled}
                onChange={() => setSettings((s) => (s ? { ...s, enabled: !s.enabled } : s))}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-xs font-medium text-gray-600">
                Percentual padrão (%)
                <input
                  type="text"
                  inputMode="decimal"
                  value={String(settings.default_percent)}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, default_percent: Number(e.target.value.replace(",", ".")) || 0 } : s
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900"
                />
              </label>
              <label className="block text-xs font-medium text-gray-600">
                Base de cálculo
                <select
                  value={settings.calculation_base}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, calculation_base: e.target.value as "gross" | "net" } : s
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900"
                >
                  <option value="gross">Bruto (valor cobrado no atendimento)</option>
                  <option value="net">Líquido (valor − taxas de gateway / MP)</option>
                </select>
              </label>
            </div>
            <p className="text-[11px] text-gray-500">
              Base líquida usa o campo de taxas no agendamento (`processor_fee_cents`). Enquanto não houver integração
              automática, você pode ajustar esse valor manualmente no banco ou em fluxos futuros.
            </p>
            <button
              type="button"
              disabled={savingSettings}
              onClick={() => void persistSettings()}
              className="px-4 py-2.5 rounded-xl bg-primary text-black font-bold text-sm disabled:opacity-50"
            >
              {savingSettings ? "Salvando…" : "Salvar configuração"}
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Por colaborador (opcional)</h2>
            <p className="text-xs text-gray-500 mb-4">
              Sobrescreve o percentual padrão para quem estiver listado. Regras por serviço abaixo têm prioridade maior.
            </p>
            <div className="space-y-3">
              {collabs.map((c) => {
                const row = collabDefaults.find((x) => x.id === c.id);
                return (
                  <div key={c.id} className="flex flex-wrap items-end gap-2">
                    <span className="text-sm text-gray-800 min-w-[10rem]">{c.name}</span>
                    <input
                      placeholder="%"
                      defaultValue={row?.percent ?? ""}
                      id={`cd-${c.id}`}
                      className="w-24 rounded-lg border border-gray-200 px-2 py-2 text-sm"
                    />
                    <button
                      type="button"
                      className="text-xs font-bold text-primary"
                      onClick={() => {
                        const el = document.getElementById(`cd-${c.id}`) as HTMLInputElement | null;
                        void saveCollabPercent(c.id, el?.value ?? "");
                      }}
                    >
                      Salvar
                    </button>
                    {row ? (
                      <button type="button" className="text-xs text-gray-500" onClick={() => void removeCollabDefault(c.id)}>
                        Remover
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Regras por serviço (e opcionalmente por colaborador)</h2>
            <p className="text-xs text-gray-500 mb-4">
              Ordem de prioridade: serviço+colaborador → colaborador acima → só serviço → padrão do negócio.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                value={newRule.service_id}
                onChange={(e) => setNewRule((r) => ({ ...r, service_id: e.target.value }))}
                className="rounded-xl border border-gray-200 px-2 py-2 text-sm min-w-[10rem]"
              >
                <option value="">Serviço…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={newRule.collaborator_id}
                onChange={(e) => setNewRule((r) => ({ ...r, collaborator_id: e.target.value }))}
                className="rounded-xl border border-gray-200 px-2 py-2 text-sm min-w-[10rem]"
              >
                <option value="">Todos colaboradores</option>
                {collabs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="%"
                value={newRule.percent}
                onChange={(e) => setNewRule((r) => ({ ...r, percent: e.target.value }))}
                className="w-24 rounded-xl border border-gray-200 px-2 py-2 text-sm"
              />
              <button type="button" onClick={() => void addRule()} className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold">
                Adicionar regra
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {rules.map((r) => {
                const svc = services.find((s) => s.id === r.service_id)?.name ?? r.service_id;
                const col = r.collaborator_id ? collabs.find((c) => c.id === r.collaborator_id)?.name ?? "?" : "Todos";
                return (
                  <div key={r.id} className="flex justify-between items-center py-2 text-sm">
                    <span>
                      {svc} · {col} · <strong>{r.percent}%</strong>
                    </span>
                    <button type="button" className="text-red-600 text-xs font-semibold" onClick={() => void deleteRule(r.id)}>
                      Excluir
                    </button>
                  </div>
                );
              })}
              {rules.length === 0 ? <p className="text-xs text-gray-400 py-2">Nenhuma regra específica.</p> : null}
            </div>
          </div>
        </div>
      )}

      {section === "lines" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-wrap gap-2 items-center">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="day">Hoje</option>
              <option value="week">Últimos 7 dias</option>
              <option value="month">Último mês</option>
              <option value="custom">Intervalo</option>
            </select>
            {period === "custom" ? (
              <>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-xl border border-gray-200 px-2 py-2 text-sm"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-xl border border-gray-200 px-2 py-2 text-sm"
                />
              </>
            ) : null}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="all">Todos status</option>
              <option value="pending">Pendente</option>
              <option value="approved">Aprovada</option>
              <option value="paid">Paga</option>
              <option value="void">Estornada</option>
            </select>
            <select
              value={filterCollab}
              onChange={(e) => setFilterCollab(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="all">Todos colaboradores</option>
              {collabs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void loadLines()}
              className="ml-auto px-3 py-2 rounded-xl bg-gray-100 text-sm font-semibold"
            >
              Atualizar
            </button>
          </div>

          {rankingByCollab.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Ranking no período (filtrado)</h3>
              <div className="flex flex-wrap gap-3">
                {rankingByCollab.map(([name, cents], i) => (
                  <div key={name} className="text-sm">
                    <span className="text-gray-400 mr-1">{i + 1}.</span>
                    <span className="font-semibold text-gray-900">{name}</span>{" "}
                    <span className="text-primary font-bold">{formatCurrency(cents / 100)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!settings.enabled}
              onClick={() => void runApprove()}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold disabled:opacity-40"
            >
              Aprovar selecionadas
            </button>
            <button
              type="button"
              disabled={!settings.enabled}
              onClick={() => void runPay(false)}
              className="px-3 py-2 rounded-xl bg-primary text-black text-sm font-bold disabled:opacity-40"
            >
              Marcar pagas
            </button>
            <button
              type="button"
              disabled={!settings.enabled}
              onClick={() => void runPay(true)}
              className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40"
            >
              Marcar pagas (lote)
            </button>
            <button type="button" onClick={exportCsvLines} className="px-3 py-2 rounded-xl border text-sm font-semibold ml-auto">
              CSV
            </button>
            <button type="button" onClick={exportPdfSummary} className="px-3 py-2 rounded-xl border text-sm font-semibold">
              PDF
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="divide-y divide-gray-100">
              {linesLoading ? (
                <div className="p-8 flex justify-center">
                  <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : lines.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  {settings.enabled
                    ? "Nenhuma comissão neste filtro. Marque atendimentos como compareceu para gerar linhas."
                    : "Ative o módulo na aba Configuração para começar a registrar comissões."}
                </div>
              ) : (
                lines.map((l) => (
                  <label
                    key={l.id}
                    className="flex flex-wrap items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(l.id)}
                      onChange={() => toggleSelect(l.id)}
                      className="rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-[12rem]">
                      <p className="text-sm font-medium text-gray-900">{l.collaborators?.name ?? "-"}</p>
                      <p className="text-xs text-gray-500">
                        {l.services?.name ?? "-"} · {(l.appointments?.date ?? "").slice(0, 10)} · atend.{" "}
                        {formatCurrency((l.appointments?.price_cents ?? 0) / 100)}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-500 text-xs">{l.percent_applied}% sobre base {formatCurrency(l.base_amount_cents / 100)}</p>
                      <p className="font-bold text-gray-900">{formatCurrency(l.amount_cents / 100)}</p>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                          l.status === "paid"
                            ? "bg-primary/15 text-primary"
                            : l.status === "void"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-amber-100 text-amber-800"
                        )}
                      >
                        {STATUS_LABEL[l.status] ?? l.status}
                      </span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {section === "payouts" && (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {batches.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">Nenhum lote registrado ainda.</p>
          ) : (
            batches.map((b) => (
              <div key={b.id} className="p-4 flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{new Date(b.created_at).toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-gray-500">
                    Registrado por perfil {b.approved_by ? `${b.approved_by.slice(0, 8)}…` : "—"} · {b.notes ?? ""}
                  </p>
                </div>
                <p className="text-sm font-bold text-primary">{formatCurrency(b.total_cents / 100)}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
