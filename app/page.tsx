import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HomeFaqJsonLd } from "@/components/home-faq-jsonld";
import HomePage from "@/components/home-page";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_TITLE_DEFAULT } from "@/lib/seo/site-metadata";
import { getSiteUrl } from "@/lib/site-url";
import { isMercadoPagoOAuthState } from "@/lib/mercadopago/oauth-state";

type HomeSearchParams = {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
  next?: string;
  context?: string;
};

const siteUrl = getSiteUrl();

const titleDefault = SITE_TITLE_DEFAULT;
const description = SITE_DESCRIPTION;

export const metadata: Metadata = {
  title: { absolute: titleDefault },
  description,
  keywords: [...SITE_KEYWORDS],
  alternates: {
    canonical: siteUrl,
    languages: { "pt-BR": siteUrl, "x-default": siteUrl },
  },
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
    site: "@agenndo",
    title: titleDefault,
    description,
  },
  category: "business",
};

/** Supabase às vezes devolve OAuth na Site URL (/) em vez de /auth/callback. */
function oauthCallbackForwardQuery(sp: HomeSearchParams): string | null {
  if (!sp.code && !sp.error) return null;
  const q = new URLSearchParams();
  if (sp.code) q.set("code", sp.code);
  if (sp.error) q.set("error", sp.error);
  if (sp.error_description) q.set("error_description", sp.error_description);
  if (sp.next?.startsWith("/") && !sp.next.startsWith("//")) q.set("next", sp.next);
  else if (sp.code) q.set("next", "/dashboard");
  if (sp.context === "cliente" || sp.context === "staff") q.set("context", sp.context);
  return q.toString();
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const sp = await searchParams;

  if (sp.code && isMercadoPagoOAuthState(sp.state)) {
    const q = new URLSearchParams();
    q.set("code", sp.code);
    if (sp.state) q.set("state", sp.state);
    if (sp.error) q.set("error", sp.error);
    if (sp.error_description) q.set("error_description", sp.error_description);
    redirect(`/api/mercadopago/oauth/callback?${q.toString()}`);
  }

  const forward = oauthCallbackForwardQuery(sp);
  if (forward) {
    redirect(`/auth/callback?${forward}`);
  }

  return (
    <>
      <HomeFaqJsonLd />
      <HomePage />
    </>
  );
}
