import type { Metadata } from "next";
import { HomeFaqJsonLd } from "@/components/home-faq-jsonld";
import HomePage from "@/components/home-page";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

const titleDefault = "Agenndo - Sistema de agendamento online para prestadores de serviço";
const description =
  "Software completo de agendamento online (YWP / YourWebPlace): clientes marcam horário 24h por link ou QR Code; você gerencia agenda, equipe, financeiro e lembretes. Atende salões, clínicas, estética, barbearias, consultórios, personal trainers, pet shops e qualquer negócio por hora marcada. Basta configurar serviços e disponibilidade.";

export const metadata: Metadata = {
  title: { absolute: titleDefault },
  description,
  alternates: { canonical: siteUrl },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Agenndo",
    title: titleDefault,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: titleDefault,
    description,
  },
};

export default function Page() {
  return (
    <>
      <HomeFaqJsonLd />
      <HomePage />
    </>
  );
}
