import { getSiteUrl } from "@/lib/site-url";
import {
  getPlan,
  getPaidTierPrice,
  isPaidPlanId,
  normalizePlanId,
  type PlanId,
} from "@/lib/plans";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OperacoesOverview, UnifiedRow } from "./types";

const INACTIVE_DAYS = 30;

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function resolveActive(lastApt: string | null, createdAt: string): "ativo" | "inativo" {
  const cutoff = new Date(daysAgoIso(INACTIVE_DAYS)).getTime();
  const ref = lastApt ? new Date(lastApt).getTime() : new Date(createdAt).getTime();
  return ref >= cutoff ? "ativo" : "inativo";
}

function monthlyPriceForPlan(plan: PlanId, recommended: number | null): number | null {
  if (plan === "plan_enterprise") return null;
  if (plan === "free") return 0;
  if (isPaidPlanId(plan)) return getPaidTierPrice(plan);
  if (recommended != null && !Number.isNaN(recommended)) return recommended;
  return getPlan(plan).price;
}

export async function fetchOperacoesOverview(supabase: SupabaseClient): Promise<OperacoesOverview> {
  const [rows, aptCountRes, bizCountRes] = await Promise.all([
    fetchUnifiedRows(supabase),
    supabase.from("appointments").select("*", { count: "exact", head: true }),
    supabase.from("businesses").select("*", { count: "exact", head: true }),
  ]);

  const byPlan: Record<string, number> = {};
  const planSummary = { free: 0, paid: 0, enterprise: 0 };
  let ativos = 0;
  let inativos = 0;
  let prestadores = 0;
  let clientes = 0;

  for (const r of rows) {
    if (r.kind === "prestador") prestadores++;
    else clientes++;
    if (r.activeStatus === "ativo") ativos++;
    else inativos++;
    byPlan[r.plan] = (byPlan[r.plan] ?? 0) + 1;
    if (r.plan === "free") planSummary.free++;
    else if (r.plan === "plan_enterprise") planSummary.enterprise++;
    else if (isPaidPlanId(r.plan)) planSummary.paid++;
  }

  return {
    totalRows: rows.length,
    prestadores,
    clientes,
    negocios: bizCountRes.count ?? 0,
    agendamentos: aptCountRes.count ?? 0,
    ativos,
    inativos,
    byPlan,
    planSummary,
  };
}

export async function fetchUnifiedRows(supabase: SupabaseClient): Promise<UnifiedRow[]> {
  const siteBase = getSiteUrl();
  const cutoff = daysAgoIso(INACTIVE_DAYS);

  const [bizRes, profRes, tokRes, cliRes, aptRes] = await Promise.all([
    supabase
      .from("businesses")
      .select(
        "id, profile_id, name, slug, phone, plan, trial_ends_at, subscription_status, created_at, logo_url"
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("profiles").select("id, email, full_name, avatar_url, account_kind, created_at, recommended_price_display").limit(500),
    supabase.from("user_impersonate_tokens").select("user_id, token_hash"),
    supabase.from("clients").select("id, business_id, auth_user_id, name, phone, email, created_at").limit(2000),
    supabase
      .from("appointments")
      .select("business_id, client_id, date, created_at")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const businesses = bizRes.data ?? [];
  const profiles = profRes.data ?? [];
  const tokens = new Map((tokRes.data ?? []).map((t) => [t.user_id, t.token_hash]));
  const clients = cliRes.data ?? [];

  const lastAptByBusiness = new Map<string, string>();
  const lastAptByClient = new Map<string, string>();
  for (const a of aptRes.data ?? []) {
    const d = a.date ?? a.created_at;
    if (!d) continue;
    if (a.business_id && !lastAptByBusiness.has(a.business_id)) {
      lastAptByBusiness.set(a.business_id, d);
    }
    if (a.client_id && !lastAptByClient.has(a.client_id)) {
      lastAptByClient.set(a.client_id, d);
    }
  }

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const bizByProfile = new Map(businesses.map((b) => [b.profile_id, b]));

  const rows: UnifiedRow[] = [];

  for (const b of businesses) {
    const p = profileById.get(b.profile_id);
    const plan = normalizePlanId(b.plan);
    const lastApt = lastAptByBusiness.get(b.id) ?? null;
    rows.push({
      rowId: `prestador:${b.profile_id}`,
      kind: "prestador",
      source: "profiles",
      entityId: b.profile_id,
      businessId: b.id,
      profileId: b.profile_id,
      clientId: null,
      authUserId: b.profile_id,
      impersonateToken: tokens.get(b.profile_id) ?? null,
      publicSlug: b.slug,
      publicUrl: b.slug ? `${siteBase}/${encodeURIComponent(b.slug)}` : null,
      avatarUrl: b.logo_url ?? p?.avatar_url ?? null,
      name: b.name || p?.full_name || "—",
      email: p?.email ?? null,
      phone: b.phone ?? null,
      plan,
      planRaw: b.plan,
      monthlyPrice: monthlyPriceForPlan(plan, p?.recommended_price_display != null ? Number(p.recommended_price_display) : null),
      trialEndsAt: b.trial_ends_at,
      subscriptionStatus: b.subscription_status,
      createdAt: b.created_at,
      lastAppointmentAt: lastApt,
      activeStatus: resolveActive(lastApt, b.created_at),
      accountKind: p?.account_kind ?? null,
    });
  }

  for (const p of profiles) {
    if (bizByProfile.has(p.id)) continue;
    const plan: PlanId = "free";
    rows.push({
      rowId: `prestador:${p.id}`,
      kind: "prestador",
      source: "profiles",
      entityId: p.id,
      businessId: null,
      profileId: p.id,
      clientId: null,
      authUserId: p.id,
      impersonateToken: tokens.get(p.id) ?? null,
      publicSlug: null,
      publicUrl: null,
      avatarUrl: p.avatar_url,
      name: p.full_name || p.email || "—",
      email: p.email,
      phone: null,
      plan,
      planRaw: "free",
      monthlyPrice: monthlyPriceForPlan(plan, p.recommended_price_display != null ? Number(p.recommended_price_display) : null),
      trialEndsAt: null,
      subscriptionStatus: null,
      createdAt: p.created_at,
      lastAppointmentAt: null,
      activeStatus: resolveActive(null, p.created_at),
      accountKind: p.account_kind ?? null,
    });
  }

  const bizById = new Map(businesses.map((b) => [b.id, b]));

  for (const c of clients) {
    const biz = bizById.get(c.business_id);
    const plan = biz ? normalizePlanId(biz.plan) : ("free" as PlanId);
    const lastApt = lastAptByClient.get(c.id) ?? null;
    rows.push({
      rowId: `cliente:${c.id}`,
      kind: "cliente",
      source: "clients",
      entityId: c.id,
      businessId: c.business_id,
      profileId: null,
      clientId: c.id,
      authUserId: c.auth_user_id,
      impersonateToken: c.auth_user_id ? tokens.get(c.auth_user_id) ?? null : null,
      publicSlug: biz?.slug ?? null,
      publicUrl: biz?.slug ? `${siteBase}/${encodeURIComponent(biz.slug)}` : null,
      avatarUrl: null,
      name: c.name,
      email: c.email,
      phone: c.phone,
      plan,
      planRaw: biz?.plan ?? "free",
      monthlyPrice: null,
      trialEndsAt: null,
      subscriptionStatus: biz?.subscription_status ?? null,
      createdAt: c.created_at,
      lastAppointmentAt: lastApt,
      activeStatus: resolveActive(lastApt, c.created_at),
      accountKind: null,
    });
  }

  return rows;
}
