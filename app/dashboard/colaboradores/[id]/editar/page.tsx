"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { SwitchToggle } from "@/components/switch-toggle";
import { EntityPhotoControl } from "@/components/dashboard/entity-photo-control";
import { formatBrazilPhoneFromDigits, maskPhoneInputRaw, phoneDigitsOnly } from "@/lib/utils";

const COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B",
  "#EF4444", "#14B8A6", "#6366F1", "#13EC5B",
];

type Row = {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  color: string | null;
  avatar_url: string | null;
  active: boolean;
};

export default function EditarColaboradorPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { business } = useDashboard();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "",
    phone: "",
    color: "#3B82F6",
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !business?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error: qErr } = await supabase
      .from("collaborators")
      .select("id, name, role, phone, color, avatar_url, active")
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle();

    setLoading(false);
    if (qErr || !data) {
      setNotFound(true);
      return;
    }
    const row = data as Row;
    setForm({
      name: row.name,
      role: row.role ?? "",
      phone: formatBrazilPhoneFromDigits(row.phone ?? ""),
      color: row.color ?? "#3B82F6",
      active: row.active,
    });
    setAvatarUrl(row.avatar_url ?? null);
    setNotFound(false);
  }, [id, business?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!form.name.trim() || !id) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: uErr } = await supabase
      .from("collaborators")
      .update({
        name: form.name.trim(),
        role: form.role.trim() || null,
        phone: phoneDigitsOnly(form.phone) || null,
        color: form.color,
        active: form.active,
      })
      .eq("id", id);

    setSaving(false);
    if (uErr) {
      setError(uErr.message);
      return;
    }
    router.push("/dashboard/colaboradores");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 w-full">
        <div className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="w-full text-center py-12">
        <p className="text-gray-600 mb-4">Colaborador não encontrado.</p>
        <Link href="/dashboard/colaboradores" className="text-primary font-semibold hover:underline">
          Voltar para Equipe
        </Link>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold text-gray-900">Editar colaborador</h1>
          <p className="text-gray-600 text-sm">{form.name}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        {business?.id ? (
          <div className="flex justify-center mb-6">
            <EntityPhotoControl
              businessId={business.id}
              kind="collaborator"
              entityId={id}
              imageUrl={avatarUrl}
              onPersist={async (url) => {
                const supabase = createClient();
                const { error: pErr } = await supabase.from("collaborators").update({ avatar_url: url }).eq("id", id);
                if (pErr) throw new Error(pErr.message);
                setAvatarUrl(url);
              }}
              accentColor={form.color}
              fallback={
                form.name ? (
                  <span className="text-3xl font-bold" style={{ color: form.color }}>
                    {form.name[0].toUpperCase()}
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-gray-500 text-3xl">person</span>
                )
              }
            />
          </div>
        ) : null}

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Nome completo <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: nome do profissional"
              className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Cargo / Função</label>
            <input
              type="text"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Ex.: função ou especialidade"
              className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Telefone (opcional)</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: maskPhoneInputRaw(e.target.value) })}
              placeholder="(11) 99999-9999"
              className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-3">Cor no calendário</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`size-10 rounded-xl transition-all ${
                    form.color === color ? "ring-2 ring-primary ring-offset-2 ring-offset-white scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 py-3 border-t border-gray-200">
            <SwitchToggle checked={form.active} onChange={() => setForm({ ...form, active: !form.active })} />
            <div>
              <p className="text-sm text-gray-900 font-medium">Colaborador ativo</p>
              <p className="text-xs text-gray-500">Aparece na agenda e na página pública de agendamento</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Link
          href="/dashboard/colaboradores"
          className="flex-1 py-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm transition-all text-center"
        >
          Cancelar
        </Link>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!form.name.trim() || saving}
          className="flex-1 py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
        >
          {saving ? "Salvando…" : "Salvar alterações"}
          {!saving && <span className="material-symbols-outlined text-base">check</span>}
        </button>
      </div>

      <div className="mt-6">
        <Link
          href={`/dashboard/colaboradores/${id}/servicos`}
          className="flex items-center justify-center gap-2 py-3 w-full bg-white border border-gray-200 hover:border-primary/40 rounded-xl text-sm font-semibold text-gray-700 hover:text-gray-900 transition-all"
        >
          <span className="material-symbols-outlined text-base">content_cut</span>
          Gerenciar serviços deste colaborador
        </Link>
      </div>
    </div>
  );
}
