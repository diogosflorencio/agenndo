"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MOCK_COLLABORATORS, MOCK_SERVICES } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export default function ColaboradorServicosPage() {
  const params = useParams();
  const collaborator = MOCK_COLLABORATORS.find((c) => c.id === params.id) ?? MOCK_COLLABORATORS[0];
  const [linked, setLinked] = useState<string[]>(collaborator.services);

  const toggle = (serviceId: string) => {
    setLinked((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/colaboradores"
          className="size-9 flex items-center justify-center rounded-xl bg-[#14221A] border border-[#213428] hover:border-white/20 text-gray-400 hover:text-white transition-all"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Serviços de {collaborator.name.split(" ")[0]}</h1>
          <p className="text-gray-400 text-sm">{linked.length} serviço(s) vinculado(s)</p>
        </div>
      </div>

      {/* Collaborator info */}
      <div className="flex items-center gap-4 p-4 bg-[#14221A] border border-[#213428] rounded-xl mb-6">
        <div
          className="size-12 rounded-xl flex items-center justify-center text-xl font-bold"
          style={{ backgroundColor: collaborator.color + "30", color: collaborator.color }}
        >
          {collaborator.name[0]}
        </div>
        <div>
          <p className="text-white font-bold">{collaborator.name}</p>
          <p className="text-gray-400 text-sm">{collaborator.role}</p>
        </div>
        <div
          className="ml-auto size-3 rounded-full"
          style={{ backgroundColor: collaborator.color }}
        />
      </div>

      {/* Services */}
      <div className="space-y-3">
        {MOCK_SERVICES.map((service) => {
          const isLinked = linked.includes(service.id);
          return (
            <button
              key={service.id}
              onClick={() => toggle(service.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                isLinked
                  ? "bg-primary/10 border-primary/40"
                  : "bg-[#14221A] border-[#213428] hover:border-white/20"
              }`}
            >
              <div className="size-10 rounded-xl bg-[#213428] flex items-center justify-center text-xl flex-shrink-0">
                {service.emoji}
              </div>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${isLinked ? "text-white" : "text-gray-300"}`}>
                  {service.name}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {service.duration}min · {formatCurrency(service.price)}
                </p>
              </div>
              <div className={`size-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                isLinked
                  ? "bg-primary border-primary"
                  : "border-[#213428]"
              }`}>
                {isLinked && <span className="material-symbols-outlined text-black text-sm">check</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 mt-6">
        <Link
          href="/dashboard/colaboradores"
          className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl text-sm border border-white/10 text-center transition-all"
        >
          Cancelar
        </Link>
        <button className="flex-1 py-4 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-base">save</span>
          Salvar
        </button>
      </div>
    </div>
  );
}
