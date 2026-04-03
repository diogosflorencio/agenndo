import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const DISALLOW = ["/dashboard/", "/api/", "/setup", "/auth/", "/_next/"];

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  const host = (() => {
    try {
      return new URL(base).host;
    } catch {
      return undefined;
    }
  })();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
        crawlDelay: 1,
      },
      { userAgent: "Googlebot", allow: "/", disallow: DISALLOW },
      { userAgent: "Bingbot", allow: "/", disallow: DISALLOW },
      { userAgent: "Slurp", allow: "/", disallow: DISALLOW },
      { userAgent: "AhrefsBot", disallow: ["/"] },
      { userAgent: "SemrushBot", disallow: ["/"] },
      { userAgent: "DotBot", disallow: ["/"] },
      { userAgent: "MJ12bot", disallow: ["/"] },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
    ],
    sitemap: [`${base}/sitemap.xml`, `${base}/sitemap_index.xml`],
    host,
  };
}
