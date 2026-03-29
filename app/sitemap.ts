import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const paths = ["", "/sobre", "/agendamento-online", "/termos", "/politicas", "/login", "/entrar"] as const;
  const now = new Date();
  return paths.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/agendamento-online" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/agendamento-online" ? 0.9 : 0.7,
  }));
}
