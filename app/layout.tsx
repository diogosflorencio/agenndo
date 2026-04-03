import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/site-url";
import { AppAlertProvider } from "@/components/app-alert-provider";

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
  "Software completo de agendamento online (YWP / YourWebPlace): clientes marcam horário 24h por link ou QR Code; você gerencia agenda, equipe, financeiro e lembretes. Serve barbearias, salões, clínicas, estética, tatuadores, personal trainers, pet shops, consultórios e qualquer negócio por hora marcada — basta configurar serviços e disponibilidade.";

const verificationMeta = (() => {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();
  if (!google && !bing) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
  };
})();

const supabaseOrigin = (() => {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!u) return null;
  try {
    return new URL(u).origin;
  } catch {
    return null;
  }
})();

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
    "software agendamento online",
    "sistema de agendamento",
    "site para agendar horário",
    "marcar horário online",
    "plataforma de agendamento",
    "agenda para barbearia",
    "agenda para salão",
    "agendamento clínica estética",
    "software para prestador",
    "gestão de horários",
    "link de agendamento",
    "QR code agendamento",
    "Agenndo",
    "YWP",
    "YourWebPlace",
  ],
  authors: [{ name: "YWP (YourWebPlace)", url: siteUrl }],
  creator: "YWP (YourWebPlace)",
  publisher: "YWP (YourWebPlace)",
  formatDetection: { email: false, address: false, telephone: false },
  ...(verificationMeta ? { verification: verificationMeta } : {}),
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
    card: "summary_large_image",
    title: titleDefault,
    description,
  },
  category: "business",
};

const knowsAbout = [
  "Agendamento online",
  "Gestão de agenda para prestadores",
  "Barbearia",
  "Salão de beleza",
  "Clínica de estética",
  "Consultório",
  "Personal trainer",
  "Pet shop",
  "Estúdio de tatuagem",
  "Serviços por hora marcada",
];

const featureList = [
  "Página pública de agendamento por link e QR Code",
  "Painel: agenda, disponibilidade, serviços e colaboradores",
  "Lembretes e notificações para clientes",
  "Financeiro e relatórios",
  "Personalização de marca (logo, cores, banner)",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "YWP (YourWebPlace)",
      alternateName: ["YWP", "YourWebPlace"],
      url: siteUrl,
      logo: `${siteUrl}/icon.svg`,
      description:
        "Empresa por trás do Agenndo — software de agendamento online e gestão para prestadores de serviço.",
      brand: {
        "@type": "Brand",
        name: "Agenndo",
        description: "Plataforma de agendamento online para negócios por hora marcada.",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "Agenndo",
      url: siteUrl,
      inLanguage: "pt-BR",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${siteUrl}/#breadcrumb-home`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Início",
          item: siteUrl,
        },
      ],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#software`,
      name: "Agenndo",
      description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      inLanguage: "pt-BR",
      url: siteUrl,
      isAccessibleForFree: true,
      publisher: { "@id": `${siteUrl}/#organization` },
      knowsAbout,
      featureList,
      offers: {
        "@type": "Offer",
        priceCurrency: "BRL",
        availability: "https://schema.org/InStock",
        description: "Planos por perfil de uso; período de teste para novos cadastros.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <head>
        {supabaseOrigin ? <link rel="dns-prefetch" href={supabaseOrigin} /> : null}
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-[#020403] text-white`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AppAlertProvider>{children}</AppAlertProvider>
      </body>
    </html>
  );
}
