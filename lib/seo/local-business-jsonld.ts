import type { PublicSlugSeo } from "@/lib/seo/public-slug-seo";

export function buildLocalBusinessJsonLd(seo: PublicSlugSeo, canonical: string, siteUrl: string) {
  const { business, personalization } = seo;
  if (!business) return null;

  const images: string[] = [];
  if (personalization?.banner_url?.trim()) images.push(personalization.banner_url.trim());
  if (business.logo_url?.trim()) images.push(business.logo_url.trim());

  const desc =
    personalization?.about?.trim() ||
    personalization?.tagline?.trim() ||
    `Agendamento online em ${business.name}${business.city ? ` — ${business.city}` : ""}.`;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    url: canonical,
    ...(images.length ? { image: images } : {}),
    description: desc.slice(0, 500),
    ...(business.city
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: business.city,
            addressCountry: "BR",
          },
        }
      : {}),
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: canonical,
        inLanguage: "pt-BR",
      },
    },
    isPartOf: {
      "@type": "WebApplication",
      name: "Agenndo",
      url: siteUrl,
      publisher: { "@type": "Organization", name: "YWP (YourWebPlace)", url: siteUrl },
    },
  };
}
