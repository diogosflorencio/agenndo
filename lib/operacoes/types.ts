import type { PlanId } from "@/lib/plans";

export type UnifiedRowKind = "prestador" | "cliente" | "funcionario";

export type UnifiedRow = {
  rowId: string;
  kind: UnifiedRowKind;
  source: "profiles" | "clients";
  entityId: string;
  businessId: string | null;
  profileId: string | null;
  clientId: string | null;
  authUserId: string | null;
  impersonateToken: string | null;
  publicSlug: string | null;
  publicUrl: string | null;
  avatarUrl: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  plan: PlanId;
  planRaw: string;
  monthlyPrice: number | null;
  trialEndsAt: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
  lastAppointmentAt: string | null;
  activeStatus: "ativo" | "inativo";
  accountKind: string | null;
};

export type OperacoesPlanSummary = {
  free: number;
  paid: number;
  enterprise: number;
};

export type OperacoesOverview = {
  totalRows: number;
  prestadores: number;
  funcionarios: number;
  clientes: number;
  negocios: number;
  agendamentos: number;
  ativos: number;
  inativos: number;
  byPlan: Record<string, number>;
  planSummary: OperacoesPlanSummary;
};

export type OperacoesSortKey =
  | "created_desc"
  | "created_asc"
  | "name_asc"
  | "name_desc"
  | "activity_desc"
  | "activity_asc"
  | "plan_asc"
  | "plan_desc";

export type ListFilters = {
  q: string;
  plan: string;
  kind: "all" | UnifiedRowKind;
  status: "all" | "ativo" | "inativo";
  sort: OperacoesSortKey;
  subscribersOnly: boolean;
  withNotesOnly: boolean;
};
