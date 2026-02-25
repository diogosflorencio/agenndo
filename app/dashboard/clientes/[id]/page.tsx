"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_CONFIG } from "@/lib/utils";

type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  total_appointments: number;
  total_spent_cents: number;
  last_appointment_date: string | null;
  no_shows: number;
  rating: number | null;
};

type AptRow = {
  id: string;
  date: string;
  time_start: string;
  price_cents: number;
  status: string;
  services: { name: string } | null;
  collaborators: { name: string } | null;
};

function formatTime(t: string) {
  const [h, m] = t.split(":");
  return `${h}:${m ?? "00"}`;
}

export default function ClienteDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { business } = useDashboard();
  const id = typeof params?.id === "string" ? params.id : "";
  const [client, setClient] = useState<ClientRow | null>(null);
  const [appointments, setAppointments] = useState<AptRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id || !id) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("clients").select("*").eq("business_id", business.id).eq("id", id).single(),
      supabase.from("appointments").select("id, date, time_start, price_cents, status, services(name), collaborators(name)").eq("business_id", business.id).eq("client_id", id).order("date", { ascending: false }).order("time_start", { ascending: false }),
    ]).then(([cRes, aRes]) => {
      setClient(cRes.data as ClientRow | null);
      setAppointments((aRes.data as unknown as AptRow[]) ?? []);
      setLoading(false);
    });
  }, [business?.id, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="w-full max-w-lg mx-auto text-center py-12">
        <p className="text-gray-600 mb-4">Cliente não encontrado.</p>
        <Link href="/dashboard/clientes" className="text-primary font-semibold hover:underline">Voltar para Clientes</Link>
      </div>
    );
  }

  const compareceu = appointments.filter((a) => a.status === "compareceu").length;
  const cancelados = appointments.filter((a) => a.status === "cancelado").length;
  const totalGasto = client.total_spent_cents / 100;
  const diasQueVeio = Array.from(new Set(appointments.filter((a) => a.status === "compareceu").map((a) => a.date))).length;
  const attendRate = client.total_appointments > 0 ? Math.round(((client.total_appointments - client.no_shows) / client.total_appointments) * 100) : 0;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="size-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Detalhes do cliente</h1>
          <p className="text-gray-600 text-sm mt-0.5">{client.name}</p>
        </div>
        <Link href="/dashboard/agendamentos/novo" className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm">
          <span className="material-symbols-outlined text-base">add</span>
          Agendar
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Visitas (dias)</p>
          <p className="text-xl font-bold text-gray-900">{diasQueVeio}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total gasto</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(totalGasto)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Cancelamentos</p>
          <p className="text-xl font-bold text-gray-900">{cancelados}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Presença</p>
          <p className={`text-xl font-bold ${attendRate >= 90 ? "text-primary" : attendRate >= 70 ? "text-amber-500" : "text-red-500"}`}>{attendRate}%</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Contato</h2>
        <div className="space-y-2 text-sm">
          <p className="text-gray-700"><span className="text-gray-500">Telefone:</span> {client.phone ?? "—"}</p>
          <p className="text-gray-700"><span className="text-gray-500">E-mail:</span> {client.email ?? "—"}</p>
          <p className="text-gray-700"><span className="text-gray-500">Último agendamento:</span> {client.last_appointment_date ? formatDate(client.last_appointment_date) : "—"}</p>
          {client.no_shows > 0 && <p className="text-amber-600 font-medium">Faltas sem aviso: {client.no_shows}</p>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 p-4 border-b border-gray-200">Histórico de agendamentos ({appointments.length})</h2>
        <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
          {appointments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">Nenhum agendamento registrado.</div>
          ) : (
            appointments.map((apt) => {
              const conf = STATUS_CONFIG[apt.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.agendado;
              return (
                <div key={apt.id} className="p-4 flex flex-wrap items-center gap-3 hover:bg-gray-50">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900">{formatDate(apt.date)}</span>
                    <span className="text-xs text-gray-500">{formatTime(apt.time_start)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{apt.services?.name ?? "—"}</p>
                    <p className="text-xs text-gray-500">{apt.collaborators?.name ?? "—"}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${conf.bg} ${conf.color}`}>
                    <span className={`size-1.5 rounded-full ${conf.dot}`} />
                    {conf.label}
                  </span>
                  <span className="text-primary text-sm font-bold">{formatCurrency(apt.price_cents / 100)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
