import { buildPublicSlugUrl, getSiteUrl } from "@/lib/site-url";
import {
  getPlan,
  getPaidTierPrice,
  isPaidPlanId,
  normalizePlanId,
  type PlanId,
} from "@/lib/plans";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appointmentActivityInstant, operacoesActivityMs, operacoesLastActivityIso } from "./activity-time";
import { classifyOperacoesRowKind } from "./classify-row";
import type { OperacoesOverview, UnifiedRow } from "./types";

const INACTIVE_DAYS = 30;

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function resolveActive(lastActivityIso: string, createdAt: string): "ativo" | "inativo" {
  const cutoff = new Date(daysAgoIso(INACTIVE_DAYS)).getTime();
  const ref = operacoesActivityMs(lastActivityIso || createdAt);
  return ref >= cutoff ? "ativo" : "inativo";
}

function monthlyPriceForPlan(plan: PlanId, recommended: number | null): number | null {
  if (plan === "plan_enterprise") return null;
  if (plan === "free") return 0;
  if (isPaidPlanId(plan)) return getPaidTierPrice(plan);
  if (recommended != null && !Number.isNaN(recommended)) return recommended;
  return getPlan(plan).price;
}

export async function fetchOperacoesOverview(
  supabase: SupabaseClient,
  opts?: { siteBase?: string }
): Promise<OperacoesOverview> {
  const [rows, aptCountRes, bizCountRes] = await Promise.all([
    fetchUnifiedRows(supabase, opts),
    supabase.from("appointments").select("*", { count: "exact", head: true }),
    supabase.from("businesses").select("*", { count: "exact", head: true }),
  ]);

  const byPlan: Record<string, number> = {};
  const planSummary = { free: 0, paid: 0, enterprise: 0 };
  let ativos = 0;
  let inativos = 0;
  let prestadores = 0;
  let funcionarios = 0;
  let clientes = 0;

  for (const r of rows) {
    if (r.kind === "prestador") prestadores++;
    else if (r.kind === "funcionario") funcionarios++;
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
    funcionarios,
    clientes,
    negocios: bizCountRes.count ?? 0,
    agendamentos: aptCountRes.count ?? 0,
    ativos,
    inativos,
    byPlan,
    planSummary,
  };
}

