import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { getPublicSlugSeo } from "@/lib/seo/public-slug-seo";
import { buildLocalBusinessJsonLd } from "@/lib/seo/local-business-jsonld";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = params.slug;
  const base = getSiteUrl();
  const { business, personalization } = await getPublicSlugSeo(slug);

  let title = "Agendar horário online";
  let description =
    "Marque seu horário online com segurança. Página de agendamento Agenndo — software completo para prestadores (YWP / YourWebPlace).";

  if (business?.name) {
    const cityPart = business.city ? ` (${business.city})` : "";
    title = `${business.name} — agendar online${cityPart}`;
    const tag = personalization?.tagline?.trim();
    description = tag
      ? `${tag} Agende em ${business.name}${cityPart}. Link oficial de agendamento; plataforma Agenndo (YWP).`
      : `Agende horário em ${business.name}${cityPart}. Link oficial de agendamento; plataforma Agenndo (YWP).`;
  }

  const canonical = `${base}/${encodeURIComponent(slug)}`;

  const ogImages: string[] = [];
  if (personalization?.banner_url?.trim()) ogImages.push(personalization.banner_url.trim());
  else if (business?.logo_url?.trim()) ogImages.push(business.logo_url.trim());

  return {
    title,
    description,
    manifest: `/${slug}/manifest`,
    alternates: { canonical },
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
  const jsonLd = buildLocalBusinessJsonLd(seo, canonical, base);

  return (
    <>
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      ) : null}
      {children}
    </>
  );
}
