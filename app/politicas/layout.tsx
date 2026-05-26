import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const base = getSiteUrl();
const canonical = `${base}/politicas`;

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Política de privacidade do Agenndo: tratamento de dados, cookies e direitos dos titulares conforme a LGPD.",
  alternates: {
    canonical,
    languages: { "pt-BR": canonical, "x-default": canonical },
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Política de privacidade | Agenndo",
    description:
      "Como o Agenndo trata dados pessoais e cookies (LGPD).",
    url: canonical,
    locale: "pt_BR",
    type: "website",
    siteName: "Agenndo",
  },
  twitter: {
    card: "summary_large_image",
    site: "@agenndo",
    title: "Política de privacidade | Agenndo",
    description:
      "Como o Agenndo trata dados pessoais e cookies (LGPD).",
  },
};

export default function PoliticasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
