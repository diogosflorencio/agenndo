import { getSiteUrl } from "@/lib/site-url";
import type { SeoLandingPageConfig } from "@/lib/seo/landing-pages/types";

export function buildLandingJsonLd(page: SeoLandingPageConfig) {
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/${page.slug}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: page.h1,
        description: page.metaDescription,
        url: canonical,
        inLanguage: "pt-BR",
        isPartOf: { "@type": "WebSite", name: "Agenndo", url: siteUrl },
      },
      {
        "@type": "SoftwareApplication",
        name: "Agenndo",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "pt-BR",
        description: page.metaDescription,
        url: siteUrl,
        offers: {
          "@type": "Offer",
          priceCurrency: "BRL",
          description: "Planos por perfil; período de teste para novos cadastros.",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: siteUrl },
          { "@type": "ListItem", position: 2, name: page.h1, item: canonical },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}
