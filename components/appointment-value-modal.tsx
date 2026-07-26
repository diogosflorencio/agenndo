"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DashboardDialog,
  useDashboardDialogRequestClose,
} from "@/components/dashboard/dashboard-dialog";
import { getDashboardDialogUi } from "@/lib/dashboard-dialog-ui";
import { HotkeyHint } from "@/lib/dashboard-hotkeys";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

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
  onConfirmAction,
  ui,
}: {
  loading: boolean;
  confirmLabel: string;
  onConfirmAction: () => boolean;
  ui: ReturnType<typeof getDashboardDialogUi>;
}) {
  const requestClose = useDashboardDialogRequestClose();
  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => void requestClose()}
        className={cn(
          "relative inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 sm:w-auto sm:min-w-[120px]",
          ui.btnSecondary
        )}
      >
        <span className="flex min-w-0 flex-1 justify-center">Cancelar</span>
        <HotkeyHint action="cancel" layout="floating-end" />
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => onConfirmAction()}
        className="relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 pr-4 text-sm font-bold text-on-brand-accent transition-colors hover:opacity-90 disabled:opacity-50 sm:min-w-[180px] sm:w-auto lg:pr-[4.75rem]"
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const ui = getDashboardDialogUi(isDark);
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

  return (
    <DashboardDialog
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={() => !loading && onClose()}
      closeOnEscape={!loading}
      closeBlocked={loading}
      maxWidthClass="max-w-md"
      dirty={modalDirty}
      onSaveBeforeClose={persistValue}
      hotkeys={{
        save: handleSaveShortcut,
      }}
      footer={
        <AppointmentValueFooter
          loading={loading}
          confirmLabel={confirmLabel}
          onConfirmAction={applyConfirm}
          ui={ui}
        />
      }
    >
      <div className={cn("rounded-xl border p-4 sm:p-5", ui.surface)}>
        <label className={cn("block text-sm font-medium", ui.label)}>
          Valor cobrado (R$)
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ex.: 80 ou 80,50"
            className={cn(
              "mt-2 w-full rounded-xl border px-4 py-3 text-2xl font-semibold tabular-nums outline-none focus:border-primary sm:text-3xl",
              ui.input
            )}
          />
        </label>
        <p className={cn("mt-3 text-sm leading-relaxed", ui.muted)}>
          Pode ser diferente do preço do serviço (desconto, taxa extra, etc.). O financeiro e o total do cliente usam
          este valor.
        </p>
      </div>
    </DashboardDialog>
  );
}
