"use client";

import Link from "next/link";
import { DashboardDialog } from "@/components/dashboard/dashboard-dialog";
import { getDashboardDialogUi } from "@/lib/dashboard-dialog-ui";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, formatCurrency, phoneToWhatsAppHref, type AppointmentStatus } from "@/lib/utils";
import { getAppointmentPaymentBadge } from "@/lib/appointment-payment-display";

export type AppointmentDetailRow = {
  id: string;
  client_id: string | null;
  date: string;
  time_start: string;
  time_end: string;
  price_cents: number;
  status: string;
  payment_status?: string | null;
  payment_due_cents?: number | null;
  payment_collected_cents?: number | null;
  appointment_payments?:
    | {
        provider_payment_id: string | null;
        status: string;
        amount_cents: number;
        payment_kind: string;
      }[]
    | null;
  client_name_snapshot: string | null;
  service_variant_label: string | null;
  clients: { name: string; phone: string | null } | null;
  services: { name: string } | null;
  collaborators: { id: string; name: string } | null;
};

function formatTime(t: string) {
  const [h, m] = t.split(":");
  return `${h}:${m ?? "00"}`;
}

type Props = {
  apt: AppointmentDetailRow | null;
  busyId: string | null;
  onClose: () => void;
  onWhatsApp: (apt: AppointmentDetailRow) => void;
  onCompareceu: (apt: AppointmentDetailRow) => void;
  onFaltou: (apt: AppointmentDetailRow) => void;
  onEditPaid: (apt: AppointmentDetailRow) => void;
};

export function AppointmentDetailModal({
  apt,
  busyId,
  onClose,
  onWhatsApp,
  onCompareceu,
  onFaltou,
  onEditPaid,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const ui = getDashboardDialogUi(isDark);

  if (!apt) return null;

  const conf = STATUS_CONFIG[apt.status as AppointmentStatus] ?? STATUS_CONFIG.agendado;
  const clientName = apt.clients?.name ?? apt.client_name_snapshot ?? "Cliente";
  const serviceName = apt.services?.name ?? "-";
  const collabName = apt.collaborators?.name ?? "-";
  const dateLabel = new Date(apt.date + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const waHref = apt.client_id ? phoneToWhatsAppHref(apt.clients?.phone) : null;
  const canMarkAttendance = apt.status === "agendado" || apt.status === "confirmado";
  const isBusy = busyId === apt.id;
  const payBadge = getAppointmentPaymentBadge(apt);

  return (
    <DashboardDialog
      open
      title="Detalhes do agendamento"
      subtitle={`${dateLabel} · ${formatTime(apt.time_start)} – ${formatTime(apt.time_end)}`}
      onClose={onClose}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center text-lg font-bold text-primary shrink-0">
            {clientName[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-lg font-bold", ui.title)}>{clientName}</p>
            <p className={cn("text-sm mt-0.5", ui.muted)}>
              {serviceName}
              {apt.service_variant_label ? ` (${apt.service_variant_label})` : ""}
            </p>
            <p className={cn("text-xs mt-1", ui.subtitle)}>Profissional: {collabName}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0",
              conf.bg,
              conf.color
            )}
          >
            <span className={cn("size-1.5 rounded-full", conf.dot)} />
            {conf.label}
          </span>
        </div>

        {payBadge ? (
          <div
            className={cn(
              "rounded-xl border px-3 py-2.5 text-xs",
              payBadge.tone === "warn"
                ? isDark
                  ? "border-amber-500/35 bg-amber-500/10 text-amber-100"
                  : "border-amber-200 bg-amber-50 text-amber-950"
                : payBadge.tone === "ok"
                  ? isDark
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                    : "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : isDark
                    ? "border-sky-500/30 bg-sky-500/10 text-sky-100"
                    : "border-sky-200 bg-sky-50 text-sky-950"
            )}
          >
            <p className="font-semibold">{payBadge.label}</p>
            {payBadge.hint ? <p className="opacity-85 mt-0.5 tabular-nums">{payBadge.hint}</p> : null}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className={cn("rounded-xl border p-3", ui.surface)}>
            <p className={cn("text-[11px] font-semibold uppercase tracking-wide", ui.subtitle)}>Horário</p>
            <p className={cn("font-bold mt-1", ui.title)}>
              {formatTime(apt.time_start)} – {formatTime(apt.time_end)}
            </p>
          </div>
          <div className={cn("rounded-xl border p-3", ui.surface)}>
            <p className={cn("text-[11px] font-semibold uppercase tracking-wide", ui.subtitle)}>Valor</p>
            <p className="font-bold text-primary mt-1">{formatCurrency(apt.price_cents / 100)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {apt.client_id ? (
            <Link
              href={`/dashboard/clientes/${apt.client_id}`}
              className={cn(
                "flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors",
                ui.btnGhost
              )}
            >
              <span className="material-symbols-outlined text-sm">visibility</span>
              Ver cliente
            </Link>
          ) : (
            <span
              className={cn(
                "flex items-center gap-1 px-3 py-2 text-xs rounded-lg cursor-not-allowed opacity-50",
                ui.btnGhost
              )}
              title="Agendamento sem cadastro de cliente"
            >
              <span className="material-symbols-outlined text-sm">visibility</span>
              Ver cliente
            </span>
          )}
          <button
            type="button"
            disabled={!waHref}
            onClick={() => waHref && onWhatsApp(apt)}
            title={
              !apt.client_id
                ? "Sem cliente cadastrado"
                : !waHref
                  ? "Cliente sem telefone cadastrado"
                  : "Abrir WhatsApp"
            }
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-45 disabled:cursor-not-allowed bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] disabled:hover:bg-[#25D366]/20"
          >
            <span className="material-symbols-outlined text-sm">chat</span>
            WhatsApp
          </button>
          {canMarkAttendance && (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onCompareceu(apt)}
                className="flex items-center gap-1 px-3 py-2 bg-primary/15 hover:bg-primary/25 disabled:opacity-50 text-primary text-xs font-semibold rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Compareceu
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onFaltou(apt)}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 disabled:opacity-50 text-xs font-semibold rounded-lg transition-colors",
                  isDark
                    ? "bg-red-500/15 hover:bg-red-500/25 text-red-300"
                    : "bg-red-50 hover:bg-red-100 text-red-700"
                )}
              >
                <span className="material-symbols-outlined text-sm">person_off</span>
                Faltou
              </button>
            </>
          )}
          {apt.status === "compareceu" && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onEditPaid(apt)}
              className={cn(
                "flex items-center gap-1 px-3 py-2 disabled:opacity-50 text-xs font-semibold rounded-lg transition-colors",
                ui.btnGhost
              )}
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Valor cobrado
            </button>
          )}
        </div>
      </div>
    </DashboardDialog>
  );
}
