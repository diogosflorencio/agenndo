import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const base = getSiteUrl();
const canonical = `${base}/sobre`;

export const metadata: Metadata = {
  title: "Sobre o Agenndo — Plataforma de Agendamento Online",
  description:
    "Conheça o Agenndo, a plataforma de agendamento online feita para prestadores de serviço brasileiros. Simples, gratuita e profissional.",
  alternates: {
    canonical,
    languages: { "pt-BR": canonical, "x-default": canonical },
  },
  openGraph: {
    title: "Sobre o Agenndo — Plataforma de Agendamento Online",
    description:
      "Conheça o Agenndo, a plataforma de agendamento online feita para prestadores de serviço brasileiros.",
    url: canonical,
    locale: "pt_BR",
    type: "website",
    siteName: "Agenndo",
  },
  twitter: {
    card: "summary_large_image",
    site: "@agenndo",
    title: "Sobre o Agenndo — Plataforma de Agendamento Online",
    description:
      "Conheça o Agenndo, a plataforma de agendamento online feita para prestadores de serviço brasileiros.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      name: "Sobre o Agenndo",
      url: canonical,
      description:
        "Conheça a plataforma de agendamento online para prestadores de serviço do Brasil.",
      inLanguage: "pt-BR",
      mainEntity: {
        "@type": "SoftwareApplication",
        name: "Agenndo",
        url: base,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        publisher: {
          "@type": "Organization",
          name: "YWP (YourWebPlace)",
          url: base,
        },
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: base },
        { "@type": "ListItem", position: 2, name: "Sobre", item: canonical },
      ],
    },
  ],
};

export default function SobreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
