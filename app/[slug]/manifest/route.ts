import { NextResponse } from "next/server";
import { fetchPublicPageCatalogBySlug } from "@/lib/public-catalog-server";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug;
  const base = getSiteUrl();
  let name = "Agendamento";

  try {
    const catalog = await fetchPublicPageCatalogBySlug(slug);
    if (catalog.business?.name?.trim()) name = catalog.business.name.trim().slice(0, 80);
  } catch {
    /* */
  }

  const short = name.length > 14 ? `${name.slice(0, 12)}…` : name;

  const manifest = {
    name: `${name} · Agendamento online`,
    short_name: short,
    description: `Agende horário em ${name} pelo celular. Página Agenndo (YWP / YourWebPlace).`,
    id: `${base}/${slug}/`,
    start_url: `/${slug}?utm_source=pwa`,
    scope: "/",
    display: "standalone",
    background_color: "#020403",
    theme_color: "#13EC5B",
    orientation: "portrait-primary" as const,
    lang: "pt-BR",
    icons: [
      {
        src: `${base}/icon.svg`,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
