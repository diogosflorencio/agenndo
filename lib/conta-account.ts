import type { VisitedPublicPage } from "@/lib/visited-public-pages";

export type ClientLink = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  total_appointments: number;
  total_spent_cents: number;
  businesses: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

export type AptRow = {
  id: string;
  date: string;
  time_start: string;
  time_end: string;
  status: string;
  price_cents: number;
  client_id: string;
  services: { name: string } | { name: string }[] | null;
  collaborators: { name: string } | { name: string }[] | null;
};

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type BusinessEntry = {
  slug: string;
  name: string;
  clientId: string | null;
  visitedAt: number | null;
  totalSpentCents: number;
  totalAppointments: number;
};

export type MonthlySpend = {
  key: string;
  label: string;
  cents: number;
};

export type BusinessSpend = {
  slug: string;
  name: string;
  clientId: string | null;
  spentCents: number;
  appointments: number;
};

export type ClientAccountStats = {
  totalSpentCents: number;
  completedSpendCents: number;
  upcomingCount: number;
  totalAppointments: number;
  completedCount: number;
  businessesCount: number;
  monthlySpend: MonthlySpend[];
  spendByBusiness: BusinessSpend[];
};

export function bizLabel(b: ClientLink["businesses"]) {
  if (!b) return "Negócio";
  if (Array.isArray(b)) return b[0]?.name ?? "Negócio";
  return b.name ?? "Negócio";
}

export function bizSlug(b: ClientLink["businesses"]) {
  if (!b) return null;
  if (Array.isArray(b)) return b[0]?.slug ?? null;
  return b.slug ?? null;
}

export function embedName(embed: { name: string } | { name: string }[] | null | undefined) {
  if (!embed) return "-";
  if (Array.isArray(embed)) return embed[0]?.name ?? "-";
  return embed.name ?? "-";
}

export function aptInstant(a: AptRow) {
  return new Date(`${a.date}T${String(a.time_start).slice(0, 5)}:00`);
}

export function isUpcoming(a: AptRow, nowMs = Date.now()) {
  return (a.status === "agendado" || a.status === "confirmado") && aptInstant(a).getTime() >= nowMs;
}

export function buildUniqueBusinesses(links: ClientLink[], visited: VisitedPublicPage[]): BusinessEntry[] {
  const bySlug = new Map<string, BusinessEntry>();

  for (const l of links) {
    const slug = bizSlug(l.businesses);
    if (!slug) continue;
    const name = bizLabel(l.businesses);
    const prev = bySlug.get(slug);
    bySlug.set(slug, {
      slug,
      name,
      clientId: prev?.clientId ?? l.id,
      visitedAt: prev?.visitedAt ?? null,
      totalSpentCents: (prev?.totalSpentCents ?? 0) + l.total_spent_cents,
      totalAppointments: (prev?.totalAppointments ?? 0) + l.total_appointments,
    });
  }

  for (const v of visited) {
    const prev = bySlug.get(v.slug);
    if (prev) {
      if (v.visitedAt > (prev.visitedAt ?? 0)) prev.visitedAt = v.visitedAt;
      if (!prev.name || prev.name === prev.slug) prev.name = v.name;
      continue;
    }
    bySlug.set(v.slug, {
      slug: v.slug,
      name: v.name,
      clientId: null,
      visitedAt: v.visitedAt,
      totalSpentCents: 0,
      totalAppointments: 0,
    });
  }

  return Array.from(bySlug.values()).sort((a, b) => {
    const ta = a.visitedAt ?? 0;
    const tb = b.visitedAt ?? 0;
    if (tb !== ta) return tb - ta;
    if (b.totalSpentCents !== a.totalSpentCents) return b.totalSpentCents - a.totalSpentCents;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

export function buildMonthlySpend(appointments: AptRow[], months = 6): MonthlySpend[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const byKey = new Map(keys.map((k) => [k, 0]));
  for (const a of appointments) {
    if (a.status !== "compareceu") continue;
    const k = monthKey(a.date);
    if (byKey.has(k)) byKey.set(k, (byKey.get(k) ?? 0) + a.price_cents);
  }

  return keys.map((key) => ({
    key,
    label: monthLabel(key),
    cents: byKey.get(key) ?? 0,
  }));
}

export function computeClientStats(
  links: ClientLink[],
  appointments: AptRow[],
  businesses: BusinessEntry[]
): ClientAccountStats {
  const nowMs = Date.now();
  const totalSpentCents = links.reduce((s, l) => s + l.total_spent_cents, 0);
  const completed = appointments.filter((a) => a.status === "compareceu");
  const completedSpendCents = completed.reduce((s, a) => s + a.price_cents, 0);
  const upcomingCount = appointments.filter((a) => isUpcoming(a, nowMs)).length;

  const spendByBusiness: BusinessSpend[] = businesses
    .map((b) => ({
      slug: b.slug,
      name: b.name,
      clientId: b.clientId,
      spentCents: b.totalSpentCents,
      appointments: b.totalAppointments,
    }))
    .sort((a, b) => b.spentCents - a.spentCents);

  return {
    totalSpentCents,
    completedSpendCents,
    upcomingCount,
    totalAppointments: appointments.length,
    completedCount: completed.length,
    businessesCount: businesses.length,
    monthlySpend: buildMonthlySpend(appointments),
    spendByBusiness,
  };
}

export function pickDefaultPhone(links: ClientLink[]): string {
  const counts = new Map<string, number>();
  for (const l of links) {
    const digits = (l.phone ?? "").replace(/\D/g, "");
    if (!digits) continue;
    counts.set(digits, (counts.get(digits) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [digits, count] of Array.from(counts.entries())) {
    if (count > bestCount) {
      best = digits;
      bestCount = count;
    }
  }
  return best;
}

export function initialsFromName(name: string | null | undefined, email: string | null | undefined) {
  const n = (name ?? "").trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  const e = (email ?? "").trim();
  if (e) return e.slice(0, 2).toUpperCase();
  return "?";
}
