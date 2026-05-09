"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DashboardFullScreenOverlay,
  useFullScreenOverlayRequestClose,
} from "@/components/dashboard/dashboard-full-screen-overlay";
import { HotkeyHint } from "@/lib/dashboard-hotkeys";

function normDecimalInput(s: string) {
  return s.trim().replace(/\s/g, "").replace(",", ".");
}

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

function AppointmentValueFooter({
  loading,
  confirmLabel,
  value,
  onConfirmAction,
}: {
  loading: boolean;
  confirmLabel: string;
  value: string;
  onConfirmAction: () => boolean;
}) {
  const requestClose = useFullScreenOverlayRequestClose();
  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => void requestClose()}
        className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 pr-4 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50 sm:w-auto sm:min-w-[140px] lg:pr-[4.75rem]"
      >
        <span className="flex min-w-0 flex-1 justify-center">Cancelar</span>
        <HotkeyHint action="cancel" layout="floating-end" />
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => onConfirmAction()}
        className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 pr-4 text-sm font-bold text-black transition-colors hover:opacity-90 disabled:opacity-50 sm:min-w-[200px] sm:w-auto lg:pr-[4.75rem]"
      >
        <span className="flex min-w-0 flex-1 justify-center">{loading ? "Salvando…" : confirmLabel}</span>
        {!loading ? <HotkeyHint action="save" variant="primary" layout="floating-end" /> : null}
      </button>
    </>
  );
}

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

  const modalDirty = useMemo(
    () => normDecimalInput(value) !== normDecimalInput(initialValueReais),
    [value, initialValueReais]
  );

  const applyConfirm = () => {
    const t = normDecimalInput(value);
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) return false;
    onConfirm(Math.round(n * 100));
    return true;
  };

  const persistValue = async (): Promise<boolean> => {
    if (loading) return false;
    return applyConfirm();
  };

  const handleSaveShortcut = () => {
    if (loading) return;
    applyConfirm();
  };

  if (!open) return null;

  return (
    <DashboardFullScreenOverlay
      title={title}
      subtitle={subtitle}
      onClose={() => !loading && onClose()}
      closeOnEscape={!loading}
      closeBlocked={loading}
      contentMaxWidthClass="max-w-lg"
      dirty={modalDirty}
      onSaveBeforeClose={persistValue}
      hotkeys={{
        save: handleSaveShortcut,
      }}
      footer={
        <AppointmentValueFooter
          loading={loading}
          confirmLabel={confirmLabel}
          value={value}
          onConfirmAction={applyConfirm}
        />
      }
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <label className="block text-sm font-medium text-gray-700">
          Valor cobrado (R$)
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ex.: 80 ou 80,50"
            className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-4 text-2xl font-semibold tabular-nums text-gray-900 outline-none focus:border-primary sm:text-3xl"
          />
        </label>
        <p className="mt-4 text-sm leading-relaxed text-gray-500">
          Pode ser diferente do preço do serviço (desconto, taxa extra, etc.). O financeiro e o total do cliente usam este
          valor.
        </p>
      </div>
    </DashboardFullScreenOverlay>
  );
}
