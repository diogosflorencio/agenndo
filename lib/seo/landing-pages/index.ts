import type { SeoLandingPageConfig } from "./types";
import { generalLandingPages } from "./pages-general";
import { segmentLandingPages } from "./pages-segments";

export const LANDING_PAGES: SeoLandingPageConfig[] = [...generalLandingPages, ...segmentLandingPages];

export const LANDING_PAGE_SLUGS = LANDING_PAGES.map((p) => p.slug);

export function getLandingPage(slug: string): SeoLandingPageConfig | null {
  return LANDING_PAGES.find((p) => p.slug === slug) ?? null;
}
