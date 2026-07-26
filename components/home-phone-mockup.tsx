"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type MockStat = {
  icon: string;
  label: string;
  value: string;
  trend: string;
  trendColor: string;
};

const MOCK_STAT_SLIDES: { key: string; hint: string; items: MockStat[] }[] = [
  {
    key: "operacao",
    hint: "Operação do dia",
    items: [
      { icon: "calendar_today", label: "Agend.", value: "12", trend: "+15%", trendColor: "text-primary" },
      { icon: "cancel", label: "Canc.", value: "2", trend: "-5%", trendColor: "text-red-400" },
      { icon: "person_off", label: "Faltas", value: "1", trend: "--", trendColor: "text-gray-500" },
    ],
  },
  {
    key: "financeiro",
    hint: "Financeiro & serviços",
    items: [
      { icon: "payments", label: "Receita", value: "R$ 1,2k", trend: "+8%", trendColor: "text-primary" },
      { icon: "savings", label: "Comissões", value: "18", trend: "3 pend.", trendColor: "text-amber-400" },
      { icon: "category", label: "Serviços", value: "14", trend: "ativos", trendColor: "text-gray-400" },
    ],
  },
  {
    key: "equipe",
    hint: "Equipe & clientes",
    items: [
      { icon: "groups", label: "Na equipe", value: "6", trend: "ativos", trendColor: "text-primary" },
      { icon: "person_search", label: "Clientes", value: "240", trend: "+12", trendColor: "text-teal-400" },
      { icon: "analytics", label: "Taxa ok", value: "92%", trend: "mês", trendColor: "text-gray-400" },
    ],
  },
];

const MOCK_NOTIFICATION_TOASTS = [
  {
    key: "booking_in",
    icon: "event_available",
    title: "Novo agendamento",
    subtitle: "Marina · Corte · 17:00 · página pública",
  },
  {
    key: "reminder_sent",
    icon: "schedule_send",
    title: "Lembrete enviado",
    subtitle: "João Silva · consulta em 1 h",
  },
  {
    key: "client_reply",
    icon: "mark_email_read",
    title: "Cliente confirmou",
    subtitle: "Comparece às 14:00 - link na mensagem",
  },
  {
    key: "slot_hold",
    icon: "hourglass_top",
    title: "Horário reservado",
    subtitle: "Cliente finalizando · 8 min",
  },
] as const;

