"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_SERVICES, MOCK_COLLABORATORS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export default function ServicosPage() {
  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState<typeof MOCK_SERVICES[0] | null>(null);

  const filtered = MOCK_SERVICES;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
          <p className="text-gray-400 text-sm mt-1">{MOCK_SERVICES.length} serviços cadastrados</p>
        </div>
        <button
          onClick={() => { setEditService(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(19,236,91,0.2)]"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Novo serviço
        </button>
      </div>

      {/* Services grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((service) => {
          const collabs = MOCK_COLLABORATORS.filter((c) =>
            service.collaborators.includes(c.id)
          );
          return (
            <div
              key={service.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-all group"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                      {service.emoji}
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-bold">{service.name}</h3>
                    </div>
                  </div>
                  <div className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                    service.active ? "bg-primary/10 text-primary" : "bg-gray-500/10 text-gray-500"
                  }`}>
                    <span className={`size-1.5 rounded-full ${service.active ? "bg-primary" : "bg-gray-500"}`} />
                    {service.active ? "Ativo" : "Inativo"}
                  </div>
                </div>

                <div className="flex gap-4 mb-4">
                  <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                    <span className="material-symbols-outlined text-base">schedule</span>
                    {service.duration}min
                  </div>
                  <div className="flex items-center gap-1.5 text-primary text-sm font-bold">
                    <span className="material-symbols-outlined text-base">attach_money</span>
                    {formatCurrency(service.price)}
                  </div>
                </div>

                {/* Collaborators */}
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {collabs.slice(0, 3).map((c) => (
                      <div
                        key={c.id}
                        className="size-6 rounded-full border-2 border-[#14221A] flex items-center justify-center text-[10px] font-bold text-gray-900"
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      >
                        {c.name[0]}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {collabs.map((c) => c.name.split(" ")[0]).join(", ")}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-px bg-gray-100 border-t border-gray-200">
                <button
                  onClick={() => { setEditService(service); setShowModal(true); }}
                  className="bg-white hover:bg-gray-50 text-xs font-semibold text-gray-600 py-3 transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Editar
                </button>
                <button className="bg-white hover:bg-gray-50 text-xs font-semibold text-gray-600 py-3 transition-colors flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  Duplicar
                </button>
                <button className="bg-white hover:bg-gray-50 text-xs font-semibold text-gray-600 py-3 transition-colors flex items-center justify-center gap-1">
                  {service.active ? (
                    <>
                      <span className="material-symbols-outlined text-sm">visibility_off</span>
                      Desativar
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      Ativar
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {/* Add new card */}
        <button
          onClick={() => { setEditService(null); setShowModal(true); }}
          className="flex flex-col items-center justify-center gap-3 p-8 bg-white border border-dashed border-gray-200 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group min-h-[180px]"
        >
          <div className="size-12 rounded-xl bg-gray-100 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-gray-500 group-hover:text-primary text-2xl transition-colors">add</span>
          </div>
          <p className="text-gray-500 group-hover:text-primary text-sm font-semibold transition-colors">
            Adicionar serviço
          </p>
        </button>
      </div>

      {/* Service modal */}
      {showModal && (
        <ServiceModal
          service={editService}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function ServiceModal({
  service,
  onClose,
}: {
  service: typeof MOCK_SERVICES[0] | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: service?.name ?? "",
    duration: service?.duration ?? 30,
    price: service?.price ?? 0,
    emoji: service?.emoji ?? "✂️",
    active: service?.active ?? true,
  });

  const emojis = ["✂️", "💈", "🪒", "💅", "🦶", "💆", "🏋️", "📷", "🐾", "🦷", "💊", "🎯"];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-gray-50 border border-gray-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">
            {service ? "Editar serviço" : "Novo serviço"}
          </h2>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Emoji picker */}
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-2">Ícone</label>
            <div className="flex gap-2 flex-wrap">
              {emojis.map((e) => (
                <button
                  key={e}
                  onClick={() => setForm({ ...form, emoji: e })}
                  className={`size-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    form.emoji === e
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "bg-gray-100 hover:bg-white/10"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <FormInput label="Nome do serviço" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Corte Masculino"
              className="w-full h-11 bg-white border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
            />
          </FormInput>

          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Duração (minutos)">
              <div className="flex items-center gap-3">
                <span className="text-primary font-bold text-lg">{form.duration}min</span>
              </div>
              <input
                type="range"
                min="5"
                max="240"
                step="5"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              />
            </FormInput>

            <FormInput label="Preço (R$)">
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                placeholder="0,00"
                className="w-full h-11 bg-white border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
              />
            </FormInput>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setForm({ ...form, active: !form.active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.active ? "bg-primary" : "bg-gray-100"
              }`}
            >
              <span
                className={`inline-block size-4 rounded-full bg-white transition-transform ${
                  form.active ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">Serviço ativo (visível na página pública)</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-200 sticky bottom-0 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-900 font-semibold rounded-xl text-sm transition-all border border-white/10"
          >
            Cancelar
          </button>
          <button className="flex-1 py-3 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl text-sm transition-all">
            {service ? "Salvar alterações" : "Criar serviço"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormInput({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-600 block mb-1.5">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
