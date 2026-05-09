"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDashboard } from "@/lib/dashboard-context";
import { formatCurrency } from "@/lib/utils";

type LineRow = {
  id: string;
  amount_cents: number;
  percent_applied: number;
  base_amount_cents: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  services: { name: string } | null;
  appointments: { date: string; price_cents: number } | null;
};

function localYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  paid: "Paga",
  void: "Estornada",
};

export default function MinhasComissoesPage() {
  const { business, user, isStaffDashboard } = useDashboard();
  const [lines, setLines] = useState<LineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [noCollaboratorLink, setNoCollaboratorLink] = useState(false);
  const [period, setPeriod] = useState<"month" | "custom">("month");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return localYmd(d);
  });
  const [to, setTo] = useState(() => localYmd(new Date()));
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const load = useCallback(async () => {
    if (!business?.id || !user?.realUserId) return;
    setLoading(true);
    const supabase = createClient();

    const { data: selfCollab } = await supabase
      .from("collaborators")
      .select("id")
      .eq("business_id", business.id)
      .eq("auth_user_id", user.realUserId)
      .maybeSingle();

    if (!selfCollab?.id) {
      setNoCollaboratorLink(true);
      setLines([]);
      setLoading(false);
      return;
    }
    setNoCollaboratorLink(false);

    const end = new Date();
    const start = new Date();
    if (period === "month") {
      start.setDate(start.getDate() - 30);
    } else {
      start.setTime(new Date(from + "T12:00:00").getTime());
      end.setTime(new Date(to + "T12:00:00").getTime());
    }
    const fromStr = period === "month" ? localYmd(start) : from;
    const toStr = period === "month" ? localYmd(end) : to;

    let q = supabase
      .from("appointment_commissions")
      .select("id, amount_cents, percent_applied, base_amount_cents, status, created_at, paid_at, services(name), appointments(date, price_cents)")
      .eq("business_id", business.id)
      .eq("collaborator_id", selfCollab.id)
      .gte("created_at", fromStr + "T00:00:00")
      .lte("created_at", toStr + "T23:59:59")
      .order("created_at", { ascending: false });

    if (filterStatus !== "all") {
      q = q.eq("status", filterStatus);
    }

    const { data, error } = await q;
    if (error) {
      setLines([]);
      setLoading(false);
      return;
    }
    setLines((data ?? []) as unknown as LineRow[]);
    setLoading(false);
  }, [business?.id, user?.realUserId, period, from, to, filterStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const active = lines.filter((l) => l.status !== "void");
    const pending = active.filter((l) => l.status === "pending" || l.status === "approved");
    const paid = active.filter((l) => l.status === "paid");
    const sum = (arr: LineRow[]) => arr.reduce((s, l) => s + Number(l.amount_cents), 0);
    return {
      pending: sum(pending),
      paid: sum(paid),
      all: sum(active),
    };
  }, [lines]);

  if (!business) {
    return (
      <div className="flex justify-center py-20">
        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Minhas comissões</h1>
        <p className="text-gray-600 text-sm mt-1">
          {isStaffDashboard
            ? `Valores registrados em ${business.name}.`
            : "Suas comissões quando houver vínculo de conta na Equipe."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">A receber (pendente/aprovada)</p>
          <p className="text-lg font-bold text-amber-700">{formatCurrency(totals.pending / 100)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Já pagas no período</p>
          <p className="text-lg font-bold text-primary">{formatCurrency(totals.paid / 100)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as "month" | "custom")}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="month">Últimos 30 dias</option>
          <option value="custom">Intervalo</option>
        </select>
        {period === "custom" ? (
          <>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border px-2 py-2 text-sm" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border px-2 py-2 text-sm" />
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
        </select>
        <button type="button" onClick={() => void load()} className="ml-auto px-3 py-2 rounded-xl bg-gray-100 text-sm font-semibold">
          Atualizar
        </button>
      </div>

      {noCollaboratorLink ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          Sua conta ainda não está vinculada a um colaborador neste negócio. Peça ao administrador para abrir{" "}
          <strong>Equipe → editar colaborador</strong> e informar seu e-mail de login na seção “Minhas comissões”.
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {loading ? (
          <div className="p-10 flex justify-center">
            <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : lines.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">
            Nenhuma comissão neste período. Peça ao administrador para ativar o módulo e vincular sua conta em Equipe → editar
            colaborador.
          </p>
        ) : (
          lines.map((l) => (
            <div key={l.id} className="p-4 flex flex-wrap justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{l.services?.name ?? "Serviço"}</p>
                <p className="text-xs text-gray-500">{(l.appointments?.date ?? "").slice(0, 10)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{formatCurrency(l.amount_cents / 100)}</p>
                <p className="text-[10px] text-gray-500">{l.percent_applied}% · base {formatCurrency(l.base_amount_cents / 100)}</p>
                <span className="text-[10px] font-bold uppercase text-gray-600">{STATUS_LABEL[l.status] ?? l.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
