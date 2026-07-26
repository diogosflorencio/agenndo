import type { Locale } from "@/lib/i18n/types";

const SUPPORTED: Locale[] = ["pt", "en", "es"];

export function resolveLocale(input?: string | null): Locale {
  if (!input?.trim()) return "pt";
  const tag = input.trim().toLowerCase().replace("_", "-");
  const primary = tag.split("-")[0];
  if (primary === "en" || primary === "es" || primary === "pt") return primary;
  return "pt";
}

export function isSupportedLocale(value: string): value is Locale {
  return SUPPORTED.includes(value as Locale);
}

export function localeToHtmlLang(locale: Locale): string {
  if (locale === "pt") return "pt-BR";
  if (locale === "es") return "es";
  return "en";
}
