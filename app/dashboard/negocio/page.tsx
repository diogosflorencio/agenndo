"use client";

import { useState, useEffect, useMemo, useRef, forwardRef, useCallback } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { cn, formatBrazilPhoneFromDigits, maskPhoneInputRaw, phoneDigitsOnly } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";
import { getDashboardSurfaces } from "@/lib/dashboard-surfaces";
import { UnsavedChangesIndicator } from "@/components/dashboard-unsaved-indicator";
import { HotkeyHint, useRegisterDashboardHotkeys } from "@/lib/dashboard-hotkeys";
import { useRegisterDashboardUnsavedNavigation } from "@/lib/dashboard-navigation-guard";

export default function NegocioPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const surfaces = getDashboardSurfaces(isDark);
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

  const saveBtnRef = useRef<HTMLButtonElement>(null);

  useRegisterDashboardHotkeys(!!business?.id, "negocio-save", {
    save: () => saveBtnRef.current?.click(),
  });

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className={cn("text-2xl font-bold", surfaces.title)}>Dados do negócio</h1>
          <UnsavedChangesIndicator dirty={isDirty} variant="inline" />
        </div>
        <p className={cn("text-sm mt-1", surfaces.subtitle)}>Nome, contato e link público do seu estabelecimento</p>
      </div>

      <div className="space-y-4">
        <div className={cn(surfaces.panel, "p-5 space-y-4")}>
          {[
            { label: "Nome do negócio", key: "businessName", type: "text" },
            { label: "Telefone", key: "phone", type: "tel" },
            { label: "Cidade", key: "city", type: "text" },
            { label: "Segmento", key: "segment", type: "text" },
          ].map((field) => (
            <div key={field.key}>
              <label className={cn("text-sm font-medium block mb-1.5", surfaces.label)}>{field.label}</label>
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
                className={cn("w-full h-11 rounded-xl px-4 outline-none transition-colors text-sm focus:border-primary", surfaces.input)}
              />
            </div>
          ))}

          <div>
            <label className={cn("text-sm font-medium block mb-1.5", surfaces.label)}>URL pública</label>
            <div className={cn("flex items-center h-11 rounded-xl overflow-hidden transition-colors focus-within:border-primary border", isDark ? "bg-[#020403] border-white/10" : "bg-gray-50 border-gray-200")}>
              <span className={cn("px-3 text-sm h-full flex items-center flex-shrink-0 border-r", surfaces.muted, isDark ? "border-white/10" : "border-gray-200")}>
                agenndo.com.br/
              </span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className={cn("flex-1 h-full bg-transparent px-3 text-sm outline-none", surfaces.title)}
              />
            </div>
            <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">warning</span>
              Alterar o slug mudará seu link público. Avise seus clientes.
            </p>
          </div>
        </div>

        <SaveNegocioButton
          ref={saveBtnRef}
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

const SaveNegocioButton = forwardRef<
  HTMLButtonElement,
  {
    businessId: string | undefined;
    form: { businessName: string; phone: string; city: string; slug: string; segment: string };
    onSaved?: () => void;
    isDirty: boolean;
  }
>(function SaveNegocioButton({ businessId, form, onSaved, isDirty }, ref) {
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!businessId) return false;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
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
    if (error) return false;
    onSaved?.();
    return true;
  }, [businessId, form, onSaved]);

  useRegisterDashboardUnsavedNavigation(isDirty, handleSave, !!businessId);

  if (!businessId) return null;
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => void handleSave()}
      disabled={saving}
      className={`relative flex w-full items-center justify-center gap-2 px-4 py-4 text-black font-bold rounded-xl transition-all bg-primary hover:bg-primary/90 disabled:opacity-70 lg:pr-[4.75rem] ${
        isDirty ? "ring-2 ring-amber-500/45" : ""
      }`}
    >
      <span className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <span className="material-symbols-outlined shrink-0 text-base">save</span>
        {saving ? "Salvando..." : "Salvar alterações"}
      </span>
      {!saving ? <HotkeyHint action="save" variant="primary" layout="floating-end" /> : null}
    </button>
  );
});
