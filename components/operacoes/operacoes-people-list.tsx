"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { operacoesActivityMs } from "@/lib/operacoes/activity-time";
import { operacoesKindLabel } from "@/lib/operacoes/classify-row";
import {
  formatPrice,
  getPlan,
  normalizePlanId,
  PLAN_ORDER,
  type PlanId,
} from "@/lib/plans";
import type { OperacoesNoteEntry } from "@/lib/operacoes/notes-storage";
import { whatsAppHref } from "@/lib/operacoes/list-utils";
import { resolveRowPublicUrl } from "@/lib/operacoes/resolve-public-url";
import type { UnifiedRow, UnifiedRowKind } from "@/lib/operacoes/types";
import { OperacoesNoteButton } from "./operacoes-note-popup";
import { operacoesSurface, useOperacoesShell } from "./operacoes-shell";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    const ms = operacoesActivityMs(iso);
    if (Number.isNaN(ms)) return iso;
    return new Date(ms).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function AvatarBlock({
  row,
  onEnlarge,
  theme,
  compact,
}: {
  row: UnifiedRow;
  onEnlarge: (url: string) => void;
  theme: "dark" | "light";
  compact?: boolean;
}) {
  const size = compact ? "size-8" : "size-10";
  const img = compact ? 32 : 40;
  const ring = theme === "light" ? "ring-slate-200" : "ring-white/10";
  const fallbackBg =
    theme === "light" ? "bg-slate-200 text-emerald-900" : "bg-[#213428] text-[#4aad72]";

  if (row.avatarUrl) {
    return (
      <button
        type="button"
        onClick={() => onEnlarge(row.avatarUrl!)}
        className={`${size} rounded-full overflow-hidden ring-2 ${ring} shrink-0`}
      >
        <Image src={row.avatarUrl} alt="" width={img} height={img} className={`object-cover ${size}`} unoptimized />
      </button>
    );
  }
  return (
    <div
      className={`${size} rounded-full ${fallbackBg} flex items-center justify-center font-bold shrink-0 text-sm`}
    >
      {row.name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function KindBadge({ kind, s }: { kind: UnifiedRowKind; s: ReturnType<typeof operacoesSurface> }) {
  const cls =
    kind === "prestador"
      ? s.badgePrestador
      : kind === "funcionario"
        ? s.badgeFuncionario
        : s.badgeCliente;
  return (
    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${cls}`}>
      {operacoesKindLabel(kind)}
    </span>
  );
}

function StatusBadge({
  status,
  s,
  theme,
}: {
  status: "ativo" | "inativo";
  s: ReturnType<typeof operacoesSurface>;
  theme: "dark" | "light";
}) {
  const cls =
    status === "ativo"
      ? s.badgeAtivo
      : theme === "light"
        ? "bg-slate-200 text-slate-500"
        : "bg-[#0a120e] text-gray-500";
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cls}`}>{status}</span>;
}

function InnerTable({
  s,
  children,
}: {
  s: ReturnType<typeof operacoesSurface>;
  children: React.ReactNode;
}) {
  return <table className={s.innerTable}>{children}</table>;
}

function CopyChip({
  label,
  copiedLabel,
  value,
  copiedId,
  btn,
  s,
  onCopy,
}: {
  label: string;
  copiedLabel?: string;
  value: string;
  copiedId: string | null;
  btn: string;
  s: ReturnType<typeof operacoesSurface>;
  onCopy: (t: string) => void;
}) {
  const copied = copiedId === value;
  return (
    <button
      type="button"
      className={`${btn} transition-all duration-150 hover:scale-[1.04] active:scale-[0.96] ${
        copied ? s.btnPrimary : ""
      }`}
      onClick={() => onCopy(value)}
    >
      {copied ? (copiedLabel ?? "Copiado") : label}
    </button>
  );
}

function InfoCell({
  row,
  detailsCollapsed,
  showDetailsToggle,
  onToggleDetails,
  copiedId,
  s,
  btn,
  theme,
  onCopy,
}: {
  row: UnifiedRow;
  detailsCollapsed: boolean;
  showDetailsToggle: boolean;
  onToggleDetails: () => void;
  copiedId: string | null;
  s: ReturnType<typeof operacoesSurface>;
  btn: string;
  theme: "dark" | "light";
  onCopy: (t: string) => void;
}) {
  const wa = whatsAppHref(row.phone);
  const activity = row.lastAppointmentAt ?? row.createdAt;
  const kindLabel =
    row.kind === "cliente" && row.authUserId
      ? "Cliente com conta"
      : row.kind === "cliente"
        ? "Cliente (só agenda)"
        : row.kind === "funcionario"
          ? "Funcionário / colaborador"
          : row.accountKind === "business_owner"
            ? "Dono do negócio"
            : null;
  const publicUrl = resolveRowPublicUrl(row);
  const hasPublicLink = Boolean(row.publicSlug && publicUrl);

  return (
    <InnerTable s={s}>
      <tbody>
        <tr>
          <td className={s.labelCell}>Nome</td>
          <td className="py-1">
            <span className="font-semibold">{row.name}</span>{" "}
            <KindBadge kind={row.kind} s={s} />
            <StatusBadge status={row.activeStatus} s={s} theme={theme} />
          </td>
        </tr>
        {!detailsCollapsed ? (
          <>
            {row.publicSlug ? (
              <tr>
                <td className={s.labelCell}>Página</td>
                <td className={`py-1 ${s.muted}`}>
                  /{row.publicSlug}
                  {publicUrl ? (
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`ml-2 ${s.accent} hover:underline`}
                    >
                      abrir
                    </a>
                  ) : null}
                </td>
              </tr>
            ) : null}
            <tr>
              <td className={s.labelCell}>E-mail</td>
              <td className="py-1">
                {row.email ? (
                  <a href={`mailto:${row.email}`} className={s.accent}>
                    {row.email}
                  </a>
                ) : (
                  <span className={s.muted}>—</span>
                )}
              </td>
            </tr>
            <tr>
              <td className={s.labelCell}>Telefone</td>
              <td className="py-1">
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className={`${s.accent} hover:underline`}>
                    WhatsApp
                  </a>
                ) : row.phone ? (
                  row.phone
                ) : (
                  <span className={s.muted}>—</span>
                )}
              </td>
            </tr>
            {kindLabel ? (
              <tr>
                <td className={s.labelCell}>Perfil</td>
                <td className={`py-1 ${s.muted}`}>
                  {kindLabel}
                </td>
              </tr>
            ) : null}
            <tr>
              <td className={s.labelCell}>Cadastro</td>
              <td className={`py-1 ${s.muted}`}>
                {fmtDate(row.createdAt)}
              </td>
            </tr>
            <tr>
              <td className={s.labelCell}>Atividade</td>
              <td className={`py-1 ${s.muted}`}>
                {fmtDate(activity)}
              </td>
            </tr>
          </>
        ) : (
          <tr>
            <td className={s.labelCell}>Atividade</td>
            <td className={`py-1 ${s.muted}`}>
              {fmtDate(activity)}
            </td>
          </tr>
        )}
        <tr>
          <td className={s.labelCell}>Atalhos</td>
          <td className="py-1">
            <div className="flex flex-wrap gap-1">
              <CopyChip
                label="ID"
                copiedLabel="Copiado"
                value={row.entityId}
                copiedId={copiedId}
                btn={btn}
                s={s}
                onCopy={onCopy}
              />
              {hasPublicLink && publicUrl ? (
                <CopyChip
                  label="Link"
                  copiedLabel="Copiado"
                  value={publicUrl}
                  copiedId={copiedId}
                  btn={btn}
                  s={s}
                  onCopy={onCopy}
                />
              ) : null}
              {showDetailsToggle ? (
                <button
                  type="button"
                  className={`${btn} transition-all duration-150 hover:scale-[1.04] active:scale-[0.96]`}
                  onClick={onToggleDetails}
                >
                  {detailsCollapsed ? "Detalhes" : "Ocultar"}
                </button>
              ) : null}
            </div>
          </td>
        </tr>
      </tbody>
    </InnerTable>
  );
}

