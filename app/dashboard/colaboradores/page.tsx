"use client";

import Link from "next/link";
import { MOCK_COLLABORATORS, MOCK_APPOINTMENTS } from "@/lib/mock-data";

export default function ColaboradoresPage() {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
          <p className="text-gray-600 text-sm mt-1">{MOCK_COLLABORATORS.length} colaboradores</p>
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
        {MOCK_COLLABORATORS.map((collab) => {
          const todayApts = MOCK_APPOINTMENTS.filter(
            (a) => a.collaboratorId === collab.id && a.date === "2024-01-24"
          ).length;

          return (
            <div
              key={collab.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-all shadow-sm"
            >
              <div className="p-5">
                {/* Avatar & Status */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <div
                      className="size-14 rounded-xl flex items-center justify-center text-gray-900 font-bold text-xl"
                      style={{ backgroundColor: collab.color + "40", border: `2px solid ${collab.color}40` }}
                    >
                      <span style={{ color: collab.color }}>{collab.name[0]}</span>
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white ${
                      collab.active ? "bg-primary" : "bg-gray-500"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-bold">{collab.name}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">{collab.role}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className={`size-1.5 rounded-full ${collab.active ? "bg-primary" : "bg-gray-500"}`} />
                      <span className={`text-xs font-medium ${collab.active ? "text-primary" : "text-gray-500"}`}>
                        {collab.active ? "Disponível hoje" : "Indisponível"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-gray-100 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">Hoje</p>
                    <p className="text-gray-900 font-bold text-lg">{todayApts}</p>
                    <p className="text-xs text-gray-500">agend.</p>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">Este mês</p>
                    <p className="text-gray-900 font-bold text-lg">{collab.appointments}</p>
                    <p className="text-xs text-gray-500">agend.</p>
                  </div>
                </div>

                {/* Color indicator */}
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: collab.color }}
                  />
                  <span className="text-xs text-gray-500">Cor no calendário</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-px bg-gray-100 border-t border-gray-200">
                <Link
                  href={`/dashboard/colaboradores/${collab.id}/editar`}
                  className="bg-white hover:bg-gray-50 text-xs font-semibold text-gray-600 py-3 transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">edit</span>
                  Editar
                </Link>
                <Link
                  href={`/dashboard/colaboradores/${collab.id}/servicos`}
                  className="bg-white hover:bg-gray-50 text-xs font-semibold text-gray-600 py-3 transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">content_cut</span>
                  Serviços
                </Link>
                <button type="button" className="bg-white hover:bg-gray-50 text-xs font-semibold text-gray-600 py-3 transition-colors flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-xs">calendar_month</span>
                  Agenda
                </button>
              </div>
            </div>
          );
        })}

        {/* Add new */}
        <Link
          href="/dashboard/colaboradores/novo"
          className="flex flex-col items-center justify-center gap-3 p-8 bg-white border border-dashed border-gray-200 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group min-h-[200px] shadow-sm"
        >
          <div className="size-12 rounded-xl bg-gray-100 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-gray-500 group-hover:text-primary text-2xl transition-colors">person_add</span>
          </div>
          <p className="text-gray-500 group-hover:text-primary text-sm font-semibold transition-colors text-center">
            Adicionar colaborador
          </p>
        </Link>
      </div>
    </div>
  );
}
