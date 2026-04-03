import { getSiteUrl } from "@/lib/site-url";
import { HOME_FAQS } from "@/lib/seo/home-faq-data";

export function buildHomeFaqPageJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
    url: `${siteUrl}/`,
    inLanguage: "pt-BR",
    isPartOf: { "@type": "WebSite", name: "Agenndo", url: siteUrl },
  };
}
