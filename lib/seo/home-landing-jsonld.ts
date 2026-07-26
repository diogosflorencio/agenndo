import { getSiteUrl } from "@/lib/site-url";
import { SITE_DESCRIPTION, SITE_TITLE_DEFAULT } from "@/lib/seo/site-metadata";
import { HOME_FAQS } from "@/lib/seo/home-faq-data";

/** JSON-LD da home: WebPage + FAQPage + SoftwareApplication (IA e buscadores). */
export function buildHomeLandingJsonLd() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#webpage`,
        url: siteUrl,
        name: SITE_TITLE_DEFAULT,
        description: SITE_DESCRIPTION,
        inLanguage: "pt-BR",
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@id": `${siteUrl}/#software` },
        primaryImageOfPage: `${siteUrl}/icon.svg`,
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: ["#hero-headline", "#hero-summary", ".home-faq-answer"],
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        url: `${siteUrl}/#faq`,
        inLanguage: "pt-BR",
        isPartOf: { "@id": `${siteUrl}/#webpage` },
        mainEntity: HOME_FAQS.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: "Agenndo",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        description: SITE_DESCRIPTION,
        url: siteUrl,
        inLanguage: "pt-BR",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "BRL",
          description: "Teste gratuito de 7 dias. Planos pagos conforme uso após o trial.",
          availability: "https://schema.org/InStock",
        },
        featureList: [
          "Agenda online e página pública com link e QR Code",
          "Agendamentos 24 horas pelo celular do cliente",
          "Serviços, equipe e disponibilidade",
          "Lembretes e notificações automáticas",
          "Financeiro, analytics e clientes",
          "Pix e Mercado Pago para receber sinal ou pagamento antecipado",
        ],
        audience: {
          "@type": "Audience",
          audienceType: "Prestadores de serviço, salões, clínicas, barbearias, consultórios",
        },
      },
    ],
  };
}