function PlanCell({
  row,
  detailsCollapsed,
  s,
}: {
  row: UnifiedRow;
  detailsCollapsed: boolean;
  s: ReturnType<typeof operacoesSurface>;
}) {
  return (
    <InnerTable s={s}>
      <tbody>
        <tr>
          <td className={s.labelCell}>Plano</td>
          <td className="py-1 font-medium">{getPlan(row.plan).label}</td>
        </tr>
        {!detailsCollapsed && row.kind === "prestador" && row.monthlyPrice != null ? (
          <tr>
            <td className={s.labelCell}>Valor</td>
            <td className={`py-1 ${s.accent}`}>
              {formatPrice(row.monthlyPrice)}/mês
            </td>
          </tr>
        ) : null}
        {!detailsCollapsed && row.trialEndsAt ? (
          <tr>
            <td className={s.labelCell}>Trial</td>
            <td className={`py-1 ${s.muted}`}>
              {fmtDate(row.trialEndsAt)}
            </td>
          </tr>
        ) : null}
      </tbody>
    </InnerTable>
  );
}

function ActionsCell({
  row,
  planPick,
  setPlanPick,
  s,
  btn,
  theme,
  copiedId,
  onExtendTrial,
  onChangePlan,
  onCopy,
  onDelete,
}: {
  row: UnifiedRow;
  planPick: PlanId;
  setPlanPick: (p: PlanId) => void;
  s: ReturnType<typeof operacoesSurface>;
  btn: string;
  theme: "dark" | "light";
  copiedId: string | null;
  onExtendTrial: (businessId: string, days: number) => void;
  onChangePlan: (businessId: string, plan: PlanId) => void;
  onCopy: (t: string) => void;
  onDelete: (row: UnifiedRow) => void;
}) {
  return (
    <InnerTable s={s}>
      <tbody>
        {row.kind === "prestador" && row.businessId ? (
          <>
            <tr>
              <td className={s.labelCell}>Trial</td>
              <td className="py-1">
                <div className="flex flex-wrap gap-1">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`${btn} transition-all duration-150 hover:scale-[1.04] active:scale-[0.96]`}
                      onClick={() => onExtendTrial(row.businessId!, d)}
                    >
                      +{d}d
                    </button>
                  ))}
                </div>
              </td>
            </tr>
            <tr>
              <td className={s.labelCell}>Plano</td>
              <td className="py-1">
                <div className="flex flex-wrap gap-1 items-center">
                  <select
                    value={planPick}
                    onChange={(e) => setPlanPick(normalizePlanId(e.target.value))}
                    className={`h-8 rounded border px-2 text-[11px] min-w-[5rem] ${s.input}`}
                  >
                    {PLAN_ORDER.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onChangePlan(row.businessId!, planPick)}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150 hover:scale-[1.04] active:scale-[0.96] ${s.btnPrimary}`}
                  >
                    Aplicar
                  </button>
                </div>
              </td>
            </tr>
          </>
        ) : null}
        {row.impersonateToken ? (
          <tr>
            <td className={s.labelCell}>Token</td>
            <td className="py-1">
              <CopyChip
                label="Copiar"
                copiedLabel="Copiado!"
                value={row.impersonateToken}
                copiedId={copiedId}
                btn={btn}
                s={s}
                onCopy={onCopy}
              />
            </td>
          </tr>
        ) : null}
        <tr>
          <td className={s.labelCell}>Conta</td>
          <td className="py-1">
            {row.kind === "funcionario" ? (
              <span className={`text-[11px] ${s.muted}`}>Remover no painel do negócio</span>
            ) : (
              <button
                type="button"
                onClick={() => onDelete(row)}
                className={`text-[11px] font-semibold px-2 py-1 rounded-md transition-all duration-150 hover:scale-[1.04] active:scale-[0.96] ${theme === "light" ? "text-red-700 hover:bg-red-50" : "text-red-400 hover:bg-red-500/10"}`}
              >
                Excluir
              </button>
            )}
          </td>
        </tr>
      </tbody>
    </InnerTable>
  );
}

function PersonRow({
  row,
  note,
  theme,
  s,
  btn,
  copiedId,
  detailsCollapsed,
  showDetailsToggle,
  onToggleDetails,
  onCopy,
  onEnlarge,
  onNoteChange,
  onExtendTrial,
  onChangePlan,
  onDelete,
}: {
  row: UnifiedRow;
  note?: OperacoesNoteEntry;
  theme: "dark" | "light";
  s: ReturnType<typeof operacoesSurface>;
  btn: string;
  copiedId: string | null;
  detailsCollapsed: boolean;
  showDetailsToggle: boolean;
  onToggleDetails: () => void;
  onCopy: (t: string) => void;
  onEnlarge: (url: string) => void;
  onNoteChange: (rowId: string, patch: Partial<OperacoesNoteEntry>) => void;
  onExtendTrial: (businessId: string, days: number) => void;
  onChangePlan: (businessId: string, plan: PlanId) => void;
  onDelete: (row: UnifiedRow) => void;
}) {
  const [planPick, setPlanPick] = useState(row.plan);

  return (
    <tr
      className={`border-b ${s.border} ${detailsCollapsed ? s.rowCollapsed : ""} ${theme === "light" ? "hover:bg-slate-50/50" : "hover:bg-white/[0.02]"}`}
    >
      <td className="p-3 w-14 align-top">
        <AvatarBlock row={row} onEnlarge={onEnlarge} theme={theme} compact={detailsCollapsed} />
      </td>
      <td className="p-3 min-w-[220px] align-top">
        <InfoCell
          row={row}
          detailsCollapsed={detailsCollapsed}
          showDetailsToggle={showDetailsToggle}
          onToggleDetails={onToggleDetails}
          copiedId={copiedId}
          s={s}
          btn={btn}
          theme={theme}
          onCopy={onCopy}
        />
      </td>
      <td className="p-3 min-w-[140px] align-top">
        <PlanCell row={row} detailsCollapsed={detailsCollapsed} s={s} />
      </td>
      <td className="p-3 w-12 align-top">
        <OperacoesNoteButton
          rowId={row.rowId}
          rowName={row.name}
          note={note}
          s={s}
          onSave={(patch) => onNoteChange(row.rowId, patch)}
        />
      </td>
      <td className="p-3 min-w-[200px] align-top">
        <ActionsCell
          row={row}
          planPick={planPick}
          setPlanPick={setPlanPick}
          s={s}
          btn={btn}
          theme={theme}
          copiedId={copiedId}
          onExtendTrial={onExtendTrial}
          onChangePlan={onChangePlan}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}

export function OperacoesPeopleList({
  rows,
  notesMap,
  onNoteChange,
  onCopy,
  copiedId,
  onExtendTrial,
  onChangePlan,
  onDelete,
}: {
  rows: UnifiedRow[];
  notesMap: Record<string, OperacoesNoteEntry>;
  onNoteChange: (rowId: string, patch: Partial<OperacoesNoteEntry>) => void;
  onCopy: (t: string) => void;
  copiedId: string | null;
  onExtendTrial: (businessId: string, days: number) => void;
  onChangePlan: (businessId: string, plan: PlanId) => void;
  onDelete: (row: UnifiedRow) => void;
}) {
  const { theme, isKindCollapsed, collapseMode } = useOperacoesShell();
  const s = operacoesSurface(theme);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [pinnedExpanded, setPinnedExpanded] = useState<Set<string>>(() => new Set());

  const isCollapsed = (row: UnifiedRow) => isKindCollapsed(row.kind) && !pinnedExpanded.has(row.rowId);

  const toggleRowExpand = (rowId: string) => {
    setPinnedExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const btn = `px-2 py-1 rounded-md text-[11px] font-medium ${s.btnGhost}`;

  useEffect(() => {
    setPinnedExpanded(new Set());
  }, [collapseMode]);

  return (
    <>
      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
          role="presentation"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      <div className={`overflow-x-auto rounded-lg border ${s.border} ${s.table}`}>
        <table className="w-full text-sm text-left min-w-[720px]">
          <thead>
            <tr className={`text-[10px] uppercase tracking-wide ${s.muted} border-b ${s.border} bg-black/20`}>
              <th className="p-3 w-14" />
              <th className="p-3 min-w-[220px]">Informações</th>
              <th className="p-3 min-w-[140px]">Plano</th>
              <th className="p-3 w-12 text-center">Obs</th>
              <th className="p-3 min-w-[200px]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <PersonRow
                key={row.rowId}
                row={row}
                note={notesMap[row.rowId]}
                theme={theme}
                s={s}
                btn={btn}
                copiedId={copiedId}
                detailsCollapsed={isCollapsed(row)}
                showDetailsToggle={isKindCollapsed(row.kind)}
                onToggleDetails={() => toggleRowExpand(row.rowId)}
                onCopy={onCopy}
                onEnlarge={setLightboxUrl}
                onNoteChange={onNoteChange}
                onExtendTrial={onExtendTrial}
                onChangePlan={onChangePlan}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
