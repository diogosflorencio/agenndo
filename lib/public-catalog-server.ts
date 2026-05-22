import { createAdminClient } from "@/lib/supabase/admin";

/** Colunas seguras para a página pública — não expõe billing/Stripe. */
export type PublicBusinessRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  phone: string | null;
  primary_color: string | null;
  segment: string | null;
  logo_url: string | null;
};

export type PublicServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  emoji: string | null;
  image_url: string | null;
  description_public: string | null;
  variant_gallery: unknown;
  collaborator_services: { collaborator_id: string }[] | null;
};

export type PublicCollabRow = {
  id: string;
  name: string;
  role: string | null;
  color: string | null;
  avatar_url: string | null;
};

export type PublicPersonalizationRow = {
  banner_url: string | null;
  gallery_urls: string[] | null;
  social_links: unknown;
  instagram_url: string | null;
  facebook_url: string | null;
  whatsapp_number: string | null;
  tagline: string | null;
  about: string | null;
  public_theme: string | null;
  show_whatsapp_fab: boolean | null;
  address_line: string | null;
};

export type PublicPageCatalog = {
  business: PublicBusinessRow | null;
  services: PublicServiceRow[];
  collaborators: PublicCollabRow[];
  personalization: PublicPersonalizationRow | null;
};

/**
 * SECURITY: leitura do catálogo público só no servidor (service role).
 * Evita listagem anon de todos os negócios/serviços via PostgREST.
 */
export async function fetchPublicPageCatalogBySlug(slug: string): Promise<PublicPageCatalog> {
  const empty: PublicPageCatalog = {
    business: null,
    services: [],
    collaborators: [],
    personalization: null,
  };
  const trimmed = slug.trim();
  if (!trimmed) return empty;

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return empty;
  }

  const { data: biz } = await admin
    .from("businesses")
    .select("id, name, slug, city, phone, primary_color, segment, logo_url")
    .eq("slug", trimmed)
    .maybeSingle();

  if (!biz?.id) return empty;

  const bid = biz.id;
  const [sRes, cRes, pRes] = await Promise.all([
    admin
      .from("services")
      .select(
        "id, name, duration_minutes, price_cents, emoji, image_url, description_public, variant_gallery, collaborator_services(collaborator_id)"
      )
      .eq("business_id", bid)
      .eq("active", true)
      .is("archived_at", null),
    admin
      .from("collaborators")
      .select("id, name, role, color, avatar_url")
      .eq("business_id", bid)
      .eq("active", true),
    admin
      .from("personalization")
      .select(
        "banner_url, gallery_urls, social_links, instagram_url, facebook_url, whatsapp_number, tagline, about, public_theme, show_whatsapp_fab, address_line"
      )
      .eq("business_id", bid)
      .maybeSingle(),
  ]);

  return {
    business: biz as PublicBusinessRow,
    services: (sRes.data as PublicServiceRow[]) ?? [],
    collaborators: (cRes.data as PublicCollabRow[]) ?? [],
    personalization: (pRes.data as PublicPersonalizationRow) ?? null,
  };
}
