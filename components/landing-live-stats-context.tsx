"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  computeActiveProfessionals,
  computeAppointmentsToday,
  formatLandingStatExact,
  localeToNumberFormat,
} from "@/lib/marketing/landing-live-stats";
import { useI18n } from "@/components/i18n-provider";
import { APP_TRIAL_DAYS } from "@/lib/trial-config";

export type LandingStatId = "activePros" | "freeTrial" | "bookingsToday" | "multiLanguage";

const LIVE_STATS = new Set<LandingStatId>(["activePros", "bookingsToday"]);

type LandingLiveStatsContextValue = {
  ready: boolean;
  getValue: (id: LandingStatId) => string;
  isLive: (id: LandingStatId) => boolean;
};

const LandingLiveStatsContext = createContext<LandingLiveStatsContextValue | null>(null);

function buildValues(now: Date, t: (key: string) => string, numberLocale: string): Record<LandingStatId, string> {
  return {
    activePros: formatLandingStatExact(computeActiveProfessionals(now), numberLocale),
    freeTrial: String(APP_TRIAL_DAYS),
    bookingsToday: formatLandingStatExact(computeAppointmentsToday(now), numberLocale),
    multiLanguage: t("landing.stats.multiLanguageValue"),
  };
}

export function LandingLiveStatsProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const numberLocale = localeToNumberFormat(locale);
  const [values, setValues] = useState<Record<LandingStatId, string> | null>(null);

  useEffect(() => {
    const tick = () => setValues(buildValues(new Date(), t, numberLocale));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [t, numberLocale]);

  const placeholder = useMemo(
    () =>
      ({
        activePros: "...",
        freeTrial: String(APP_TRIAL_DAYS),
        bookingsToday: "...",
        multiLanguage: t("landing.stats.multiLanguageValue"),
      }) satisfies Record<LandingStatId, string>,
    [t]
  );

  const ctx = useMemo<LandingLiveStatsContextValue>(
    () => ({
      ready: values !== null,
      getValue: (id) => (values ?? placeholder)[id],
      isLive: (id) => LIVE_STATS.has(id),
    }),
    [values, placeholder]
  );

  return <LandingLiveStatsContext.Provider value={ctx}>{children}</LandingLiveStatsContext.Provider>;
}

export function useLandingLiveStats() {
  const ctx = useContext(LandingLiveStatsContext);
  if (!ctx) throw new Error("useLandingLiveStats must be used within LandingLiveStatsProvider");
  return ctx;
}
