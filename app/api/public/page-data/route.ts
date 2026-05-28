import { NextResponse } from "next/server";
import { fetchPublicPageCatalogBySlug } from "@/lib/public-catalog-server";

export const runtime = "nodejs";

/** SECURITY: catálogo da página /[slug] - servidor apenas (não expõe PostgREST anon). */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "slug obrigatório" }, { status: 400 });
  }

  const catalog = await fetchPublicPageCatalogBySlug(slug);
  if (!catalog.business) {
    return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });
  }

  return NextResponse.json(catalog, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
