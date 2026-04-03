import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site-url";

/** Índice simples (alguns crawlers / ferramentas esperam este nome). */
export function GET() {
  const base = getSiteUrl();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${base}/sitemap.xml</loc></sitemap>
</sitemapindex>`;
  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
