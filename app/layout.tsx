import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/site-url";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();
let metadataBase: URL;
try {
  metadataBase = new URL(siteUrl);
} catch {
  metadataBase = new URL("http://localhost:3000");
}

const titleDefault =
  "Agenndo — Sistema de agendamento online para prestadores de serviço";
const description =
  "Plataforma completa de agendamento online: seus clientes marcam horário 24h por dia por link ou QR Code; você gerencia agenda, equipe e lembretes. Ideal para barbearias, salões, clínicas, estética e qualquer negócio por hora marcada.";

export const viewport: Viewport = {
  themeColor: "#13EC5B",
};

// Favicon alternativos: em metadata.icons use /favicon-v1.svg ou /favicon-v2.svg no lugar de /icon.svg
export const metadata: Metadata = {
  metadataBase,
  title: {
    default: titleDefault,
    template: "%s | Agenndo",
  },
  description,
  keywords: [
    "agendamento online",
    "sistema de agendamento",
    "software de agenda",
    "marcar horário online",
    "agenda para barbearia",
    "agenda para salão",
    "agendamento clínica",
    "gestão de horários",
    "Agenndo",
  ],
  authors: [{ name: "Agenndo", url: siteUrl }],
  creator: "Agenndo",
  publisher: "Agenndo",
  formatDetection: { email: false, address: false, telephone: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Agenndo — Agendamento online",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Agenndo",
    title: titleDefault,
    description,
  },
  twitter: {
    card: "summary",
    title: titleDefault,
    description,
  },
  category: "business",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Agenndo",
  description,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  inLanguage: "pt-BR",
  url: siteUrl,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <body
        className={`${inter.variable} font-sans antialiased bg-[#020403] text-white`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
