import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";

/** SECURITY: sitemap usa service role no servidor — não expõe listagem via anon REST. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticPaths = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/sobre", priority: 0.85, changeFrequency: "monthly" as const },
    { path: "/agendamento-online", priority: 0.95, changeFrequency: "weekly" as const },
    { path: "/colaborador", priority: 0.65, changeFrequency: "monthly" as const },
    { path: "/termos", priority: 0.5, changeFrequency: "yearly" as const },
    { path: "/politicas", priority: 0.5, changeFrequency: "yearly" as const },
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  try {
    const admin = createAdminClient();
    const { data: rows } = await admin.from("businesses").select("slug, updated_at").order("slug");
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
