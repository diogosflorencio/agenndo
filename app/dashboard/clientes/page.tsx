"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_CLIENTS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

type Filter = "todos" | "frequentes" | "inativos" | "noshow";

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  const filtered = MOCK_CLIENTS.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "frequentes" && c.totalAppointments < 10) return false;
    if (filter === "noshow" && c.noShows === 0) return false;
    return true;
  });

  const getBadge = (client: typeof MOCK_CLIENTS[0]) => {
    if (client.totalAppointments >= 10) return { label: "VIP", color: "text-yellow-400 bg-yellow-400/10" };
    if (client.totalAppointments <= 2) return { label: "Novo", color: "text-blue-400 bg-blue-400/10" };
    if (client.noShows >= 2) return { label: "No-show", color: "text-red-400 bg-red-400/10" };
    return null;
  };

  return (
    <div className="w-full p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="text-gray-600 text-sm mt-1">{MOCK_CLIENTS.length} clientes cadastrados</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-500 text-base">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full h-10 bg-white border border-gray-200 rounded-xl pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: "todos", label: "Todos" },
            { key: "frequentes", label: "Frequentes" },
            { key: "inativos", label: "Inativos" },
            { key: "noshow", label: "No-show" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as Filter)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                filter === f.key
                  ? "bg-primary text-black"
                  : "bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clients list */}
      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((client) => {
          const badge = getBadge(client);
          return (
            <Link
              key={client.id}
              href={`/dashboard/clientes/${client.id}`}
              className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-gray-300 transition-all group block"
            >
              <div className="flex items-start gap-3">
                <div className="size-11 rounded-xl bg-gradient-to-br from-blue-400/20 to-purple-400/20 border border-gray-200 flex items-center justify-center text-gray-900 font-bold flex-shrink-0">
                  {client.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-gray-900 font-semibold text-sm">{client.name}</p>
                    {badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{client.phone}</p>

                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <span className="material-symbols-outlined text-xs">calendar_today</span>
                      {client.totalAppointments} agend.
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary font-semibold">
                      <span className="material-symbols-outlined text-xs">payments</span>
                      {formatCurrency(client.totalSpent)}
                    </div>
                    {client.rating > 0 && (
                      <div className="flex items-center gap-0.5 text-xs text-yellow-400">
                        <span className="material-symbols-outlined text-xs filled">star</span>
                        {client.rating}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    Último: {new Date(client.lastAppointment).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                <span className="material-symbols-outlined text-gray-600 group-hover:text-gray-400 text-base flex-shrink-0 transition-colors">
                  chevron_right
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
