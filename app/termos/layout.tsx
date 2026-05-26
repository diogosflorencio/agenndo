import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const base = getSiteUrl();
const canonical = `${base}/termos`;

export const metadata: Metadata = {
  title: "Termos de uso",
  description:
    "Termos de uso do Agenndo, plataforma de agendamento online para prestadores de serviço. Condições de uso para prestadores e clientes.",
  alternates: {
    canonical,
    languages: { "pt-BR": canonical, "x-default": canonical },
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Termos de uso | Agenndo",
    description: "Termos de uso da plataforma de agendamento online Agenndo.",
    url: canonical,
    locale: "pt_BR",
    type: "website",
    siteName: "Agenndo",
  },
  twitter: {
    card: "summary_large_image",
    site: "@agenndo",
    title: "Termos de uso | Agenndo",
    description: "Termos de uso da plataforma de agendamento online Agenndo.",
  },
};

export default function TermosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
