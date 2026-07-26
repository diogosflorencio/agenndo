"use client";

import { useI18n } from "@/components/i18n-provider";
import { useLandingLiveStats, type LandingStatId } from "@/components/landing-live-stats-context";

const LABEL_KEYS: Record<LandingStatId, string> = {
  activePros: "landing.stats.activePros",
  freeTrial: "landing.stats.freeTrial",
  bookingsToday: "landing.stats.bookingsToday",
  multiLanguage: "landing.stats.multiLanguage",
};

type Variant = "chip" | "inline" | "aside" | "corner" | "tag";

type LandingStatEmbedProps = {
  stat: LandingStatId;
  variant?: Variant;
  className?: string;
};

/** Stat ao vivo embutido no layout (nao e uma secao fixa). */
export function LandingStatEmbed({ stat, variant = "chip", className = "" }: LandingStatEmbedProps) {
  const { t } = useI18n();
  const { getValue, isLive, ready } = useLandingLiveStats();
  const value = getValue(stat);
  const label = t(LABEL_KEYS[stat]);
  const live = isLive(stat);

  if (variant === "inline") {
    const text =
      stat === "activePros"
        ? t("landing.stats.inlineActive", { count: value })
        : stat === "bookingsToday"
          ? t("landing.stats.inlineBookings", { count: value })
          : stat === "freeTrial"
            ? t("landing.stats.inlineTrial", { count: value })
            : t("landing.stats.inlineLanguages", { label: value });

    return (
      <p
        className={`text-sm text-gray-500 leading-relaxed ${className}`}
        aria-live={live && ready ? "polite" : undefined}
        suppressHydrationWarning={live ? true : undefined}
      >
        {text}
      </p>
    );
  }

  if (variant === "aside") {
    return (
      <div
        className={`hidden lg:flex flex-col items-end text-right max-w-[140px] ${className}`}
        aria-label={label}
      >
        <span
          className="text-2xl font-bold text-gray-900 tabular-nums leading-none"
          aria-live={live && ready ? "polite" : undefined}
          suppressHydrationWarning={live ? true : undefined}
        >
          {value}
        </span>
        <span className="mt-1 text-[11px] text-gray-500 leading-snug">{label}</span>
        {live && ready ? <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />{t("landing.stats.liveNow")}</span> : null}
      </div>
    );
  }

  if (variant === "corner") {
    return (
      <div
        className={`absolute top-3 right-3 rounded-md border border-emerald-100 bg-emerald-50/90 px-2.5 py-1.5 text-right ${className}`}
        aria-label={label}
      >
        <p
          className="text-base font-bold text-emerald-800 tabular-nums leading-none"
          suppressHydrationWarning={live ? true : undefined}
        >
          {value}
        </p>
        <p className="text-[10px] text-emerald-700/90 mt-0.5 leading-tight">{label}</p>
      </div>
    );
  }

  if (variant === "tag") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs border border-gray-200 rounded-md px-2.5 py-1.5 bg-white text-gray-600 ${className}`}
        aria-label={`${value} ${label}`}
      >
        <span
          className="font-semibold text-gray-900 tabular-nums"
          aria-live={live && ready ? "polite" : undefined}
          suppressHydrationWarning={live ? true : undefined}
        >
          {value}
        </span>
        <span className="text-gray-500">{label}</span>
        {live && ready ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden /> : null}
      </span>
    );
  }

  // chip (default)
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-gray-200/90 bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-sm ${className}`}
      aria-label={`${value} ${label}`}
    >
      {live && ready ? (
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      ) : null}
      <span
        className="text-sm font-bold text-gray-900 tabular-nums"
        aria-live={live && ready ? "polite" : undefined}
        suppressHydrationWarning={live ? true : undefined}
      >
        {value}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
