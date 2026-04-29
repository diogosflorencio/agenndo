"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";

const STORAGE_DISMISS = "agenndo_setup_guide_dismissed";
const STORAGE_COMPACT = "agenndo_setup_guide_compact";

export type SetupProgressSnapshot = {
  hasSegment: boolean;
  hasContact: boolean;
  serviceCount: number;
  collaboratorCount: number;
  hasCollabServiceLink: boolean;
  hasOpenAvailabilityDay: boolean;
  hasPersonalizationExtras: boolean;
  /** Plano ativo, período de teste ou tolerância de pagamento (regra igual ao painel). */
  hasSubscriptionAccess: boolean;
};

type Section = {
  id: string;
  title: string;
  tasks: { id: string; label: string; done: boolean; href: string }[];
};

function buildSections(s: SetupProgressSnapshot): Section[] {
  return [
    {
      id: "negocio",
      title: "Dados do negócio",
      tasks: [
        { id: "seg", label: "Defina o segmento do negócio", done: s.hasSegment, href: "/dashboard/negocio" },
        { id: "cont", label: "Adicione telefone ou cidade", done: s.hasContact, href: "/dashboard/negocio" },
      ],
    },
    {
      id: "oferta",
      title: "Serviços e equipe",
      tasks: [
        { id: "srv", label: "Cadastre ao menos um serviço", done: s.serviceCount > 0, href: "/dashboard/servicos" },
        { id: "col", label: "Cadastre ao menos um colaborador", done: s.collaboratorCount > 0, href: "/dashboard/colaboradores" },
        {
          id: "link",
          label: "Vincule serviços aos profissionais",
          done: s.hasCollabServiceLink,
          href: "/dashboard/servicos",
        },
      ],
    },
    {
      id: "horarios",
      title: "Disponibilidade",
      tasks: [
        {
          id: "av",
          label: "Configure horários de atendimento na semana",
          done: s.hasOpenAvailabilityDay,
          href: "/dashboard/disponibilidade",
        },
      ],
    },
    {
      id: "publico",
      title: "Página pública de agendamento",
      tasks: [
        {
          id: "per",
          label: "Personalize página (texto, banner ou redes)",
          done: s.hasPersonalizationExtras,
          href: "/dashboard/personalizacao",
        },
      ],
    },
    {
      id: "plano",
      title: "Assinatura",
      tasks: [
        {
          id: "sub",
          label: "Assine o plano para manter agendamentos online",
          done: s.hasSubscriptionAccess,
          href: "/dashboard/conta",
        },
      ],
    },
  ];
}

export function DashboardSetupGuide({ snapshot }: { snapshot: SetupProgressSnapshot }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [dismissed, setDismissed] = useState(true);
  const [compact, setCompact] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const didInitOpen = useRef(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_DISMISS) === "1");
      setCompact(localStorage.getItem(STORAGE_COMPACT) === "1");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const sections = useMemo(() => buildSections(snapshot), [snapshot]);
  const { doneCount, total } = useMemo(() => {
    let d = 0;
    let t = 0;
    for (const sec of sections) {
      for (const task of sec.tasks) {
        t += 1;
        if (task.done) d += 1;
      }
    }
    return { doneCount: d, total: t };
  }, [sections]);

  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount === total;

  useEffect(() => {
    if (!hydrated || didInitOpen.current) return;
    didInitOpen.current = true;
    const firstIncomplete = sections.find((sec) => sec.tasks.some((x) => !x.done));
    setOpenSection((firstIncomplete ?? sections[0])?.id ?? null);
  }, [hydrated, sections]);

  const persistDismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_DISMISS, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  const toggleCompact = useCallback(() => {
    setCompact((c) => {
      const next = !c;
      try {
        if (next) localStorage.setItem(STORAGE_COMPACT, "1");
        else localStorage.removeItem(STORAGE_COMPACT);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  if (!hydrated || dismissed) return null;

  return (
    <div
      className={cn(
        "mb-6 rounded-xl border overflow-hidden",
        isDark ? "bg-[#080c0a] border-white/10 shadow-none" : "bg-white border-gray-200 shadow-sm"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-3 border-b",
          isDark ? "border-white/10" : "border-gray-100"
        )}
      >
        <h2 className={cn("text-sm font-bold", isDark ? "text-white" : "text-gray-900")}>Guia de configuração</h2>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={toggleCompact}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isDark
                ? "text-white/50 hover:bg-white/10 hover:text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            )}
            aria-label={compact ? "Expandir guia" : "Recolher guia"}
          >
            <span className="material-symbols-outlined text-xl leading-none">
              {compact ? "open_in_full" : "close_fullscreen"}
            </span>
          </button>
          <button
            type="button"
            onClick={persistDismiss}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isDark
                ? "text-white/50 hover:bg-white/10 hover:text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            )}
            aria-label="Fechar guia"
          >
            <span className="material-symbols-outlined text-xl leading-none">close</span>
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-gray-200")}>
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={cn("text-xs mt-2", isDark ? "text-white/50" : "text-gray-500")}>
          {allDone ? (
            <>Configuração concluída. Ótimo trabalho.</>
          ) : (
            <>
              {doneCount} de {total} passos concluídos. Complete os itens abaixo para liberar agendamentos com confiança.
            </>
          )}
        </p>
      </div>

      {!compact && (
        <div className={cn("border-t", isDark ? "border-white/10" : "border-gray-100")}>
          {sections.map((sec) => {
            const isOpen = openSection === sec.id;
            const secDone = sec.tasks.every((t) => t.done);
            return (
              <div
                key={sec.id}
                className={cn(
                  "border-b last:border-b-0",
                  isDark ? "border-white/10" : "border-gray-100",
                  isOpen && (isDark ? "bg-white/[0.04]" : "bg-slate-50/80")
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? null : sec.id)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
                    isDark ? "hover:bg-white/[0.06]" : "hover:bg-gray-50/80"
                  )}
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "material-symbols-outlined text-lg shrink-0",
                        secDone ? "text-primary" : isDark ? "text-white/35" : "text-gray-400"
                      )}
                    >
                      {secDone ? "check_circle" : "radio_button_unchecked"}
                    </span>
                    <span
                      className={cn("text-sm font-semibold truncate", isDark ? "text-white" : "text-gray-900")}
                    >
                      {sec.title}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "material-symbols-outlined text-xl shrink-0",
                      isDark ? "text-white/40" : "text-gray-400"
                    )}
                  >
                    {isOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0 space-y-0">
                    {sec.tasks.map((task) => (
                      <Link
                        key={task.id}
                        href={task.href}
                        className={cn(
                          "flex items-start gap-3 py-2.5 pl-7 pr-2 rounded-lg -mx-2 transition-colors",
                          isDark ? "hover:bg-white/[0.06]" : "hover:bg-white/80"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 size-5 rounded-full shrink-0 flex items-center justify-center text-xs font-bold",
                            task.done
                              ? "bg-primary text-black"
                              : isDark
                                ? "bg-white/10 border border-white/20 text-transparent"
                                : "bg-gray-200 text-transparent border border-gray-300"
                          )}
                        >
                          {task.done ? "✓" : ""}
                        </span>
                        <span
                          className={cn(
                            "text-sm leading-snug",
                            task.done
                              ? isDark
                                ? "text-white/40 line-through"
                                : "text-gray-500 line-through"
                              : isDark
                                ? "text-white/90 font-medium"
                                : "text-gray-800 font-medium"
                          )}
                        >
                          {task.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
