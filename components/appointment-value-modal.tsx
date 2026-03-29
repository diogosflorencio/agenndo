"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  initialValueReais: string;
  confirmLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (cents: number) => void;
};

export function AppointmentValueModal({
  open,
  title,
  subtitle,
  initialValueReais,
  confirmLabel = "Confirmar",
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const [value, setValue] = useState(initialValueReais);

  useEffect(() => {
    if (open) setValue(initialValueReais);
  }, [open, initialValueReais]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      onClick={() => !loading && onClose()}
    >
      <div
        className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        <label className="block text-xs font-medium text-gray-600 mt-4">
          Valor cobrado (R$)
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ex.: 80 ou 80,50"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
          />
        </label>
        <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
          Pode ser diferente do preço do serviço (desconto, taxa extra, etc.). O financeiro e o total do cliente usam
          este valor.
        </p>
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              const t = value.trim().replace(/\s/g, "").replace(",", ".");
              const n = Number(t);
              if (!Number.isFinite(n) || n < 0) return;
              onConfirm(Math.round(n * 100));
            }}
            className="flex-1 py-2.5 rounded-lg bg-primary text-black text-sm font-bold hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Salvando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
