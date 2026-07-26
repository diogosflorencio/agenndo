"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/lib/auth/browser-auth-store";
import { formatCurrency } from "@/lib/utils";
import { STATUS_CONFIG } from "@/lib/utils";
import { getPublicBookUi } from "@/lib/public-book-ui";
import {
  aptInstant,
  buildUniqueBusinesses,
  computeClientStats,
  embedName,
  initialsFromName,
  isUpcoming,
  pickDefaultPhone,
  type AptRow,
  type ClientLink,
  type UserProfile,
  bizLabel,
  bizSlug,
} from "@/lib/conta-account";
import {
  clearVisitedPublicPages,
  formatVisitedRelative,
  getVisitedPublicPages,
  type VisitedPublicPage,
} from "@/lib/visited-public-pages";
import { useAppAlert } from "@/components/app-alert-provider";
import { clearImpersonationSession } from "@/lib/auth/impersonation-client";
import { formatBrazilPhoneFromDigits, maskPhoneInputRaw, phoneDigitsOnly } from "@/lib/phone-mask";
import { cn } from "@/lib/utils";

type Tab = "overview" | "appointments" | "businesses" | "account";
type AptFilter = "all" | "upcoming" | "history";

const TABS: { id: Tab; label: string; icon: string; short: string }[] = [
  { id: "overview", label: "Visão geral", icon: "dashboard", short: "Início" },
  { id: "appointments", label: "Agendamentos", icon: "calendar_month", short: "Agenda" },
  { id: "businesses", label: "Negócios", icon: "storefront", short: "Lojas" },
  { id: "account", label: "Minha conta", icon: "person", short: "Conta" },
];

const ui = getPublicBookUi(true);
const tooltipStyle = {
  background: "#0f1c15",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  fontSize: "12px",
};
const tooltipLabelStyle = { color: "#e5e7eb" };

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.agendado;
  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium capitalize", cfg.bg, cfg.color)}>
      {cfg.label}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", ui.accentCard)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-white mt-1 truncate">{value}</p>
          {hint ? <p className="text-[11px] text-gray-500 mt-1">{hint}</p> : null}
        </div>
        <span className={cn("material-symbols-outlined text-2xl shrink-0", ui.accentIcon)}>{icon}</span>
      </div>
    </div>
  );
}

function TabNav({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <>
      <nav className="hidden lg:flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors",
              tab === t.id ? "bg-primary/15 text-primary" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#080c0a]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors",
                tab === t.id ? "text-primary" : "text-gray-500"
              )}
            >
              <span className="material-symbols-outlined text-[22px]">{t.icon}</span>
              {t.short}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

