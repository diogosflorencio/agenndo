import { cache } from "react";
import { fetchPublicPageCatalogBySlug } from "@/lib/public-catalog-server";

export type PublicSlugSeo = {
  business: {
    id: string;
    name: string;
    city: string | null;
    segment: string | null;
    logo_url: string | null;
  } | null;
  personalization: {
    banner_url: string | null;
    tagline: string | null;
    about: string | null;
  } | null;
};

/** SECURITY: SEO da página pública via servidor (service role), não PostgREST anon. */
export const getPublicSlugSeo = cache(async (slug: string): Promise<PublicSlugSeo> => {
  const catalog = await fetchPublicPageCatalogBySlug(slug);
  if (!catalog.business) return { business: null, personalization: null };
  const p = catalog.personalization;
  return {
    business: {
      id: catalog.business.id,
      name: catalog.business.name,
      city: catalog.business.city,
      segment: catalog.business.segment,
      logo_url: catalog.business.logo_url,
    },
    personalization: p
      ? { banner_url: p.banner_url, tagline: p.tagline, about: p.about }
      : null,
  };
});
