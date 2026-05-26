import { cache } from "react";
import { fetchPublicPageCatalogBySlug } from "@/lib/public-catalog-server";

export type PublicSlugSeo = {
  business: {
    id: string;
    name: string;
    city: string | null;
    phone: string | null;
    primary_color: string | null;
    segment: string | null;
    logo_url: string | null;
  } | null;
  personalization: {
    banner_url: string | null;
    tagline: string | null;
    about: string | null;
    address_line: string | null;
    instagram_url: string | null;
    facebook_url: string | null;
  } | null;
  services_count: number;
  service_names: string[];
};

/** SECURITY: SEO da página pública via servidor (service role), não PostgREST anon. */
export const getPublicSlugSeo = cache(async (slug: string): Promise<PublicSlugSeo> => {
  const catalog = await fetchPublicPageCatalogBySlug(slug);
  if (!catalog.business)
    return { business: null, personalization: null, services_count: 0, service_names: [] };

  const p = catalog.personalization;
  return {
    business: {
      id: catalog.business.id,
      name: catalog.business.name,
      city: catalog.business.city,
      phone: catalog.business.phone,
      primary_color: catalog.business.primary_color,
      segment: catalog.business.segment,
      logo_url: catalog.business.logo_url,
    },
    personalization: p
      ? {
          banner_url: p.banner_url,
          tagline: p.tagline,
          about: p.about,
          address_line: p.address_line,
          instagram_url: p.instagram_url,
          facebook_url: p.facebook_url,
        }
      : null,
    services_count: catalog.services.length,
    service_names: catalog.services.slice(0, 5).map((s) => s.name),
  };
});
