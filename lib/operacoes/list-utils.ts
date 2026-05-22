import { isPaidPlanId, PLAN_ORDER, type PlanId } from "@/lib/plans";
import type { OperacoesNoteEntry, OperacoesNotesMap } from "./notes-storage";
import { noteHasText } from "./notes-storage";
import type { OperacoesSortKey, UnifiedRow } from "./types";

const MAX_ROWS = 500;
export const OPERACOES_PAGE_SIZE = 50;

function planSortIndex(plan: PlanId): number {
  const i = PLAN_ORDER.indexOf(plan);
  return i >= 0 ? i : 0;
}

function activityTs(row: UnifiedRow): number {
  const ref = row.lastAppointmentAt ?? row.createdAt;
  return new Date(ref).getTime();
}

export function whatsAppHref(phone: string | null): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const n = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${n}`;
}

export function filterAndSortRows(
  rows: UnifiedRow[],
  filters: {
    q: string;
    plan: string;
    kind: "all" | "prestador" | "cliente";
    status: "all" | "ativo" | "inativo";
    sort: OperacoesSortKey;
    subscribersOnly: boolean;
    withNotesOnly: boolean;
    notesMap: OperacoesNotesMap;
  }
): UnifiedRow[] {
  let out = [...rows];
  const q = filters.q.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.email?.toLowerCase().includes(q) ?? false) ||
        (r.phone?.includes(q) ?? false) ||
        (r.publicSlug?.toLowerCase().includes(q) ?? false) ||
        r.entityId.toLowerCase().includes(q) ||
        r.rowId.toLowerCase().includes(q)
    );
  }
  if (filters.plan && filters.plan !== "all") {
    out = out.filter((r) => r.plan === filters.plan || r.planRaw === filters.plan);
  }
  if (filters.kind !== "all") {
    out = out.filter((r) => r.kind === filters.kind);
  }
  if (filters.status !== "all") {
    out = out.filter((r) => r.activeStatus === filters.status);
  }
  if (filters.subscribersOnly) {
    out = out.filter((r) => r.kind === "prestador" && r.plan !== "free");
  }
  if (filters.withNotesOnly) {
    out = out.filter((r) => noteHasText(filters.notesMap, r.rowId));
  }
  out.sort((a, b) => {
    switch (filters.sort) {
      case "created_asc":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "name_asc":
        return a.name.localeCompare(b.name, "pt-BR");
      case "name_desc":
        return b.name.localeCompare(a.name, "pt-BR");
      case "activity_asc":
        return activityTs(a) - activityTs(b);
      case "activity_desc":
        return activityTs(b) - activityTs(a);
      case "plan_asc":
        return planSortIndex(a.plan) - planSortIndex(b.plan);
      case "plan_desc":
        return planSortIndex(b.plan) - planSortIndex(a.plan);
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
  return out.slice(0, MAX_ROWS);
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    total,
    items: items.slice(start, start + pageSize),
  };
}

export function rowsToCsv(rows: UnifiedRow[], notesMap: OperacoesNotesMap): string {
  const header = [
    "tipo",
    "id",
    "nome",
    "email",
    "telefone",
    "plano",
    "valor_mensal",
    "trial_fim",
    "slug",
    "url_publica",
    "status",
    "tipo_conta",
    "criado_em",
    "ultimo_agendamento",
    "observacoes_local",
    "obs_feita",
  ];
  const lines = rows.map((r) => {
    const note = notesMap[r.rowId];
    return [
      r.kind,
      r.entityId,
      r.name,
      r.email ?? "",
      r.phone ?? "",
      r.plan,
      r.monthlyPrice ?? "",
      r.trialEndsAt ?? "",
      r.publicSlug ?? "",
      r.publicUrl ?? "",
      r.activeStatus,
      r.accountKind ?? "",
      r.createdAt,
      r.lastAppointmentAt ?? "",
      (note?.text ?? "").replace(/"/g, '""'),
      note?.done ? "sim" : "nao",
    ]
      .map((c) => `"${String(c)}"`)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}
