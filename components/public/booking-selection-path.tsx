"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { normalizeVariantGallery } from "@/lib/service-variants";
import type { getPublicBookUi } from "@/lib/public-book-ui";

type CollabRow = { id: string; name: string };

type ServiceRow = {
  name: string;
  variant_gallery: unknown;
};

export type BookingPathStep = 1 | 2 | 3 | 4;

type PathCrumb = {
  step: BookingPathStep;
  icon: string;
  label: string;
};

type Props = {
  currentStep: number;
  selectedService: ServiceRow;
  selectedVariantIndex: number | null;
  selectedCollab: CollabRow | "any" | null;
  selectedDate: string | null;
  selectedTime: string | null;
  bookUi: ReturnType<typeof getPublicBookUi>;
  isDark: boolean;
  onNavigate: (step: BookingPathStep) => void;
  className?: string;
};

function formatShortDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function buildCrumbs(
  selectedService: ServiceRow,
  selectedVariantIndex: number | null,
  selectedCollab: CollabRow | "any" | null,
  selectedDate: string | null,
  selectedTime: string | null
): PathCrumb[] {
  const variants = normalizeVariantGallery(selectedService.variant_gallery);
  const variantTitle =
    selectedVariantIndex != null
      ? variants[selectedVariantIndex]?.title?.trim() || `Opção ${selectedVariantIndex + 1}`
      : null;
  const serviceLabel = variantTitle
    ? `${selectedService.name} · ${variantTitle}`
    : selectedService.name;

  const crumbs: PathCrumb[] = [
    { step: 1, icon: "spa", label: serviceLabel },
  ];

  if (selectedCollab !== null) {
    crumbs.push({
      step: 2,
      icon: "person",
      label: selectedCollab === "any" ? "Primeiro disponível" : selectedCollab.name,
    });
  }

  if (selectedDate) {
    crumbs.push({
      step: 3,
      icon: "calendar_today",
      label: formatShortDate(selectedDate),
    });
  }

  if (selectedTime) {
    crumbs.push({ step: 4, icon: "schedule", label: selectedTime });
  }

  return crumbs;
}

/**
 * Trilha clicável (estilo caminho de pastas) com as escolhas do agendamento.
 */
export function BookingSelectionPath({
  currentStep,
  selectedService,
  selectedVariantIndex,
  selectedCollab,
  selectedDate,
  selectedTime,
  bookUi,
  isDark,
  onNavigate,
  className,
}: Props) {
  const crumbs = useMemo(
    () =>
      buildCrumbs(
        selectedService,
        selectedVariantIndex,
        selectedCollab,
        selectedDate,
        selectedTime
      ),
    [selectedService, selectedVariantIndex, selectedCollab, selectedDate, selectedTime]
  );

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Resumo das escolhas"
      className={cn(
        "flex-1 min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x",
        "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      <ol className="flex items-center gap-0.5 sm:gap-1 min-w-max pr-1">
        {crumbs.map((crumb, i) => {
          const isActive = crumb.step === currentStep;
          const isPast = crumb.step < currentStep;

          return (
            <li key={crumb.step} className="flex items-center shrink-0">
              {i > 0 ? (
                <span
                  className={cn(
                    "material-symbols-outlined text-[14px] sm:text-[16px] mx-0.5 shrink-0 select-none",
                    isDark ? "text-gray-600" : "text-gray-400"
                  )}
                  aria-hidden
                >
                  chevron_right
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onNavigate(crumb.step)}
                title={crumb.label}
                className={cn(
                  "inline-flex items-center gap-1 max-w-[40vw] sm:max-w-[10.5rem] rounded-lg px-2 py-1.5 text-left transition-colors",
                  "border text-[11px] sm:text-xs leading-tight",
                  isActive
                    ? cn(
                        "font-semibold border-[color-mix(in_srgb,var(--public-accent)_45%,transparent)]",
                        isDark
                          ? "bg-[color-mix(in_srgb,var(--public-accent)_12%,transparent)] text-white"
                          : "bg-[color-mix(in_srgb,var(--public-accent)_10%,transparent)] text-gray-900"
                      )
                    : isPast
                      ? cn(
                          bookUi.chip,
                          bookUi.title,
                          isDark
                            ? "hover:bg-white/10 hover:border-white/20"
                            : "hover:bg-gray-100 hover:border-gray-300"
                        )
                      : cn(bookUi.chip, bookUi.muted)
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-[15px] sm:text-[16px] shrink-0",
                    isActive || isPast ? "text-[var(--public-accent)]" : bookUi.muted
                  )}
                >
                  {crumb.icon}
                </span>
                <span className="truncate">{crumb.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