export async function fetchUnifiedRows(
  supabase: SupabaseClient,
  opts?: { siteBase?: string }
): Promise<UnifiedRow[]> {
  const siteBase = opts?.siteBase ?? getSiteUrl();

  const [bizRes, profRes, tokRes, cliRes, collabRes, aptRes, accountsRes] = await Promise.all([
    supabase
      .from("businesses")
      .select(
        "id, profile_id, name, slug, phone, plan, trial_ends_at, subscription_status, created_at, logo_url"
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, account_kind, created_at, recommended_price_display")
      .limit(500),
    supabase.from("user_impersonate_tokens").select("user_id, token_hash"),
    supabase
      .from("clients")
      .select("id, business_id, auth_user_id, name, phone, email, created_at")
      .limit(2000),
    supabase
      .from("collaborators")
      .select("id, business_id, auth_user_id, name, active")
      .not("auth_user_id", "is", null)
      .limit(1000),
    supabase
      .from("appointments")
      .select("business_id, client_id, date, created_at")
      .order("created_at", { ascending: false })
      .limit(15000),
    supabase.from("user_accounts").select("user_id, last_login_at, updated_at").limit(5000),
  ]);

  const businesses = bizRes.data ?? [];
  const profiles = profRes.data ?? [];
  const tokens = new Map((tokRes.data ?? []).map((t) => [t.user_id, t.token_hash]));
  const clients = cliRes.data ?? [];
  const collaborators = collabRes.data ?? [];

  const lastLoginByUser = new Map<string, string>();
  for (const ua of accountsRes.data ?? []) {
    if (!ua.user_id) continue;
    const loginAt =
      (typeof ua.last_login_at === "string" && ua.last_login_at) ||
      (typeof ua.updated_at === "string" && ua.updated_at) ||
      null;
    if (loginAt) lastLoginByUser.set(ua.user_id, loginAt);
  }

  const lastAptInstantByBusiness = new Map<string, number>();
  const lastAptByBusiness = new Map<string, string>();
  const lastAptInstantByClient = new Map<string, number>();
  const lastAptByClient = new Map<string, string>();
  for (const a of aptRes.data ?? []) {
    const created = typeof a.created_at === "string" ? a.created_at : "";
    if (!created) continue;
    const inst = appointmentActivityInstant(
      typeof a.date === "string" ? a.date : null,
      created
    );
    const iso = new Date(inst).toISOString();
    if (a.business_id) {
      const prev = lastAptInstantByBusiness.get(a.business_id);
      if (prev == null || inst > prev) {
        lastAptInstantByBusiness.set(a.business_id, inst);
        lastAptByBusiness.set(a.business_id, iso);
      }
    }
    if (a.client_id) {
      const prev = lastAptInstantByClient.get(a.client_id);
      if (prev == null || inst > prev) {
        lastAptInstantByClient.set(a.client_id, inst);
        lastAptByClient.set(a.client_id, iso);
      }
    }
  }

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const bizByProfile = new Map(businesses.map((b) => [b.profile_id, b]));
  const bizById = new Map(businesses.map((b) => [b.id, b]));

  /** auth_user_id já listado em `clients` — evita duplicar como profile. */
  const authUserIdsInClients = new Set(
    clients.map((c) => c.auth_user_id).filter((id): id is string => Boolean(id))
  );

  /** Colaborador ativo por auth_user_id (funcionário). */
  const collabByAuthUser = new Map<string, (typeof collaborators)[0]>();
  for (const c of collaborators) {
    if (!c.auth_user_id || !c.active) continue;
    if (!collabByAuthUser.has(c.auth_user_id)) {
      collabByAuthUser.set(c.auth_user_id, c);
    }
  }

  const profileIdsWithRow = new Set<string>();
  const rows: UnifiedRow[] = [];

  const activityFields = (
    authUserId: string | null,
    lastApt: string | null,
    createdAt: string
  ) => {
    const lastLoginAt = authUserId ? lastLoginByUser.get(authUserId) ?? null : null;
    const lastActivityAt = operacoesLastActivityIso({ lastLoginAt, lastAppointmentAt: lastApt, createdAt });
    return {
      lastLoginAt,
      lastAppointmentAt: lastApt,
      lastActivityAt,
      activeStatus: resolveActive(lastActivityAt, createdAt),
    };
  };

  // Donos de negocio (linha do negocio = prestador)
  for (const b of businesses) {
    const p = profileById.get(b.profile_id);
    profileIdsWithRow.add(b.profile_id);
    const plan = normalizePlanId(b.plan);
    const lastApt = lastAptByBusiness.get(b.id) ?? null;
    const accountKind = p?.account_kind ?? "business_owner";
    const activity = activityFields(b.profile_id, lastApt, b.created_at);
    rows.push({
      rowId: `prestador:${b.profile_id}`,
      kind: classifyOperacoesRowKind({
        accountKind,
        fromBusiness: true,
        fromClientsTable: false,
      }),
      source: "profiles",
      entityId: b.profile_id,
      businessId: b.id,
      profileId: b.profile_id,
      clientId: null,
      authUserId: b.profile_id,
      impersonateToken: tokens.get(b.profile_id) ?? null,
      publicSlug: b.slug,
      publicUrl: buildPublicSlugUrl(siteBase, b.slug),
      avatarUrl: b.logo_url ?? p?.avatar_url ?? null,
      name: b.name || p?.full_name || "—",
      email: p?.email ?? null,
      phone: b.phone ?? null,
      plan,
      planRaw: b.plan,
      monthlyPrice: monthlyPriceForPlan(
        plan,
        p?.recommended_price_display != null ? Number(p.recommended_price_display) : null
      ),
      trialEndsAt: b.trial_ends_at,
      subscriptionStatus: b.subscription_status,
      createdAt: b.created_at,
      ...activity,
      accountKind,
    });
  }

  // Perfis sem negócio próprio: classificar por account_kind
  for (const p of profiles) {
    if (profileIdsWithRow.has(p.id)) continue;

    const accountKind = p.account_kind ?? null;
    const kind = classifyOperacoesRowKind({
      accountKind,
      fromBusiness: false,
      fromClientsTable: false,
    });

    if (kind === "cliente" && authUserIdsInClients.has(p.id)) {
      continue;
    }

    profileIdsWithRow.add(p.id);

    let businessId: string | null = null;
    let publicSlug: string | null = null;
    let plan: PlanId = "free";
    let planRaw = "free";
    let trialEndsAt: string | null = null;
    let subscriptionStatus: string | null = null;
    let lastApt: string | null = null;
    let phone: string | null = null;

    if (kind === "funcionario") {
      const collab = collabByAuthUser.get(p.id);
      if (collab) {
        businessId = collab.business_id;
        const biz = bizById.get(collab.business_id);
        if (biz) {
          plan = normalizePlanId(biz.plan);
          planRaw = biz.plan;
          publicSlug = biz.slug;
          trialEndsAt = biz.trial_ends_at;
          subscriptionStatus = biz.subscription_status;
          lastApt = lastAptByBusiness.get(biz.id) ?? null;
          phone = biz.phone;
        }
      }
    }

    rows.push({
      rowId: `${kind}:${p.id}`,
      kind,
      source: "profiles",
      entityId: p.id,
      businessId,
      profileId: p.id,
      clientId: null,
      authUserId: p.id,
      impersonateToken: tokens.get(p.id) ?? null,
      publicSlug,
      publicUrl: buildPublicSlugUrl(siteBase, publicSlug),
      avatarUrl: p.avatar_url,
      name: p.full_name || p.email || "—",
      email: p.email,
      phone,
      plan,
      planRaw,
      monthlyPrice:
        kind === "prestador"
          ? monthlyPriceForPlan(
              plan,
              p.recommended_price_display != null ? Number(p.recommended_price_display) : null
            )
          : null,
      trialEndsAt,
      subscriptionStatus,
      createdAt: p.created_at,
      ...activityFields(p.id, lastApt, p.created_at),
      accountKind,
    });
  }

  // Clientes da agenda (com ou sem conta auth)
  for (const c of clients) {
    const biz = bizById.get(c.business_id);
    const plan = biz ? normalizePlanId(biz.plan) : ("free" as PlanId);
    const lastApt = lastAptByClient.get(c.id) ?? null;
    const profile = c.auth_user_id ? profileById.get(c.auth_user_id) : undefined;
    const accountKind = profile?.account_kind ?? (c.auth_user_id ? "client" : null);

    rows.push({
      rowId: `cliente:${c.id}`,
      kind: "cliente",
      source: "clients",
      entityId: c.id,
      businessId: c.business_id,
      profileId: c.auth_user_id,
      clientId: c.id,
      authUserId: c.auth_user_id,
      impersonateToken: c.auth_user_id ? tokens.get(c.auth_user_id) ?? null : null,
      publicSlug: biz?.slug ?? null,
      publicUrl: buildPublicSlugUrl(siteBase, biz?.slug ?? null),
      avatarUrl: profile?.avatar_url ?? null,
      name: c.name || profile?.full_name || "—",
      email: c.email ?? profile?.email ?? null,
      phone: c.phone ?? null,
      plan,
      planRaw: biz?.plan ?? "free",
      monthlyPrice: null,
      trialEndsAt: null,
      subscriptionStatus: biz?.subscription_status ?? null,
      createdAt: c.created_at,
      ...activityFields(c.auth_user_id, lastApt, c.created_at),
      accountKind,
    });
  }

  return rows;
}
