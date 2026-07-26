import type { CSSProperties } from "react";

export const DEFAULT_BRAND_PRIMARY = "#13EC5B";

/** Espessura da borda de contorno quando botão branco/preto some no fundo. */
export const BRAND_EDGE_BORDER_WIDTH = "0.5px";

/** Aceita #RGB ou #RRGGBB; devolve #RRGGBB normalizado ou o padrão. */
export function normalizeBrandHex(input: string | null | undefined): string {
  let s = (input ?? "").trim();
  if (!s) return DEFAULT_BRAND_PRIMARY;
  if (!s.startsWith("#")) s = `#${s}`;
  const hex = s.slice(1).replace(/[^0-9a-fA-F]/g, "");
  if (hex.length === 3) {
    const [r, g, b] = hex.split("") as [string, string, string];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (hex.length === 6) return `#${hex.toUpperCase()}`;
  return DEFAULT_BRAND_PRIMARY;
}

function parseBrandRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeBrandHex(hex).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function brandPrimaryRgbChannels(hex: string | null | undefined): string {
  const { r, g, b } = parseBrandRgb(hex ?? DEFAULT_BRAND_PRIMARY);
  return `${r} ${g} ${b}`;
}

export function darkenBrandHex(hex: string | null | undefined, factor = 0.82): string {
  const { r, g, b } = parseBrandRgb(hex ?? DEFAULT_BRAND_PRIMARY);
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n * factor)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function relativeLuminance(r: number, g: number, b: number): number {
  const linear = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

export function isBrandNearWhite(hex: string | null | undefined): boolean {
  const { r, g, b } = parseBrandRgb(hex ?? DEFAULT_BRAND_PRIMARY);
  return r >= 240 && g >= 240 && b >= 240;
}

export function isBrandNearBlack(hex: string | null | undefined): boolean {
  const { r, g, b } = parseBrandRgb(hex ?? DEFAULT_BRAND_PRIMARY);
  return r <= 30 && g <= 30 && b <= 30;
}

/**
 * Borda fina só quando a cor da marca é branca ou preta E coincide com o fundo ao redor
 * (botão branco em superfície clara, ou preto em superfície escura).
 */
export function needsBrandEdgeBorder(
  hex: string | null | undefined,
  surfaceIsDark: boolean,
): boolean {
  const brand = normalizeBrandHex(hex);
  if (surfaceIsDark) return isBrandNearBlack(brand);
  return isBrandNearWhite(brand);
}

/** Branco ou preto legível sobre um fundo sólido da cor da marca. */
export function contrastTextOnBrand(hex: string | null | undefined): "#FFFFFF" | "#111827" {
  const { r, g, b } = parseBrandRgb(hex ?? DEFAULT_BRAND_PRIMARY);
  return relativeLuminance(r, g, b) > 0.179 ? "#111827" : "#FFFFFF";
}

/** @deprecated alias — use `contrastTextOnBrand`. */
export const getContrastColor = contrastTextOnBrand;

export function brandEdgeBorderStyle(
  hex: string | null | undefined,
  surfaceIsDark: boolean,
): CSSProperties {
  if (!needsBrandEdgeBorder(hex, surfaceIsDark)) return {};
  const fg = contrastTextOnBrand(hex);
  return {
    borderColor: fg,
    borderStyle: "solid",
    borderWidth: BRAND_EDGE_BORDER_WIDTH,
  };
}

export function publicAccentCssProperties(
  hex: string | null | undefined,
  surfaceIsDark = false,
): CSSProperties {
  const accent = normalizeBrandHex(hex);
  const fg = contrastTextOnBrand(accent);
  const markOnSurface = needsBrandEdgeBorder(accent, surfaceIsDark) ? fg : accent;
  return {
    "--public-accent": accent,
    "--public-accent-fg": fg,
    "--public-accent-mark": markOnSurface,
  } as CSSProperties;
}

export function brandAccentFillStyle(
  hex: string | null | undefined,
  extra?: CSSProperties,
  options?: { surfaceIsDark?: boolean },
): CSSProperties {
  const accent = normalizeBrandHex(hex);
  const fg = contrastTextOnBrand(accent);
  return {
    backgroundColor: accent,
    color: fg,
    ...brandEdgeBorderStyle(accent, options?.surfaceIsDark ?? false),
    ...extra,
  };
}

/** Cor visível da marca sobre superfícies neutras (nav, ícones, bordas, fundos /10). */
export function brandMarkOnSurface(
  hex: string | null | undefined,
  surfaceIsDark: boolean,
): string {
  const brand = normalizeBrandHex(hex);
  if (needsBrandEdgeBorder(hex, surfaceIsDark)) {
    return contrastTextOnBrand(hex);
  }
  return brand;
}

/** Variáveis CSS aplicadas no shell do dashboard (Tailwind `primary` + utilitários legados). */
export function brandColorCssProperties(hex: string | null | undefined): CSSProperties {
  const primary = normalizeBrandHex(hex);
  return {
    "--primary": primary,
    "--primary-dark": darkenBrandHex(primary),
    "--primary-rgb": brandPrimaryRgbChannels(primary),
    "--primary-fg": contrastTextOnBrand(primary),
  } as CSSProperties;
}

/** Marca + `--primary-mark` para contraste em superfícies (tema claro/escuro). */
export function dashboardBrandCssProperties(
  hex: string | null | undefined,
  surfaceIsDark: boolean,
): CSSProperties {
  const mark = brandMarkOnSurface(hex, surfaceIsDark);
  return {
    ...brandColorCssProperties(hex),
    "--primary-mark": mark,
    "--primary-mark-rgb": brandPrimaryRgbChannels(mark),
  } as CSSProperties;
}

export function brandEdgeBorderDataAttribute(
  hex: string | null | undefined,
  surfaceIsDark: boolean,
): Record<string, string> | undefined {
  return needsBrandEdgeBorder(hex, surfaceIsDark) ? { "data-brand-edge-border": "true" } : undefined;
}
