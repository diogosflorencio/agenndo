const STORAGE_KEY = "agenndo:visited-public-pages";
const MAX_ITEMS = 30;

export type VisitedPublicPage = {
  slug: string;
  name: string;
  visitedAt: number;
};

function parseList(raw: string | null): VisitedPublicPage[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (x): x is VisitedPublicPage =>
          x != null &&
          typeof x === "object" &&
          typeof (x as VisitedPublicPage).slug === "string" &&
          typeof (x as VisitedPublicPage).name === "string" &&
          typeof (x as VisitedPublicPage).visitedAt === "number"
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

/** Registra visita à página pública de um negócio (apenas no browser). */
export function recordPublicPageVisit(slug: string, name: string) {
  if (typeof window === "undefined") return;
  const s = slug.trim();
  const n = name.trim() || s;
  if (!s) return;
  try {
    const list = parseList(localStorage.getItem(STORAGE_KEY));
    const rest = list.filter((x) => x.slug !== s);
    rest.unshift({ slug: s, name: n, visitedAt: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest.slice(0, MAX_ITEMS)));
    window.dispatchEvent(new Event("agenndo:visited-public-updated"));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getVisitedPublicPages(): VisitedPublicPage[] {
  if (typeof window === "undefined") return [];
  try {
    return parseList(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function clearVisitedPublicPages() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("agenndo:visited-public-updated"));
  } catch {
    /* ignore */
  }
}

export function formatVisitedRelative(visitedAt: number): string {
  const sec = Math.floor((Date.now() - visitedAt) / 1000);
  if (sec < 45) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return min <= 1 ? "há 1 min" : `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? "há 1 h" : `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? "há 1 dia" : `há ${d} dias`;
  const w = Math.floor(d / 7);
  if (w < 5) return w === 1 ? "há 1 semana" : `há ${w} semanas`;
  return new Date(visitedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}
