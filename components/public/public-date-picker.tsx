"use client";

import { cn, rgbaFromHex } from "@/lib/utils";
import {
  getPublicDateDisabledReason,
  type AvailabilityDbRow,
  type OverrideDbRow,
  type PublicDateDisabledReason,
} from "@/lib/public-booking";

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDay(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function dayButtonTitle(
  reason: PublicDateDisabledReason | null,
  maxDays: number,
  day: number
): string {
  if (reason === "loading") return "Carregando disponibilidade…";
  if (reason === "past") return "Dia já passou";
  if (reason === "tooFar") return `Fora do período (máx. ${maxDays} dias à frente)`;
  if (reason === "closed") return "Sem atendimento neste dia";
  return `Dia ${day}: toque para agendar`;
}

type MonthGridProps = {
  year: number;
  month: number;
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
  bookingMeta: {
    maxFutureDays: number;
    weeklyAvailability: AvailabilityDbRow[];
    availabilityOverrides: OverrideDbRow[];
  } | null;
  maxFutureDaysFallback: number;
  accentColor: string;
  isDark: boolean;
  today: Date;
  titleClass: string;
};

function MonthGrid({
  year,
  month,
  selectedDate,
  onSelectDate,
  bookingMeta,
  maxFutureDaysFallback,
  accentColor,
  isDark,
  today,
  titleClass,
}: MonthGridProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const maxDays = bookingMeta?.maxFutureDays ?? maxFutureDaysFallback;
  const metaLoaded = bookingMeta != null;

  return (
    <div className="min-w-0 flex-1">
      <h4 className={cn("font-bold text-center mb-3 text-sm", titleClass)}>
        {MONTHS_SHORT[month]} {year}
      </h4>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={`${year}-${month}-wd-${i}`} className="text-center text-[10px] font-semibold text-gray-500 py-0.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e-${year}-${month}-${i}`} className="aspect-square min-h-[1.75rem] sm:min-h-[2rem]" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const reason = getPublicDateDisabledReason(dateStr, {
            metaLoaded,
            today,
            maxFutureDays: maxDays,
            weeklyAvailability: bookingMeta?.weeklyAvailability ?? [],
            availabilityOverrides: bookingMeta?.availabilityOverrides ?? [],
          });
          const isDisabled = reason != null;
          const isSelected = selectedDate === dateStr;
          const title = dayButtonTitle(reason, maxDays, day);

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isDisabled}
              title={title}
              aria-label={title}
              onClick={() => onSelectDate(dateStr)}
              style={isSelected ? { boxShadow: `0 0 0 2px ${rgbaFromHex(accentColor, 0.4)}` } : undefined}
              className={cn(
                "aspect-square min-h-[1.75rem] sm:min-h-[2rem] text-xs rounded-lg font-semibold flex items-center justify-center transition-all",
                isSelected
                  ? "bg-[var(--public-accent)] text-black"
                  : isDisabled
                    ? reason === "past"
                      ? isDark
                        ? "text-white/20 cursor-not-allowed line-through decoration-white/15"
                        : "text-gray-400 cursor-not-allowed line-through"
                      : reason === "tooFar"
                        ? isDark
                          ? "text-white/30 cursor-not-allowed"
                          : "text-gray-400 cursor-not-allowed"
                        : reason === "loading"
                          ? isDark
                            ? "text-white/25 cursor-wait animate-pulse"
                            : "text-gray-300 cursor-wait animate-pulse"
                          : isDark
                            ? "text-white/35 cursor-not-allowed bg-white/[0.05]"
                            : "text-gray-400 cursor-not-allowed bg-gray-100"
                    : isDark
                      ? "text-white hover:bg-[color-mix(in_srgb,var(--public-accent)_18%,transparent)]"
                      : "text-gray-900 hover:bg-[color-mix(in_srgb,var(--public-accent)_12%,transparent)]"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PublicDatePicker({
  calMonth,
  calYear,
  onNavigate,
  selectedDate,
  onSelectDate,
  bookingMeta,
  maxFutureDaysFallback,
  accentColor,
  isDark,
  today,
  cardClass,
  titleClass,
  navBtnClass,
}: {
  calMonth: number;
  calYear: number;
  onNavigate: (year: number, month: number) => void;
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
  bookingMeta: {
    maxFutureDays: number;
    weeklyAvailability: AvailabilityDbRow[];
    availabilityOverrides: OverrideDbRow[];
  } | null;
  maxFutureDaysFallback: number;
  accentColor: string;
  isDark: boolean;
  today: Date;
  cardClass: string;
  titleClass: string;
  navBtnClass: string;
}) {
  const second = shiftMonth(calYear, calMonth, 1);

  const goPrev = () => {
    const prev = shiftMonth(calYear, calMonth, -1);
    onNavigate(prev.year, prev.month);
  };
  const goNext = () => {
    const next = shiftMonth(calYear, calMonth, 1);
    onNavigate(next.year, next.month);
  };

  const shared = {
    selectedDate,
    onSelectDate,
    bookingMeta,
    maxFutureDaysFallback,
    accentColor,
    isDark,
    today,
    titleClass,
  };

  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", cardClass)}>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goPrev}
          className={cn("size-9 rounded-xl flex items-center justify-center transition-colors", navBtnClass)}
          aria-label="Mês anterior"
        >
          <span className="material-symbols-outlined text-base">chevron_left</span>
        </button>
        <p className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-white/50" : "text-gray-500")}>
          {bookingMeta == null ? "Carregando…" : "Toque num dia disponível"}
        </p>
        <button
          type="button"
          onClick={goNext}
          className={cn("size-9 rounded-xl flex items-center justify-center transition-colors", navBtnClass)}
          aria-label="Próximo mês"
        >
          <span className="material-symbols-outlined text-base">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
        <MonthGrid year={calYear} month={calMonth} {...shared} />
        <MonthGrid year={second.year} month={second.month} {...shared} />
      </div>

      <div
        className={cn(
          "mt-4 pt-3 border-t flex flex-wrap gap-x-4 gap-y-2 text-[10px] sm:text-[11px]",
          isDark ? "border-white/10 text-white/50" : "border-gray-100 text-gray-500"
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("size-5 rounded-md line-through text-[9px] flex items-center justify-center", isDark ? "text-white/25" : "text-gray-400")}>9</span>
          Passou
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("size-5 rounded-md text-[9px] flex items-center justify-center", isDark ? "text-white/35 bg-white/[0.05]" : "text-gray-400 bg-gray-100")}>9</span>
          Fechado
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: accentColor }}>
          <span className="size-5 rounded-md bg-[var(--public-accent)] text-black text-[9px] font-bold flex items-center justify-center">9</span>
          Selecionado
        </span>
      </div>
    </div>
  );
}