/** Mockup completo do painel - visual original, animações só com CSS + intervalos leves. */
export function HomePhoneMockup({ large = false }: { large?: boolean }) {
  const frameW = large ? "w-[320px]" : "w-[min(280px,78vw)]";
  const frameH = large ? "h-[660px]" : "h-[min(580px,72dvh)]";
  const [statSlide, setStatSlide] = useState(0);
  const [toastIdx, setToastIdx] = useState(0);
  const [notifCount, setNotifCount] = useState(1);
  const [presencePulse, setPresencePulse] = useState(false);
  const [contentTick, setContentTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setStatSlide((i) => (i + 1) % MOCK_STAT_SLIDES.length), 4200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setToastIdx((i) => (i + 1) % MOCK_NOTIFICATION_TOASTS.length);
      setNotifCount((c) => c + 1);
      setContentTick((t) => t + 1);
    }, 4600);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let hidePulse: number | undefined;
    const pulse = () => {
      setPresencePulse(true);
      if (hidePulse) window.clearTimeout(hidePulse);
      hidePulse = window.setTimeout(() => {
        if (!cancelled) setPresencePulse(false);
      }, 2400);
    };
    pulse();
    const interval = window.setInterval(pulse, 8200);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      if (hidePulse) window.clearTimeout(hidePulse);
    };
  }, []);

  const statPanel = MOCK_STAT_SLIDES[statSlide] ?? MOCK_STAT_SLIDES[0];
  const toast = MOCK_NOTIFICATION_TOASTS[toastIdx] ?? MOCK_NOTIFICATION_TOASTS[0];

  return (
    <div className="relative mx-auto max-w-full">
      <div
        className={cn(
          "relative bg-black rounded-[40px] border-[8px] border-gray-800 shadow-2xl overflow-hidden mx-auto",
          "transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500 flex flex-col origin-center",
          frameW,
          frameH
        )}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-b-2xl z-50" />
        <div className="w-full h-full bg-[#0B120E] text-white flex flex-col relative">
          <header className="flex-shrink-0 pt-10 pb-4 px-5 bg-[#0B120E]/90 backdrop-blur-md border-b border-white/5 z-30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full border-2 border-primary p-0.5">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/40 to-primary/60" />
                </div>
                <div>
                  <p className="text-[10px] text-primary font-medium leading-none mb-0.5">Olá, Marcos</p>
                  <h2 className="text-white text-lg font-bold leading-none">Dashboard</h2>
                </div>
              </div>
              <div className="relative size-9 rounded-full bg-[#14221A] border border-[#213428] flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[18px] mock-bell">notifications</span>
                <span
                  key={notifCount}
                  className="absolute -top-0.5 -right-1 min-h-[18px] min-w-[18px] px-[5px] rounded-full bg-red-500 ring-2 ring-[#14221A] flex items-center justify-center text-[10px] font-bold text-white tabular-nums leading-none mock-pop"
                >
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              </div>
            </div>
          </header>

          <div className="relative z-20 shrink-0 px-3 -mt-1 pt-1 pb-2 pointer-events-none select-none">
            <div key={`${toast.key}-${contentTick}`} className="mock-fade-in rounded-xl border border-white/10 bg-[#14221A]/95 backdrop-blur-md shadow-lg px-3 py-2.5 flex gap-2.5 items-start">
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">{toast.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-white leading-tight">{toast.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-snug line-clamp-2">{toast.subtitle}</p>
              </div>
              <span className="text-[9px] font-semibold text-primary shrink-0 mt-0.5">agora</span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            <section className="px-4 py-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[10px] font-semibold text-gray-500 tracking-wide">{statPanel.hint}</p>
                <div className="flex gap-1 shrink-0" aria-hidden>
                  {MOCK_STAT_SLIDES.map((s, i) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setStatSlide(i)}
                      className={cn(
                        "h-1 rounded-full transition-all duration-300",
                        i === statSlide ? "w-4 bg-primary" : "w-1.5 bg-white/20 hover:bg-white/35"
                      )}
                      aria-label={`Painel ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
              <div className="relative overflow-hidden min-h-[76px]">
                <div key={`${statPanel.key}-${contentTick}`} className="mock-slide-in flex gap-2">
                  {statPanel.items.map((stat) => (
                    <div
                      key={`${statPanel.key}-${stat.label}`}
                      className="flex-1 min-w-0 basis-0 bg-[#14221A] border border-[#213428] rounded-xl p-2.5 flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <span className="material-symbols-outlined text-[16px]">{stat.icon}</span>
                        <span className="text-[10px] font-medium truncate">{stat.label}</span>
                      </div>
                      <div className="flex items-end gap-1 flex-wrap">
                        <span className="text-xl font-bold text-white leading-none">{stat.value}</span>
                        <span className={`text-[9px] font-bold mb-0.5 ${stat.trendColor}`}>{stat.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <main className="px-4 space-y-3 pb-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-white text-sm font-bold">Próximos</h3>
                <span className="text-[9px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  Hoje
                </span>
              </div>

              <div
                className={cn(
                  "bg-[#14221A] border border-[#213428] rounded-xl overflow-hidden shadow-lg relative transition-shadow duration-500",
                  presencePulse && "ring-1 ring-primary/35 shadow-[0_12px_40px_rgba(19,236,91,0.12)]"
                )}
              >
                <div className="p-3 flex gap-3">
                  <div
                    className={cn(
                      "size-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 shrink-0 transition-transform duration-300",
                      presencePulse && "scale-[1.03]"
                    )}
                  />
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-white text-sm">João Silva</h4>
                      <span className="text-primary font-bold text-xs shrink-0">14:00</span>
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">Consulta de retorno</p>
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <div className="size-3.5 rounded-full bg-gray-700 flex items-center justify-center text-[9px] text-white">
                        L
                      </div>
                      <span className="text-[9px] text-gray-500">Lucas</span>
                      {presencePulse ? (
                        <span className="mock-fade-in inline-flex items-center gap-0.5 rounded-full bg-primary/15 border border-primary/25 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                          <span className="material-symbols-outlined text-[11px]">verified</span>
                          Confirmado
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "overflow-hidden border-t border-primary/20 bg-gradient-to-r from-primary/10 to-transparent transition-all duration-300",
                    presencePulse ? "max-h-12 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">task_alt</span>
                    <p className="text-[10px] font-semibold text-primary leading-tight">
                      Presença registrada · agenda atualizada
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px bg-[#213428] border-t border-[#213428]">
                  <button type="button" aria-hidden className="bg-[#14221A] text-[10px] font-semibold text-gray-300 py-2.5">
                    Faltou
                  </button>
                  <button
                    type="button"
                    aria-hidden
                    className={cn(
                      "text-[10px] font-bold text-primary py-2.5 relative overflow-hidden transition-colors duration-300",
                      presencePulse ? "bg-primary/30" : "bg-primary/20"
                    )}
                  >
                    Compareceu
                  </button>
                </div>
              </div>

              <div className="bg-[#14221A] border border-[#213428] rounded-xl p-3 flex gap-3 opacity-60">
                <div className="size-12 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 shrink-0" />
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="flex justify-between gap-2">
                    <h4 className="font-bold text-white text-sm">Pedro Costa</h4>
                    <span className="text-primary font-bold text-xs shrink-0">15:30</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">Avaliação completa</p>
                </div>
              </div>
            </main>
          </div>

          <nav className="flex-shrink-0 w-full bg-[#0B120E]/95 backdrop-blur-md border-t border-[#213428] pt-2.5 pb-5 px-2 flex justify-between items-center z-40">
            {[
              { icon: "grid_view", label: "Início", active: true },
              { icon: "calendar_month", label: "Agenda", active: false },
              { icon: "list_alt", label: "Serviços", active: false },
              { icon: "groups", label: "Equipe", active: false },
              { icon: "person", label: "Conta", active: false },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                <span className={cn("material-symbols-outlined text-[20px]", item.active ? "text-primary" : "text-gray-500")}>
                  {item.icon}
                </span>
                <span
                  className={cn(
                    "text-[8px] truncate w-full text-center",
                    item.active ? "font-bold text-primary" : "font-medium text-gray-500"
                  )}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </nav>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-white/20 rounded-full z-50 pointer-events-none" />
        </div>
      </div>

      {large ? (
        <>
          <div className="absolute top-[160px] -right-4 xl:-right-8 bg-[#14221A] border border-[#213428] p-4 rounded-xl shadow-xl z-20 hidden xl:block mock-float-slow">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/15 p-2 rounded-lg border border-emerald-500/25">
                <span className="material-symbols-outlined text-emerald-400">payments</span>
              </div>
              <div>
                <p className="text-xs text-gray-400">Receita hoje</p>
                <p className="text-sm font-bold text-white">R$ 850,00</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-44 -left-4 xl:-left-8 bg-[#14221A] border border-[#213428] p-4 rounded-xl shadow-xl z-20 hidden xl:block mock-float-fast">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/15 p-2 rounded-lg border border-emerald-500/25">
                <span className="material-symbols-outlined text-emerald-400">event_available</span>
              </div>
              <div>
                <p className="text-xs text-gray-400">Novo agendamento</p>
                <p className="text-sm font-bold text-white">Via link público</p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
