"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import {
  clearVisitedPublicPages,
  formatVisitedRelative,
  getVisitedPublicPages,
  type VisitedPublicPage,
} from "@/lib/visited-public-pages";
import { useAppAlert } from "@/components/app-alert-provider";

type ClientLink = {
  id: string;
  business_id: string;
  businesses: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

type AptRow = {
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

function bizLabel(b: ClientLink["businesses"]) {
  if (!b) return "Negócio";
  if (Array.isArray(b)) return b[0]?.name ?? "Negócio";
  return b.name ?? "Negócio";
}

function bizSlug(b: ClientLink["businesses"]) {
  if (!b) return null;
  if (Array.isArray(b)) return b[0]?.slug ?? null;
  return b.slug ?? null;
}

function embedName(embed: { name: string } | { name: string }[] | null | undefined) {
  if (!embed) return "—";
  if (Array.isArray(embed)) return embed[0]?.name ?? "—";
  return embed.name ?? "—";
}

export default function ContaClientePage() {
  const { showAlert } = useAppAlert();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/entrar?next=${encodeURIComponent("/conta")}`);
      return;
    }
    setUserEmail(user.email ?? null);

    const { data: clientRows } = await supabase
      .from("clients")
      .select("id, business_id, businesses(name, slug)")
      .order("created_at", { ascending: false });

    const rows = (clientRows ?? []) as unknown as ClientLink[];
    setLinks(rows);

    const ids = rows.map((r) => r.id);
    if (ids.length === 0) {
      setAppointments([]);
      setLoading(false);
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

    setAppointments((apts ?? []) as unknown as AptRow[]);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const aptInstant = (a: AptRow) =>
    new Date(`${a.date}T${String(a.time_start).slice(0, 5)}:00`);
  const nowMs = Date.now();

  const upcoming = appointments
    .filter(
      (a) =>
        (a.status === "agendado" || a.status === "confirmado") && aptInstant(a).getTime() >= nowMs
    )
    .sort((x, y) => aptInstant(x).getTime() - aptInstant(y).getTime());

  const history = appointments
    .filter(
      (a) =>
        !(
          (a.status === "agendado" || a.status === "confirmado") &&
          aptInstant(a).getTime() >= nowMs
        )
    )
    .sort((x, y) => aptInstant(y).getTime() - aptInstant(x).getTime());

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
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/entrar");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020403] flex items-center justify-center">
        <div className="size-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020403] text-white">
      <header className="border-b border-white/10 bg-[#080c0a]/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">Sua conta</h1>
            <p className="text-xs text-gray-500 truncate max-w-[200px] sm:max-w-xs">{userEmail}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" className="text-xs text-gray-400 hover:text-white px-2 py-2">
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

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <section>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Páginas visitadas</h2>
            {visitedPages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearVisitedPublicPages();
                  refreshVisited();
                }}
                className="text-[11px] text-gray-500 hover:text-gray-300 underline-offset-2 hover:underline"
              >
                Limpar histórico
              </button>
            )}
          </div>
          {visitedPages.length === 0 ? (
            <p className="text-sm text-gray-500 leading-relaxed">
              Quando você abrir a página de agendamento de um negócio, ela aparece aqui para você voltar com um toque.
            </p>
          ) : (
            <ul className="space-y-2">
              {visitedPages.map((v) => (
                <li key={v.slug}>
                  <Link
                    href={`/${v.slug}`}
                    className="flex items-center justify-between gap-3 p-4 rounded-xl bg-[#14221A] border border-[#213428] hover:border-primary/30 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate group-hover:text-primary transition-colors">
                        {v.name}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        /{v.slug} · {formatVisitedRelative(v.visitedAt)}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-gray-500 text-lg shrink-0">chevron_right</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {links.length === 0 && (
          <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 sm:p-6">
            <h2 className="text-sm font-bold text-amber-200 mb-2">Nenhum vínculo com negócios ainda</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              Sua conta ainda não está cadastrada como cliente em nenhum estabelecimento. Quando você agendar usando esta
              conta (ou o negócio vincular seu cadastro), seus agendamentos e valores consumidos aparecerão nesta página.
            </p>
          </section>
        )}

        {links.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Negócios</h2>
            <ul className="space-y-2">
              {links.map((l) => {
                const slug = bizSlug(l.businesses);
                return (
                  <li key={l.id}>
                    {slug ? (
                      <Link
                        href={`/${slug}`}
                        className="flex items-center justify-between gap-3 p-4 rounded-xl bg-[#14221A] border border-[#213428] hover:border-primary/30 transition-colors"
                      >
                        <span className="font-semibold">{bizLabel(l.businesses)}</span>
                        <span className="material-symbols-outlined text-gray-500 text-lg">chevron_right</span>
                      </Link>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#14221A] border border-[#213428]">
                        <span className="font-semibold">{bizLabel(l.businesses)}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Próximos agendamentos</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum agendamento futuro. Agende pela página pública do negócio.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((a) => {
                const link = links.find((l) => l.id === a.client_id);
                const slug = link ? bizSlug(link.businesses) : null;
                return (
                  <li
                    key={a.id}
                    className="p-4 rounded-xl bg-[#14221A] border border-[#213428] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-white">{embedName(a.services)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {link ? bizLabel(link.businesses) : "Negócio"} ·{" "}
                        {new Date(a.date + "T12:00:00").toLocaleDateString("pt-BR")} às{" "}
                        {String(a.time_start).slice(0, 5)} · {embedName(a.collaborators)}
                      </p>
                      <p className="text-xs text-primary font-semibold mt-1">
                        {formatCurrency(a.price_cents / 100)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400 capitalize">
                        {a.status}
                      </span>
                      {(a.status === "agendado" || a.status === "confirmado") && (
                        <button
                          type="button"
                          disabled={cancelingId === a.id}
                          onClick={() => void cancel(a.id)}
                          className="text-xs font-semibold px-3 py-2 rounded-xl border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {cancelingId === a.id ? "Cancelando…" : "Cancelar"}
                        </button>
                      )}
                      {slug && (
                        <Link
                          href={`/${slug}`}
                          className="text-xs font-semibold px-3 py-2 rounded-xl border border-white/15 hover:bg-white/5"
                        >
                          Página do negócio
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Histórico</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">Sem histórico.</p>
          ) : (
            <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {history.map((a) => {
                const link = links.find((l) => l.id === a.client_id);
                return (
                  <li
                    key={a.id}
                    className="py-3 border-b border-white/5 text-sm flex flex-col sm:flex-row sm:justify-between gap-1 opacity-85"
                  >
                    <div>
                      <p className="text-white font-medium">{embedName(a.services)}</p>
                      <p className="text-xs text-gray-500">
                        {link ? bizLabel(link.businesses) : "—"} ·{" "}
                        {new Date(a.date + "T12:00:00").toLocaleDateString("pt-BR")} ·{" "}
                        {String(a.time_start).slice(0, 5)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-primary font-semibold">
                        {formatCurrency(a.price_cents / 100)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400 capitalize">
                        {a.status}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-xs text-gray-600 text-center pb-8">
          É prestador?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Acesse o painel
          </Link>
        </p>
      </main>
    </div>
  );
}
