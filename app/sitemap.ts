import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticPaths = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/sobre", priority: 0.85, changeFrequency: "monthly" as const },
    { path: "/agendamento-online", priority: 0.95, changeFrequency: "weekly" as const },
    { path: "/termos", priority: 0.5, changeFrequency: "yearly" as const },
    { path: "/politicas", priority: 0.5, changeFrequency: "yearly" as const },
    { path: "/login", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/entrar", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/conta", priority: 0.55, changeFrequency: "monthly" as const },
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  try {
    const supabase = await createClient();
    const { data: rows } = await supabase.from("businesses").select("slug, updated_at").order("slug");
    if (rows?.length) {
      for (const row of rows) {
        if (!row.slug) continue;
        entries.push({
          url: `${base}/${encodeURIComponent(row.slug)}`,
          lastModified: row.updated_at ? new Date(row.updated_at) : now,
          changeFrequency: "weekly",
          priority: 0.85,
        });
      }
    }
  } catch {
    /* build sem DB; mantém URLs estáticas */
  }

  return entries;
}
