import type { Locale, MessageTree } from "@/lib/i18n/types";
import { en } from "@/lib/i18n/messages/en";
import { es } from "@/lib/i18n/messages/es";
import { pt } from "@/lib/i18n/messages/pt";

const CATALOG: Record<Locale, MessageTree> = { pt, en, es };

function lookup(tree: MessageTree, key: string): string | undefined {
  const parts = key.split(".");
  let cur: string | MessageTree | undefined = tree;
  for (const part of parts) {
    if (cur == null || typeof cur === "string") return undefined;
    cur = cur[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const primary = lookup(CATALOG[locale], key) ?? lookup(CATALOG.pt, key);
  if (!primary) return key;
  return interpolate(primary, vars);
}
