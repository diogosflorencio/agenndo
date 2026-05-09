import type { Metadata } from "next";
import { HomeFaqJsonLd } from "@/components/home-faq-jsonld";
import HomePage from "@/components/home-page";
import { SITE_DESCRIPTION, SITE_TITLE_DEFAULT } from "@/lib/seo/site-metadata";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

const titleDefault = SITE_TITLE_DEFAULT;
const description = SITE_DESCRIPTION;

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
