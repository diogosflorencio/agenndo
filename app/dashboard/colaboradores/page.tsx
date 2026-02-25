"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";

type CollabRow = {
  id: string;
  name: string;
  role: string | null;
  color: string | null;
  active: boolean;
};

export default function ColaboradoresPage() {
  const { business } = useDashboard();
  const [collaborators, setCollaborators] = useState<CollabRow[]>([]);
  const [countsToday, setCountsToday] = useState<Record<string, number>>({});
  const [countsMonth, setCountsMonth] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;
    const supabase = createClient();
    const todayStr = new Date().toISOString().slice(0, 10);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const fromStr = startOfMonth.toISOString().slice(0, 10);

    supabase
      .from("collaborators")
      .select("id, name, role, color, active")
      .eq("business_id", business.id)
      .order("name")
      .then(({ data: collabs }) => {
        setCollaborators((collabs as CollabRow[]) ?? []);
        const ids = (collabs ?? []).map((c: { id: string }) => c.id);
        if (ids.length === 0) {
          setLoading(false);
          return;
        }
        Promise.all([
          supabase.from("appointments").select("collaborator_id").eq("business_id", business.id).eq("date", todayStr),
          supabase.from("appointments").select("collaborator_id").eq("business_id", business.id).gte("date", fromStr),
        ]).then(([todayRes, monthRes]) => {
          const today: Record<string, number> = {};
          const month: Record<string, number> = {};
          ids.forEach((id: string) => {
            today[id] = 0;
            month[id] = 0;
          });
          (todayRes.data ?? []).forEach((r: { collaborator_id: string }) => {
            today[r.collaborator_id] = (today[r.collaborator_id] ?? 0) + 1;
          });
          (monthRes.data ?? []).forEach((r: { collaborator_id: string }) => {
            month[r.collaborator_id] = (month[r.collaborator_id] ?? 0) + 1;
          });
          setCountsToday(today);
          setCountsMonth(month);
          setLoading(false);
        });
      });
  }, [business?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
          <p className="text-gray-600 text-sm mt-1">{collaborators.length} colaboradores</p>
        </div>
        <Link
          href="/dashboard/colaboradores/novo"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)]"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          Adicionar
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collaborators.map((collab) => {
          const color = collab.color ?? "#3B82F6";
          const todayApts = countsToday[collab.id] ?? 0;
          const monthApts = countsMonth[collab.id] ?? 0;
          return (
            <div key={collab.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-all shadow-sm">
              <div className="p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <div className="size-14 rounded-xl flex items-center justify-center text-gray-900 font-bold text-xl" style={{ backgroundColor: `${color}40`, border: `2px solid ${color}40` }}>
                      <span style={{ color }}>{collab.name[0]}</span>
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white ${collab.active ? "bg-primary" : "bg-gray-500"}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-bold">{collab.name}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">{collab.role ?? "—"}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className={`size-1.5 rounded-full ${collab.active ? "bg-primary" : "bg-gray-500"}`} />
                      <span className={`text-xs font-medium ${collab.active ? "text-primary" : "text-gray-500"}`}>
                        {collab.active ? "Disponível hoje" : "Indisponível"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-gray-100 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">Hoje</p>
                    <p className="text-gray-900 font-bold text-lg">{todayApts}</p>
                    <p className="text-xs text-gray-500">agend.</p>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">Este mês</p>
                    <p className="text-gray-900 font-bold text-lg">{monthApts}</p>
                    <p className="text-xs text-gray-500">agend.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-500">Cor no calendário</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-px bg-gray-100 border-t border-gray-200">
                <Link href={`/dashboard/colaboradores/${collab.id}/editar`} className="bg-white hover:bg-gray-50 text-xs font-semibold text-gray-600 py-3 transition-colors flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-xs">edit</span> Editar
                </Link>
                <Link href={`/dashboard/colaboradores/${collab.id}/servicos`} className="bg-white hover:bg-gray-50 text-xs font-semibold text-gray-600 py-3 transition-colors flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-xs">content_cut</span> Serviços
                </Link>
                <button type="button" className="bg-white hover:bg-gray-50 text-xs font-semibold text-gray-600 py-3 transition-colors flex items-center justify-center gap-1 text-red-500">
                  Desativar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {collaborators.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
          <span className="material-symbols-outlined text-gray-400 text-4xl block mb-3">groups</span>
          <p className="text-gray-600 text-sm">Nenhum colaborador. Adicione sua primeira pessoa da equipe.</p>
          <Link href="/dashboard/colaboradores/novo" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-black font-bold rounded-xl text-sm">
            <span className="material-symbols-outlined text-base">person_add</span> Adicionar
          </Link>
        </div>
      )}
    </div>
  );
}
