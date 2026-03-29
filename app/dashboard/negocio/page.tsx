"use client";

import { useState, useEffect, useMemo } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { formatBrazilPhoneFromDigits, maskPhoneInputRaw, phoneDigitsOnly } from "@/lib/utils";
import { UnsavedChangesIndicator } from "@/components/dashboard-unsaved-indicator";

export default function NegocioPage() {
  const { business } = useDashboard();
  const [savedBaseline, setSavedBaseline] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    phone: "",
    city: "",
    slug: "",
    segment: "",
  });

  useEffect(() => {
    if (business) {
      const next = {
        businessName: business.name ?? "",
        phone: formatBrazilPhoneFromDigits(business.phone ?? ""),
        city: business.city ?? "",
        slug: business.slug ?? "",
        segment: business.segment ?? "",
      };
      const j = JSON.stringify(next);
      setForm(next);
      setSavedBaseline(j);
    }
  }, [business]);

  const isDirty = useMemo(() => {
    if (!business || savedBaseline === null) return false;
    return JSON.stringify(form) !== savedBaseline;
  }, [business, form, savedBaseline]);

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold text-gray-900">Dados do negócio</h1>
          <UnsavedChangesIndicator dirty={isDirty} variant="inline" />
        </div>
        <p className="text-gray-600 text-sm mt-1">Nome, contato e link público do seu estabelecimento</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
          {[
            { label: "Nome do negócio", key: "businessName", type: "text" },
            { label: "Telefone", key: "phone", type: "tel" },
            { label: "Cidade", key: "city", type: "text" },
            { label: "Segmento", key: "segment", type: "text" },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">{field.label}</label>
              <input
                type={field.type}
                inputMode={field.key === "phone" ? "tel" : undefined}
                autoComplete={field.key === "phone" ? "tel" : undefined}
                value={form[field.key as keyof typeof form]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [field.key]:
                      field.key === "phone" ? maskPhoneInputRaw(e.target.value) : e.target.value,
                  })
                }
                className="w-full h-11 bg-gray-50 border border-gray-200 focus:border-primary rounded-xl px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm"
              />
            </div>
          ))}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">URL pública</label>
            <div className="flex items-center h-11 bg-gray-50 border border-gray-200 focus-within:border-primary rounded-xl overflow-hidden transition-colors">
              <span className="px-3 text-gray-500 text-sm border-r border-gray-200 h-full flex items-center flex-shrink-0">
                agenndo.com.br/
              </span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="flex-1 h-full bg-transparent px-3 text-gray-900 text-sm outline-none"
              />
            </div>
            <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">warning</span>
              Alterar o slug mudará seu link público. Avise seus clientes.
            </p>
          </div>
        </div>

        <SaveNegocioButton
          businessId={business?.id}
          form={form}
          onSaved={() => {
            setSavedBaseline(JSON.stringify(form));
          }}
          isDirty={isDirty}
        />
      </div>
    </div>
  );
}

function SaveNegocioButton({
  businessId,
  form,
  onSaved,
  isDirty,
}: {
  businessId: string | undefined;
  form: { businessName: string; phone: string; city: string; slug: string; segment: string };
  onSaved?: () => void;
  isDirty: boolean;
}) {
  const [saving, setSaving] = useState(false);
  if (!businessId) return null;
  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("businesses")
      .update({
        name: form.businessName || undefined,
        phone: phoneDigitsOnly(form.phone) || undefined,
        city: form.city || undefined,
        slug: form.slug || undefined,
        segment: form.segment || undefined,
      })
      .eq("id", businessId);
    setSaving(false);
    onSaved?.();
  };
  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={saving}
      className={`w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-70 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
        isDirty ? "ring-2 ring-amber-500/45" : ""
      }`}
    >
      <span className="material-symbols-outlined text-base">save</span>
      {saving ? "Salvando..." : "Salvar alterações"}
    </button>
  );
}
