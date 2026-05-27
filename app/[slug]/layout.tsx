import type { Metadata } from "next";
import { PublicSlugRouteTransition } from "@/components/public/public-slug-route-transition";
import { getSiteUrl } from "@/lib/site-url";
import { getPublicSlugSeo } from "@/lib/seo/public-slug-seo";
import { buildLocalBusinessJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/local-business-jsonld";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = params.slug;
  const base = getSiteUrl();
  const { business, personalization, service_names } = await getPublicSlugSeo(slug);

  let title = "Agendar horário online";
  let description =
    "Marque seu horário online com segurança. Página de agendamento Agenndo, software completo para prestadores (YWP / YourWebPlace).";

  if (business?.name) {
    title = business.city
      ? `${business.name} — Agendamento Online em ${business.city} | Agenndo`
      : `${business.name} — Agende Online | Agenndo`;

    const parts: string[] = [];
    parts.push(`Agende com ${business.name}${business.city ? ` em ${business.city}` : ""}.`);
    if (business.segment) parts.push(business.segment + ".");
    if (service_names.length) parts.push(`Serviços: ${service_names.slice(0, 3).join(", ")}.`);
    parts.push("Agendamento online pelo Agenndo.");

    const full = parts.join(" ");
    description = full.length <= 155 ? full : full.slice(0, 152) + "...";
  }

  const canonical = `${base}/${encodeURIComponent(slug)}`;

  const ogImages: string[] = [];
  if (personalization?.banner_url?.trim()) ogImages.push(personalization.banner_url.trim());
  else if (business?.logo_url?.trim()) ogImages.push(business.logo_url.trim());

  return {
    title,
    description,
    manifest: `/${slug}/manifest`,
    alternates: {
      canonical,
      languages: { "pt-BR": canonical, "x-default": canonical },
    },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Agenndo",
      locale: "pt_BR",
      type: "website",
      ...(ogImages.length ? { images: ogImages.map((url) => ({ url })) } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImages.length ? { images: ogImages } : {}),
    },
    appleWebApp: {
      capable: true,
      title: title.slice(0, 40),
      statusBarStyle: "black-translucent",
    },
  };
}

export default async function PublicBookingSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const base = getSiteUrl();
  const slug = params.slug;
  const seo = await getPublicSlugSeo(slug);
  const canonical = `${base}/${encodeURIComponent(slug)}`;

  const localBiz = buildLocalBusinessJsonLd(seo, canonical, base);
  const breadcrumb = buildBreadcrumbJsonLd(seo.business?.name ?? null, canonical, base);

  const graph = [localBiz, breadcrumb].filter(Boolean);

  return (
    <>
      {graph.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
          }}
        />
      )}
      <PublicSlugRouteTransition>{children}</PublicSlugRouteTransition>
    </>
  );
}
