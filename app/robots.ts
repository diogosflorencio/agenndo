import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/llms.txt", "/agendamento-online"],
        disallow: ["/dashboard/", "/api/", "/setup", "/auth/"],
      },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: (() => {
      try {
        return new URL(base).host;
      } catch {
        return undefined;
      }
    })(),
  };
}
