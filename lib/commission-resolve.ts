export type CommissionCalculationBase = "gross" | "net";

export type CommissionRuleSource =
  | "service_collaborator"
  | "collaborator_default"
  | "service_default"
  | "business_default";

export function computeCommissionBaseAmount(opts: {
  priceCents: number;
  processorFeeCents: number;
  calculationBase: CommissionCalculationBase;
}): number {
  const { priceCents, processorFeeCents, calculationBase } = opts;
  const fee = Math.max(0, processorFeeCents);
  if (calculationBase === "gross") return Math.max(0, priceCents);
  return Math.max(0, priceCents - fee);
}

export function computeCommissionAmountCents(baseCents: number, percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0 || baseCents <= 0) return 0;
  return Math.round((baseCents * percent) / 100);
}

export function resolveCommissionPercent(opts: {
  defaultPercent: number;
  collaboratorDefaultPercent: number | null;
  serviceOnlyPercent: number | null;
  serviceCollaboratorPercent: number | null;
}): { percent: number; ruleSource: CommissionRuleSource } {
  const sc = opts.serviceCollaboratorPercent;
  if (sc != null && Number.isFinite(sc)) {
    return { percent: clampPercent(sc), ruleSource: "service_collaborator" };
  }
  const cd = opts.collaboratorDefaultPercent;
  if (cd != null && Number.isFinite(cd)) {
    return { percent: clampPercent(cd), ruleSource: "collaborator_default" };
  }
  const so = opts.serviceOnlyPercent;
  if (so != null && Number.isFinite(so)) {
    return { percent: clampPercent(so), ruleSource: "service_default" };
  }
  return { percent: clampPercent(opts.defaultPercent), ruleSource: "business_default" };
}

function clampPercent(p: number): number {
  if (!Number.isFinite(p) || p < 0) return 0;
  if (p > 100) return 100;
  return p;
}
