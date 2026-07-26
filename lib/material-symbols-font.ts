/** Mesma família do antigo `@import` em globals.css + `display=block` para reduzir texto de ligadura antes do font subset carregar. */
export const MATERIAL_SYMBOLS_STYLESHEET_HREF =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block";

export const MATERIAL_SYMBOLS_FONT_FAMILY = "Material Symbols Outlined";

/** Spec usada pelo Font Loading API — deve bater com o peso/tamanho dos ícones no app. */
export const MATERIAL_SYMBOLS_FONT_SPEC = `400 24px "${MATERIAL_SYMBOLS_FONT_FAMILY}"`;

/** Glifos comuns para forçar o subset da fonte a baixar cedo. */
export const MATERIAL_SYMBOLS_PROBE_GLYPHS = [
  "schedule",
  "home",
  "check",
  "close",
  "arrow_back",
  "notifications",
  "menu",
  "search",
  "chevron_right",
  "person",
  "calendar_month",
  "grid_view",
  "expand_more",
] as const;

/** Dispara o download da fonte o mais cedo possível (script inline no `<head>`). */
export const MATERIAL_SYMBOLS_EARLY_LOAD_SCRIPT = `(function(){try{if(!document.fonts||!document.fonts.load)return;var s=${JSON.stringify(MATERIAL_SYMBOLS_FONT_SPEC)};var g=${JSON.stringify(MATERIAL_SYMBOLS_PROBE_GLYPHS)};for(var i=0;i<g.length;i++)document.fonts.load(s,g[i]);}catch(e){}})();`;

/**
 * Aguarda a família Material Symbols Outlined estar disponível.
 * `document.fonts.ready` sozinho não basta — a Inter (next/font) pode resolver antes desta fonte.
 */
export async function waitForMaterialSymbolsFont(options?: {
  timeoutMs?: number;
}): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? 8000;
  if (typeof document === "undefined") return false;

  const fonts = document.fonts;
  if (!fonts?.load) return false;

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (fonts.check(MATERIAL_SYMBOLS_FONT_SPEC)) return true;

    await Promise.all(
      MATERIAL_SYMBOLS_PROBE_GLYPHS.map((glyph) =>
        fonts.load(MATERIAL_SYMBOLS_FONT_SPEC, glyph).catch(() => undefined),
      ),
    );

    if (fonts.check(MATERIAL_SYMBOLS_FONT_SPEC)) return true;

    await new Promise((resolve) => window.setTimeout(resolve, 40));
  }

  return fonts.check(MATERIAL_SYMBOLS_FONT_SPEC);
}
