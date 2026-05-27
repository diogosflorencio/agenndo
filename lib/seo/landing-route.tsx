import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLandingPageView } from "@/components/seo/seo-landing-page-view";
import { getSiteUrl } from "@/lib/site-url";
import { getLandingPage, LANDING_PAGE_SLUGS } from "@/lib/seo/landing-pages";
import type { SeoLandingPageConfig } from "@/lib/seo/landing-pages/types";

export { LANDING_PAGE_SLUGS };

export function buildLandingMetadata(page: SeoLandingPageConfig): Metadata {
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/${page.slug}`;

  return {
    title: { absolute: page.metaTitle },
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: {
      canonical,
      languages: { "pt-BR": canonical, "x-default": canonical },
    },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: canonical,
      siteName: "Agenndo",
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: "@agenndo",
      title: page.metaTitle,
      description: page.metaDescription,
    },
    robots: { index: true, follow: true },
  };
}

export function landingMetadata(slug: string): Metadata {
  const page = getLandingPage(slug);
  if (!page) return {};
  return buildLandingMetadata(page);
}

export function LandingPage({ slug }: { slug: string }) {
  const page = getLandingPage(slug);
  if (!page) notFound();
  return <SeoLandingPageView page={page} />;
}