export default function ClientDashboard() {
  const { showAlert } = useAppAlert();
  const router = useRouter();
  const auth = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [aptFilter, setAptFilter] = useState<AptFilter>("all");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [links, setLinks] = useState<ClientLink[]>([]);
  const [appointments, setAppointments] = useState<AptRow[]>([]);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [visitedPages, setVisitedPages] = useState<VisitedPublicPage[]>([]);

  const refreshVisited = useCallback(() => {
    setVisitedPages(getVisitedPublicPages());
  }, []);

  useEffect(() => {
    refreshVisited();
    const onUpdate = () => refreshVisited();
    window.addEventListener("agenndo:visited-public-updated", onUpdate);
    window.addEventListener("focus", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("agenndo:visited-public-updated", onUpdate);
      window.removeEventListener("focus", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refreshVisited]);

  const load = useCallback(async (signal?: { cancelled: boolean }, userId?: string | null) => {
    const cancelled = () => signal?.cancelled === true;
    setLoading(true);
    try {
      const supabase = createClient();
      let uid = userId ?? auth.userId;
      if (!uid) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        uid = session?.user?.id ?? null;
      }
      if (cancelled()) return;
      if (!uid) {
        router.replace(`/entrar?next=${encodeURIComponent("/conta")}`);
        return;
      }
      const email =
        auth.userEmail ??
        (await supabase.auth.getSession()).data.session?.user?.email ??
        null;
      setUserEmail(email);

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .eq("id", uid)
        .maybeSingle();
      if (cancelled()) return;
      setProfile((prof as UserProfile | null) ?? null);

      const { data: clientRows } = await supabase
        .from("clients")
        .select(
          "id, business_id, name, phone, email, total_appointments, total_spent_cents, businesses(name, slug)"
        )
        .eq("auth_user_id", uid)
        .order("created_at", { ascending: false });

      const rows = (clientRows ?? []) as unknown as ClientLink[];
      if (cancelled()) return;
      setLinks(rows);

      const ids = rows.map((r) => r.id);
      if (ids.length === 0) {
        setAppointments([]);
        return;
      }

      const { data: apts } = await supabase
        .from("appointments")
        .select(
          "id, date, time_start, time_end, status, price_cents, client_id, services(name), collaborators(name)"
        )
        .in("client_id", ids)
        .order("date", { ascending: false })
        .order("time_start", { ascending: false });

      if (cancelled()) return;
      setAppointments((apts ?? []) as unknown as AptRow[]);
    } catch (e) {
      console.error("[conta] load failed", e);
    } finally {
      if (!cancelled()) setLoading(false);
    }
  }, [router, auth.userId, auth.userEmail]);

  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.userId) {
      router.replace(`/entrar?next=${encodeURIComponent("/conta")}`);
      return;
    }
    const signal = { cancelled: false };
    void load(signal, auth.userId);
    return () => {
      signal.cancelled = true;
    };
  }, [auth.ready, auth.userId, load, router]);

  const businesses = useMemo(() => buildUniqueBusinesses(links, visitedPages), [links, visitedPages]);
  const clientLinkById = useMemo(() => new Map(links.map((l) => [l.id, l])), [links]);
  const stats = useMemo(() => computeClientStats(links, appointments, businesses), [links, appointments, businesses]);

  const nowMs = Date.now();
  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => isUpcoming(a, nowMs))
        .sort((x, y) => aptInstant(x).getTime() - aptInstant(y).getTime()),
    [appointments, nowMs]
  );
  const history = useMemo(
    () =>
      appointments
        .filter((a) => !isUpcoming(a, nowMs))
        .sort((x, y) => aptInstant(y).getTime() - aptInstant(x).getTime()),
    [appointments, nowMs]
  );

  const filteredAppointments = aptFilter === "upcoming" ? upcoming : aptFilter === "history" ? history : appointments;

  const displayName = profile?.full_name?.trim() || links[0]?.name || userEmail?.split("@")[0] || "Cliente";
  const initials = initialsFromName(profile?.full_name ?? links[0]?.name, userEmail);

  const cancel = async (id: string) => {
    setCancelingId(id);
    try {
      const res = await fetch("/api/public/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appointmentId: id }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Não foi possível cancelar");
      await load();
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "Erro", { title: "Cancelar agendamento" });
    } finally {
      setCancelingId(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await clearImpersonationSession();
    } catch {
      /* best-effort */
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/entrar");
    router.refresh();
  };

  if (!auth.ready || loading) {
    return (
      <div className={cn(ui.page, "flex items-center justify-center min-h-screen")}>
        <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const chartData = stats.monthlySpend.map((m) => ({
    label: m.label,
    value: m.cents / 100,
  }));

  return (
    <div className={cn(ui.page, "text-white min-h-screen pb-24 lg:pb-8")}>
      <header className={cn("border-b backdrop-blur-md sticky top-0 z-30", ui.header)}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="size-10 rounded-full object-cover border border-white/10" />
            ) : (
              <div className="size-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate">{displayName}</h1>
              <p className="text-xs text-gray-500 truncate">{userEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" className="hidden sm:inline text-xs text-gray-400 hover:text-white px-2 py-2">
              Início
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-white/15 hover:bg-white/5"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 lg:py-8">
        <TabNav tab={tab} onTab={setTab} />

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                icon="payments"
                label="Total gasto"
                value={formatCurrency(stats.totalSpentCents / 100)}
                hint={stats.completedSpendCents !== stats.totalSpentCents ? "Registrado nos negócios" : undefined}
              />
              <StatCard icon="event_upcoming" label="Próximos" value={String(stats.upcomingCount)} />
              <StatCard icon="check_circle" label="Concluídos" value={String(stats.completedCount)} />
              <StatCard icon="storefront" label="Negócios" value={String(stats.businessesCount)} />
            </div>

            <div className="grid lg:grid-cols-5 gap-4 lg:gap-6">
              <section className={cn("lg:col-span-3 rounded-2xl border p-4 sm:p-5", ui.card)}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-white">Gastos por mês</h2>
                  <span className="text-[11px] text-gray-500">Últimos 6 meses · visitas concluídas</span>
                </div>
                {chartData.every((d) => d.value === 0) ? (
                  <p className="text-sm text-gray-500 py-8 text-center">
                    Ainda não há gastos registrados. Após comparecer aos agendamentos, o gráfico aparece aqui.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} barSize={28}>
                      <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelStyle={tooltipLabelStyle}
                        itemStyle={{ color: "#13EC5B" }}
                        formatter={(v: number) => [formatCurrency(v), "Gasto"]}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.value > 0 ? "#13EC5B" : "rgba(255,255,255,0.08)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </section>

              <section className={cn("lg:col-span-2 rounded-2xl border p-4 sm:p-5", ui.card)}>
                <h2 className="text-sm font-bold text-white mb-3">Onde você mais gastou</h2>
                {stats.spendByBusiness.filter((b) => b.spentCents > 0).length === 0 ? (
                  <p className="text-sm text-gray-500">Sem histórico de gastos ainda.</p>
                ) : (
                  <ul className="space-y-3">
                    {stats.spendByBusiness
                      .filter((b) => b.spentCents > 0)
                      .slice(0, 5)
                      .map((b) => {
                        const pct =
                          stats.totalSpentCents > 0
                            ? Math.round((b.spentCents / stats.totalSpentCents) * 100)
                            : 0;
                        return (
                          <li key={b.slug}>
                            <div className="flex items-center justify-between gap-2 text-sm mb-1">
                              <span className="font-medium truncate">{b.name}</span>
                              <span className="text-primary font-semibold shrink-0">
                                {formatCurrency(b.spentCents / 100)}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </section>
            </div>

            {upcoming.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Próximo agendamento</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setAptFilter("upcoming");
                      setTab("appointments");
                    }}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Ver todos
                  </button>
                </div>
                <AppointmentCard
                  apt={upcoming[0]}
                  link={clientLinkById.get(upcoming[0].client_id)}
                  onCancel={cancel}
                  cancelingId={cancelingId}
                  compact
                />
              </section>
            )}

            {history.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Atividade recente</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setAptFilter("history");
                      setTab("appointments");
                    }}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Ver histórico
                  </button>
                </div>
                <ul className="space-y-2">
                  {history.slice(0, 4).map((a) => (
                    <li key={a.id}>
                      <AppointmentCard
                        apt={a}
                        link={clientLinkById.get(a.client_id)}
                        onCancel={cancel}
                        cancelingId={cancelingId}
                        compact
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {tab === "appointments" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "all" as const, label: "Todos" },
                  { id: "upcoming" as const, label: "Próximos" },
                  { id: "history" as const, label: "Histórico" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAptFilter(f.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                    aptFilter === f.id
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/10 text-gray-400 hover:text-white"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {filteredAppointments.length === 0 ? (
              <div className={cn("rounded-2xl border p-6 text-center", ui.card)}>
                <p className="text-sm text-gray-500">
                  {aptFilter === "upcoming"
                    ? "Nenhum agendamento futuro. Agende pela página pública de um negócio."
                    : "Nenhum agendamento nesta lista."}
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {filteredAppointments.map((a) => (
                  <li key={a.id}>
                    <AppointmentCard
                      apt={a}
                      link={clientLinkById.get(a.client_id)}
                      onCancel={cancel}
                      cancelingId={cancelingId}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "businesses" && (
          <BusinessesPanel
            businesses={businesses}
            visitedCount={visitedPages.length}
            onClearVisits={() => {
              clearVisitedPublicPages();
              refreshVisited();
            }}
          />
        )}

        {tab === "account" && (
          <ProfilePanel
            profile={profile}
            userEmail={userEmail}
            links={links}
            defaultPhone={pickDefaultPhone(links)}
            onSaved={load}
          />
        )}

        <p className="text-xs text-gray-600 text-center pt-8 pb-2 lg:pb-0">
          É prestador?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Acesse o painel
          </Link>
        </p>
      </main>
    </div>
  );
}

function AppointmentCard({
  apt,
  link,
  onCancel,
  cancelingId,
  compact = false,
}: {
  apt: AptRow;
  link: ClientLink | undefined;
  onCancel: (id: string) => void;
  cancelingId: string | null;
  compact?: boolean;
}) {
  const slug = link ? bizSlug(link.businesses) : null;
  const canCancel = apt.status === "agendado" || apt.status === "confirmado";
  const upcoming = isUpcoming(apt);

  return (
    <div
      className={cn(
        "rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
        compact ? "p-3.5" : "p-4",
        ui.accentCard
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={cn("font-semibold text-white", compact && "text-sm")}>{embedName(apt.services)}</p>
          <StatusBadge status={apt.status} />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {link ? bizLabel(link.businesses) : "Negócio"} ·{" "}
          {new Date(apt.date + "T12:00:00").toLocaleDateString("pt-BR")} às {String(apt.time_start).slice(0, 5)} ·{" "}
          {embedName(apt.collaborators)}
        </p>
        <p className="text-xs text-primary font-semibold mt-1">{formatCurrency(apt.price_cents / 100)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {canCancel && upcoming && (
          <button
            type="button"
            disabled={cancelingId === apt.id}
            onClick={() => void onCancel(apt.id)}
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          >
            {cancelingId === apt.id ? "Cancelando…" : "Cancelar"}
          </button>
        )}
        {slug && (
          <Link
            href={`/${slug}`}
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-white/15 hover:bg-white/5"
          >
            Agendar de novo
          </Link>
        )}
      </div>
    </div>
  );
}

function BusinessesPanel({
  businesses,
  visitedCount,
  onClearVisits,
}: {
  businesses: ReturnType<typeof buildUniqueBusinesses>;
  visitedCount: number;
  onClearVisits: () => void;
}) {
  if (businesses.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 sm:p-6")}>
        <h2 className="text-sm font-bold text-amber-200 mb-2">Nenhum negócio ainda</h2>
        <p className="text-sm text-gray-300 leading-relaxed">
          Quando você visitar ou agendar em um estabelecimento com esta conta, ele aparece aqui para você voltar com um
          toque.
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Seus negócios</h2>
          <p className="text-xs text-gray-500 mt-0.5">{businesses.length} estabelecimento(s)</p>
        </div>
        {visitedCount > 0 && (
          <button
            type="button"
            onClick={onClearVisits}
            className="text-[11px] text-gray-500 hover:text-gray-300 underline-offset-2 hover:underline"
          >
            Limpar visitas salvas
          </button>
        )}
      </div>
      <ul className="grid sm:grid-cols-2 gap-3">
        {businesses.map((b) => (
          <li key={b.slug}>
            <Link
              href={`/${b.slug}`}
              className={cn(
                "flex flex-col h-full p-4 rounded-2xl border transition-colors group",
                ui.accentCard,
                "hover:border-primary/40"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate group-hover:text-primary transition-colors">{b.name}</p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">/{b.slug}</p>
                </div>
                <span className="material-symbols-outlined text-gray-500 text-lg shrink-0">chevron_right</span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <p className="text-gray-500">Gasto</p>
                  <p className="text-primary font-semibold">{formatCurrency(b.totalSpentCents / 100)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Agendamentos</p>
                  <p className="text-white font-semibold">{b.totalAppointments}</p>
                </div>
              </div>
              {b.visitedAt != null && (
                <p className="text-[10px] text-gray-600 mt-2">Visitado {formatVisitedRelative(b.visitedAt)}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProfilePanel({
  profile,
  userEmail,
  links,
  defaultPhone,
  onSaved,
}: {
  profile: UserProfile | null;
  userEmail: string | null;
  links: ClientLink[];
  defaultPhone: string;
  onSaved: () => Promise<void>;
}) {
  const { showAlert } = useAppAlert();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(userEmail ?? "");
  const [phone, setPhone] = useState(defaultPhone ? formatBrazilPhoneFromDigits(defaultPhone) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setEmail(userEmail ?? "");
    setPhone(defaultPhone ? formatBrazilPhoneFromDigits(defaultPhone) : "");
  }, [profile?.full_name, userEmail, defaultPhone]);

  const save = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");

      const trimmedName = fullName.trim();
      if (!trimmedName) throw new Error("Informe seu nome");

      const [{ error: profErr }, { error: metaErr }] = await Promise.all([
        supabase.from("profiles").update({ full_name: trimmedName }).eq("id", user.id),
        supabase.auth.updateUser({ data: { full_name: trimmedName } }),
      ]);
      if (profErr) throw new Error(profErr.message);
      if (metaErr) throw new Error(metaErr.message);

      const phoneDigits = phoneDigitsOnly(phone);
      if (links.length > 0) {
        const { error: clientErr } = await supabase
          .from("clients")
          .update({
            name: trimmedName,
            phone: phoneDigits || null,
          })
          .eq("auth_user_id", user.id);
        if (clientErr) throw new Error(clientErr.message);
      }

      const nextEmail = email.trim().toLowerCase();
      const currentEmail = (userEmail ?? "").trim().toLowerCase();
      if (nextEmail && nextEmail !== currentEmail) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: nextEmail });
        if (emailErr) throw new Error(emailErr.message);
        showAlert("Enviamos um link de confirmação para o novo e-mail. Confirme para concluir a troca.", {
          title: "E-mail atualizado",
        });
      } else {
        showAlert("Suas informações foram salvas.", { title: "Conta" });
      }

      await onSaved();
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "Erro ao salvar", { title: "Minha conta" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <section className={cn("lg:col-span-3 rounded-2xl border p-5 sm:p-6 space-y-5", ui.card)}>
        <div>
          <h2 className="text-base font-bold text-white">Dados pessoais</h2>
          <p className="text-xs text-gray-500 mt-1">
            Atualize como você aparece nos agendamentos. O telefone é sincronizado com os negócios onde você é cliente.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-400">Nome completo</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={cn("w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary/40", ui.input)}
            placeholder="Seu nome"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-400">E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn("w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary/40", ui.input)}
            placeholder="seu@email.com"
          />
          <p className="text-[11px] text-gray-600">Ao alterar, enviamos confirmação para o novo endereço.</p>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-400">Telefone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(maskPhoneInputRaw(e.target.value))}
            className={cn("w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary/40", ui.input)}
            placeholder="(11) 99999-9999"
            inputMode="tel"
          />
        </label>

        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-black text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </section>

      <section className={cn("lg:col-span-2 rounded-2xl border p-5 sm:p-6 space-y-4", ui.card)}>
        <h2 className="text-base font-bold text-white">Resumo da conta</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Cadastro</dt>
            <dd className="text-white font-medium text-right">{links.length > 0 ? "Cliente vinculado" : "Só visitas"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Negócios</dt>
            <dd className="text-white font-medium">{links.length}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Login</dt>
            <dd className="text-white font-medium text-right truncate max-w-[160px]">{userEmail ?? "-"}</dd>
          </div>
        </dl>
        <p className="text-[11px] text-gray-600 leading-relaxed pt-2 border-t border-white/10">
          Cada negócio mantém seu histórico de agendamentos e gastos. Suas alterações de nome e telefone são aplicadas
          em todos os vínculos desta conta.
        </p>
      </section>
    </div>
  );
}
