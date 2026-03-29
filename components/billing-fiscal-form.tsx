"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onlyDigits, isValidBrazilianTaxId, type BillingFiscalFields } from "@/lib/billing-fiscal";
import { useAppAlert } from "@/components/app-alert-provider";
import { cn } from "@/lib/utils";

type Props = {
  businessId: string;
  business: BillingFiscalFields;
};

/** CPF/CNPJ para NF — preencher após assinar (nome/endereço vêm do Stripe). */
export function BillingDocumentForm({ businessId, business }: Props) {
  const router = useRouter();
  const { showAlert } = useAppAlert();
  const [saving, setSaving] = useState(false);
  const [document, setDocument] = useState("");

  useEffect(() => {
    setDocument(business.billing_document ?? "");
  }, [business.billing_document]);

  const docDigits = onlyDigits(document);
  const draftValid = docDigits.length > 0 && isValidBrazilianTaxId(docDigits);

  async function save() {
    if (!draftValid) return;
    setSaving(true);
    try {
      const res = await fetch("/api/business/billing-fiscal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessId,
          billing_document: document,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Erro ao salvar");
      showAlert("CPF/CNPJ salvo e enviado ao cadastro de cobrança.", { title: "Conta" });
      router.refresh();
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "Erro", { title: "CPF/CNPJ" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-1">CPF ou CNPJ (nota fiscal)</h3>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Nome e endereço de cobrança você já informa no checkout ou no portal Stripe. Aqui cadastramos só o CPF (pessoa
        física) ou CNPJ (empresa) para fins de nota e declaração de imposto.
      </p>
      <label className="block">
        <span className="text-[11px] font-semibold text-gray-600">CPF ou CNPJ</span>
        <input
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          className="mt-1 w-full max-w-md rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 font-mono tabular-nums"
          placeholder="Somente números"
          inputMode="numeric"
          autoComplete="off"
        />
      </label>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
        <button
          type="button"
          disabled={saving || !draftValid}
          onClick={() => void save()}
          className={cn(
            "py-2.5 px-4 rounded-xl text-sm font-bold transition-colors",
            draftValid ? "bg-primary text-black hover:bg-primary/90" : "bg-gray-200 text-gray-500 cursor-not-allowed"
          )}
        >
          {saving ? "Salvando…" : "Salvar CPF/CNPJ"}
        </button>
        {!draftValid && document.length > 0 && (
          <p className="text-[11px] text-amber-800">Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.</p>
        )}
        {draftValid && (
          <p className="text-[11px] text-emerald-800">Válido. Clique em salvar para registrar.</p>
        )}
      </div>
    </div>
  );
}

export { hasBillingDocument } from "@/lib/billing-fiscal";
