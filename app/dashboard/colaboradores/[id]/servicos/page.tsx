"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

type CollabRow = { id: string; name: string; role: string | null; color: string | null };
type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  emoji: string | null;
  active: boolean;
};

export default function ColaboradorServicosPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const { business } = useDashboard();

  const [loading, setLoading] = useState(true);
  const [collaborator, setCollaborator] = useState<CollabRow | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [linked, setLinked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !business?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: c, error: cErr } = await supabase
      .from("collaborators")
      .select("id, name, role, color")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle();

    if (cErr || !c) {
      setCollaborator(null);
      setLoading(false);
      return;
    }
    setCollaborator(c as CollabRow);

    const [sRes, lRes] = await Promise.all([
      supabase
        .from("services")
        .select("id, name, duration_minutes, price_cents, emoji, active")
        .eq("business_id", business.id)
        .is("archived_at", null)
        .order("name"),
      supabase.from("collaborator_services").select("service_id").eq("collaborator_id", id),
    ]);

    setServices((sRes.data as ServiceRow[]) ?? []);
    setLinked((lRes.data ?? []).map((r: { service_id: string }) => r.service_id));
    setLoading(false);
  }, [id, business?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (serviceId: string) => {
    setLinked((prev) =>
      prev.includes(serviceId) ? prev.filter((x) => x !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: delErr } = await supabase.from("collaborator_services").delete().eq("collaborator_id", id);
    if (delErr) {
      setSaving(false);
      setError(delErr.message);
      return;
    }
    if (linked.length > 0) {
      const rows = linked.map((service_id) => ({ collaborator_id: id, service_id }));
      const { error: insErr } = await supabase.from("collaborator_services").insert(rows);
      if (insErr) {
        setSaving(false);
        setError(insErr.message);
        return;
      }
    }
    setSaving(false);
    router.push("/dashboard/colaboradores");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 w-full">
        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!collaborator) {
    return (
      <div className="w-full text-center py-12">
        <p className="text-gray-600 mb-4">Colaborador não encontrado.</p>
        <Link href="/dashboard/colaboradores" className="text-primary font-semibold hover:underline">
          Voltar para Equipe
        </Link>
      </div>
    );
  }

  const color = collaborator.color ?? "#3B82F6";

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/colaboradores"
          className="size-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Serviços de {collaborator.name.split(" ")[0]}</h1>
          <p className="text-gray-500 text-sm">{linked.length} serviço(s) vinculado(s)</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl mb-6 shadow-sm">
        <div
          className="size-12 rounded-xl flex items-center justify-center text-xl font-bold text-gray-900"
          style={{ backgroundColor: `${color}35`, border: `2px solid ${color}50` }}
        >
          <span style={{ color }}>{collaborator.name[0]}</span>
        </div>
        <div>
          <p className="text-gray-900 font-bold">{collaborator.name}</p>
          <p className="text-gray-500 text-sm">{collaborator.role ?? "-"}</p>
        </div>
        <div className="ml-auto size-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Toque para marcar os serviços que este profissional realiza. Isso alinha com a página pública e com os vínculos feitos em Serviços.
      </p>

      <div className="space-y-2">
        {services.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-xl">
            Nenhum serviço cadastrado.{" "}
            <Link href="/dashboard/servicos" className="text-primary font-semibold hover:underline">
              Criar serviços
            </Link>
          </p>
        ) : (
          services.map((service) => {
            const isLinked = linked.includes(service.id);
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => toggle(service.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                  isLinked
                    ? "bg-primary/10 border-primary/50 shadow-sm"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="size-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl shrink-0">
                  {service.emoji ? (
                    <span className="leading-none">{service.emoji}</span>
                  ) : (
                    <span className="material-symbols-outlined text-gray-400 text-[22px]">category</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isLinked ? "text-gray-900" : "text-gray-600"}`}>
                    {service.name}
                    {!service.active && (
                      <span className="ml-2 text-[10px] font-normal text-gray-400 normal-case">(inativo)</span>
                    )}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {service.duration_minutes}min · {formatCurrency(service.price_cents / 100)}
                  </p>
                </div>
                <div
                  className={`size-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                    isLinked ? "bg-primary border-primary" : "border-gray-200"
                  }`}
                >
                  {isLinked && <span className="material-symbols-outlined text-black text-sm">check</span>}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Link
          href="/dashboard/colaboradores"
          className="flex-1 py-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm text-center transition-all"
        >
          Voltar sem salvar
        </Link>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="flex-1 py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-black font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">save</span>
          {saving ? "Salvando…" : "Salvar vínculos"}
        </button>
      </div>
    </div>
  );
}
