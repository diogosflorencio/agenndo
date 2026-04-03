import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Sobre o Agenndo e a YWP (YourWebPlace)",
  description:
    "Conheça o Agenndo — sistema de agendamento online para prestadores — e a YWP (YourWebPlace), empresa responsável pelo produto. Agende 24h por link; gestão completa no painel.",
  alternates: { canonical: `${base}/sobre` },
  openGraph: {
    title: "Sobre | Agenndo · YWP",
    description: "Agenndo e YWP (YourWebPlace): agendamento online para negócios por hora marcada.",
    url: `${base}/sobre`,
    locale: "pt_BR",
    type: "website",
    siteName: "Agenndo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sobre | Agenndo · YWP",
    description: "Agenndo e YWP (YourWebPlace): agendamento online para negócios por hora marcada.",
  },
};

export default function SobreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
