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
    `Agendamento online em ${business.name}${business.city ? ` (${business.city})` : ""}.`;

  const sameAs: string[] = [];
  if (personalization?.instagram_url?.trim()) sameAs.push(personalization.instagram_url.trim());
  if (personalization?.facebook_url?.trim()) sameAs.push(personalization.facebook_url.trim());

  const address: Record<string, string> = {
    "@type": "PostalAddress",
    addressCountry: "BR",
  };
  if (business.city) address.addressLocality = business.city;
  if (personalization?.address_line?.trim()) address.streetAddress = personalization.address_line.trim();

  const hasAddress = address.addressLocality || address.streetAddress;

  return {
    "@type": "LocalBusiness",
    name: business.name,
    url: canonical,
    ...(images.length ? { image: images } : {}),
    description: desc.slice(0, 500),
    ...(hasAddress ? { address } : {}),
    ...(business.city ? { areaServed: { "@type": "City", name: business.city } } : {}),
    ...(business.phone ? { telephone: business.phone } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    priceRange: "$$",
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

export function buildBreadcrumbJsonLd(
  businessName: string | null,
  canonical: string,
  siteUrl: string,
) {
  if (!businessName) return null;
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: siteUrl },
      { "@type": "ListItem", position: 2, name: businessName, item: canonical },
    ],
  };
}
