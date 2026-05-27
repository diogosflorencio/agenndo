"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getPlan, PLAN_ORDER } from "@/lib/plans";
import {
  filterAndSortRows,
  OPERACOES_PAGE_SIZE,
  paginate,
  rowsToCsv,
} from "@/lib/operacoes/list-utils";
import { loadOperacoesNotes, saveOperacoesNote } from "@/lib/operacoes/notes-storage";
import { resolveRowPublicUrl } from "@/lib/operacoes/resolve-public-url";
import type { OperacoesOverview, OperacoesSortKey, UnifiedRow } from "@/lib/operacoes/types";
import { OperacoesPeopleList } from "./operacoes-people-list";
import { operacoesSurface, useOperacoesShell } from "./operacoes-shell";

const AUTO_REFRESH_SEC = 60;

function fmtClock(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function OperacoesConsole() {
  const { theme } = useOperacoesShell();
  const s = operacoesSurface(theme);

  const [overview, setOverview] = useState<OperacoesOverview | null>(null);
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshIn, setRefreshIn] = useState(AUTO_REFRESH_SEC);
  const [notesMap, setNotesMap] = useState(loadOperacoesNotes);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState<"all" | "prestador" | "cliente" | "funcionario">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "ativo" | "inativo">("all");
  const [sort, setSort] = useState<OperacoesSortKey>("created_desc");
  const [subscribersOnly, setSubscribersOnly] = useState(false);
  const [withNotesOnly, setWithNotesOnly] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [oRes, lRes] = await Promise.all([
        fetch("/api/operacoes/overview"),
        fetch("/api/operacoes/list"),
      ]);
      if (!oRes.ok || !lRes.ok) {
        const err = !oRes.ok ? await oRes.json() : await lRes.json();
        throw new Error((err as { error?: string }).error ?? "Falha ao carregar");
      }
      setOverview((await oRes.json()) as OperacoesOverview);
      const list = (await lRes.json()) as { rows: UnifiedRow[] };
      setRows(list.rows);
      setNotesMap(loadOperacoesNotes());
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!lastUpdated) return;
    setRefreshIn(AUTO_REFRESH_SEC);
  }, [lastUpdated]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setRefreshIn((prev) => {
        if (prev <= 1) {
          void load(true);
          return AUTO_REFRESH_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(
    () =>
      filterAndSortRows(rows, {
        q,
        plan: planFilter,
        kind: kindFilter,
        status: statusFilter,
        sort,
        subscribersOnly,
        withNotesOnly,
        notesMap,
      }),
    [rows, q, planFilter, kindFilter, statusFilter, sort, subscribersOnly, withNotesOnly, notesMap]
  );

  const paged = useMemo(() => paginate(filtered, page, OPERACOES_PAGE_SIZE), [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [q, planFilter, kindFilter, statusFilter, sort, subscribersOnly, withNotesOnly]);

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(text);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    const forCsv = filtered.map((r) => ({
      ...r,
      publicUrl: resolveRowPublicUrl(r) ?? r.publicUrl,
    }));
    const csv = rowsToCsv(forCsv, notesMap);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agenndo-operacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const patchBusiness = async (businessId: string, patch: { plan?: string; extendTrialDays?: number }) => {
    const res = await fetch("/api/operacoes/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, ...patch }),
    });
    if (!res.ok) {
      const j = await res.json();
      alert((j as { error?: string }).error ?? "Erro");
      return;
    }
    void load(true);
  };

  const deleteRow = async (row: UnifiedRow) => {
    const msg =
      row.kind === "cliente"
        ? `Apagar cliente «${row.name}»?`
        : row.kind === "funcionario"
          ? `Este registo é de funcionário — use o painel do negócio para remover o colaborador.`
          : `Apagar negócio «${row.name}» e dados em cascata?`;
    if (row.kind === "funcionario") {
      alert(msg);
      return;
    }
    if (!confirm(msg)) return;
    const body =
      row.kind === "cliente"
        ? { kind: "cliente", clientId: row.clientId }
        : { kind: "prestador", businessId: row.businessId };
    const res = await fetch("/api/operacoes/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json();
      alert((j as { error?: string }).error ?? "Erro");
      return;
    }
    void load(true);
  };

  if (loading && !overview) {
    return (
      <div className="flex justify-center py-20">
        <div className="size-10 border-2 border-[#1a7a42]/30 border-t-[#3dba6a] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-sm">{error}</p>;
  }

  const inputCls = `mt-1 w-full h-10 rounded-lg border px-3 text-sm ${s.input}`;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Operações</h1>
          <p className={`text-sm mt-1 ${s.muted}`}>
            Prestadores e clientes · até {OPERACOES_PAGE_SIZE} por página · atualização automática em{" "}
            <span className="tabular-nums font-medium">{refreshIn}s</span>
            {lastUpdated ? ` · última às ${fmtClock(lastUpdated)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-150 ${s.border} hover:opacity-80 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100`}
          >
            {loading ? "Atualizando…" : "Atualizar"}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all duration-150 ${s.border} bg-[#0a3d22]/40 ${s.accent} hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]`}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {overview ? (
        <section className={`${s.panel} px-5 py-4`}>
          <p className={`text-[10px] uppercase tracking-wider ${s.muted} mb-4`}>Resumo da plataforma</p>
          <dl className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-4">
            {[
              { label: "Total na lista", value: overview.totalRows },
              { label: "Prestadores", value: overview.prestadores },
              { label: "Funcionários", value: overview.funcionarios },
              { label: "Clientes", value: overview.clientes },
              { label: "Ativos (30d)", value: overview.ativos },
              { label: "Negócios", value: overview.negocios },
              { label: "Agendamentos", value: overview.agendamentos },
            ].map((c) => (
              <div key={c.label}>
                <dt className={`text-[10px] uppercase tracking-wide ${s.muted}`}>{c.label}</dt>
                <dd className={`text-xl font-semibold tabular-nums mt-0.5 ${s.stat}`}>{c.value}</dd>
              </div>
            ))}
          </dl>
          <div className={`mt-5 pt-4 border-t ${s.border}`}>
            <p className={`text-[10px] uppercase tracking-wider ${s.muted} mb-3`}>Planos</p>
            <dl className="flex flex-wrap gap-x-10 gap-y-2">
              {[
                { label: "Grátis", value: overview.planSummary.free },
                { label: "Pagos", value: overview.planSummary.paid },
                { label: "Enterprise", value: overview.planSummary.enterprise },
              ].map((c) => (
                <div key={c.label} className="flex items-baseline gap-2">
                  <dt className={`text-xs ${s.muted}`}>{c.label}</dt>
                  <dd className={`text-base font-semibold tabular-nums ${s.stat}`}>{c.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      <section className={`space-y-3 pb-2 border-b ${s.border}`}>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className={`text-[10px] uppercase ${s.muted}`}>Busca</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="nome, e-mail, slug, telefone, id…"
              className={inputCls}
            />
          </div>
          <div>
            <label className={`text-[10px] uppercase ${s.muted}`}>Tipo</label>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
              className={`${inputCls} min-w-[120px]`}
            >
              <option value="all">Todos</option>
              <option value="prestador">Prestador (dono)</option>
              <option value="funcionario">Funcionário</option>
              <option value="cliente">Cliente</option>
            </select>
          </div>
          <div>
            <label className={`text-[10px] uppercase ${s.muted}`}>Plano</label>
            <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className={`${inputCls} min-w-[120px]`}>
              <option value="all">Todos</option>
              {PLAN_ORDER.map((p) => (
                <option key={p} value={p}>
                  {getPlan(p).label} ({p})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`text-[10px] uppercase ${s.muted}`}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className={`${inputCls} min-w-[100px]`}
            >
              <option value="all">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div>
            <label className={`text-[10px] uppercase ${s.muted}`}>Ordenar</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as OperacoesSortKey)}
              className={`${inputCls} min-w-[160px]`}
            >
              <option value="activity_desc">Última atividade ↓</option>
              <option value="activity_asc">Última atividade ↑</option>
              <option value="created_desc">Cadastro mais recente</option>
              <option value="created_asc">Cadastro mais antigo</option>
              <option value="name_asc">Nome A–Z</option>
              <option value="name_desc">Nome Z–A</option>
              <option value="plan_asc">Plano ↑</option>
              <option value="plan_desc">Plano ↓</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <label className={`flex items-center gap-2 ${s.muted}`}>
            <input type="checkbox" checked={subscribersOnly} onChange={(e) => setSubscribersOnly(e.target.checked)} />
            Só assinantes (sem grátis)
          </label>
          <label className={`flex items-center gap-2 ${s.muted}`}>
            <input type="checkbox" checked={withNotesOnly} onChange={(e) => setWithNotesOnly(e.target.checked)} />
            Só com observações
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className={`text-xs ${s.muted}`}>
          Exibindo {paged.items.length} de {paged.total} (filtrados de {rows.length})
        </p>
        {paged.totalPages > 1 ? (
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              disabled={paged.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`px-3 py-1 rounded-lg border ${s.border} disabled:opacity-40`}
            >
              Anterior
            </button>
            <span className={s.muted}>
              Página {paged.page} / {paged.totalPages}
            </span>
            <button
              type="button"
              disabled={paged.page >= paged.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={`px-3 py-1 rounded-lg border ${s.border} disabled:opacity-40`}
            >
              Próxima
            </button>
          </div>
        ) : null}
      </div>

      <OperacoesPeopleList
        rows={paged.items}
        notesMap={notesMap}
        onNoteChange={(rowId, patch) => {
          saveOperacoesNote(rowId, patch);
          setNotesMap(loadOperacoesNotes());
        }}
        onCopy={handleCopy}
        copiedId={copiedId}
        onExtendTrial={(businessId, days) => {
          if (!confirm(`Estender trial +${days} dias?`)) return;
          void patchBusiness(businessId, { extendTrialDays: days });
        }}
        onChangePlan={(businessId, plan) => {
          if (!confirm(`Alterar plano para ${plan}?`)) return;
          void patchBusiness(businessId, { plan });
        }}
        onDelete={(row) => void deleteRow(row)}
      />
    </div>
  );
}
