"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B",
  "#EF4444", "#14B8A6", "#6366F1", "#13EC5B",
];

export default function NovoColaboradorPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    role: "",
    phone: "",
    color: "#3B82F6",
    customHours: false,
  });

  const handleSave = () => {
    // In production: save to DB
    router.push("/dashboard/colaboradores");
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
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
            <button
              type="button"
              className="absolute -bottom-1 -right-1 size-8 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">photo_camera</span>
            </button>
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
              placeholder="Ex: Barbeiro Senior, Manicure..."
              className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Telefone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
            <button
              type="button"
              onClick={() => setForm({ ...form, customHours: !form.customHours })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.customHours ? "bg-primary" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block size-4 rounded-full bg-white transition-transform ${
                  form.customHours ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <div>
              <p className="text-sm text-gray-900 font-medium">Horários personalizados</p>
              <p className="text-xs text-gray-500">Definir horários diferentes do negócio</p>
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
          onClick={handleSave}
          disabled={!form.name}
          className="flex-1 py-4 bg-primary hover:bg-primary/90 disabled:bg-primary/40 disabled:cursor-not-allowed text-black font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
        >
          Salvar e vincular serviços
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
