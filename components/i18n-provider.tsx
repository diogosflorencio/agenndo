"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { localeToHtmlLang, resolveLocale } from "@/lib/i18n/resolve-locale";
import { translate } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/types";

const STORAGE_KEY = "agenndo_locale";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  /** Sempre "pt" no SSR e na 1ª pintura do cliente (evita hydration mismatch). */
  const [locale, setLocaleState] = useState<Locale>("pt");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setLocaleState(resolveLocale(stored ?? navigator.language));
    } catch {
      setLocaleState("pt");
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = localeToHtmlLang(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* modo privado */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: "pt",
      setLocale: () => {},
      t: (key, vars) => translate("pt", key, vars),
    };
  }
  return ctx;
}
