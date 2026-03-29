"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { maskPhoneInputRaw, phoneDigitsOnly } from "@/lib/utils";

const COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B",
  "#EF4444", "#14B8A6", "#6366F1", "#13EC5B",
];

export default function NovoColaboradorPage() {
  const router = useRouter();
  const { business } = useDashboard();
  const [form, setForm] = useState({
    name: "",
    role: "",
    phone: "",
    color: "#3B82F6",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name.trim() || !business?.id) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insErr } = await supabase
      .from("collaborators")
      .insert({
        business_id: business.id,
        name: form.name.trim(),
        role: form.role.trim() || null,
        phone: phoneDigitsOnly(form.phone) || null,
        color: form.color,
        active: true,
      })
      .select("id")
      .single();

    setSaving(false);
    if (insErr || !data?.id) {
      setError(insErr?.message ?? "Não foi possível criar o colaborador.");
      return;
    }
    router.push(`/dashboard/colaboradores/${data.id}/servicos`);
  };

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
          <h1 className="text-xl font-bold text-gray-900">Novo colaborador</h1>
          <p className="text-gray-600 text-sm">Adicione um novo membro à equipe</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
          {error.includes("phone") && (
            <span className="block text-xs mt-1 text-red-700">
              Rode a migração <code className="font-mono">20250332_collaborators_phone.sql</code> no Supabase se a coluna ainda não existir.
            </span>
          )}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div
              className="size-20 rounded-2xl flex items-center justify-center text-gray-900 font-bold text-3xl"
              style={{ backgroundColor: form.color + "30", border: `2px solid ${form.color}50` }}
            >
              {form.name ? (
                <span style={{ color: form.color }}>{form.name[0].toUpperCase()}</span>
              ) : (
                <span className="material-symbols-outlined text-gray-500 text-3xl">person</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Nome completo <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Carlos Barbeiro"
              className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Cargo / Função</label>
            <input
              type="text"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Ex: Barbeiro, Manicure..."
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
          disabled={!form.name.trim() || saving || !business?.id}
          className="flex-1 py-4 bg-primary hover:bg-primary/90 disabled:bg-primary/40 disabled:cursor-not-allowed text-black font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
        >
          {saving ? "Salvando…" : "Salvar e vincular serviços"}
          {!saving && <span className="material-symbols-outlined text-base">arrow_forward</span>}
        </button>
      </div>
    </div>
  );
}
