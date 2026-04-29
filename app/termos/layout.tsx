import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Termos de uso",
  description:
    "Termos de uso do Agenndo (sistema de agendamento online YWP / YourWebPlace). Condições de uso do serviço para prestadores e clientes.",
  alternates: { canonical: `${base}/termos` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Termos de uso | Agenndo",
    description: "Termos de uso do serviço Agenndo (YWP).",
    url: `${base}/termos`,
    locale: "pt_BR",
    type: "website",
    siteName: "Agenndo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Termos de uso | Agenndo",
    description: "Termos de uso do serviço Agenndo (YWP).",
  },
};

export default function TermosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
