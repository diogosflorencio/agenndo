import { createAdminClient } from "@/lib/supabase/admin";
import { type PaymentPolicy, type DepositMode } from "@/lib/business-payment-policy";
import { toPublicPaymentSettings, type PublicBusinessPaymentFields } from "@/lib/public-payment-display";

/** Colunas seguras para a página pública — não expõe billing/Stripe nem tokens MP. */
export type PublicBusinessRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  phone: string | null;
  primary_color: string | null;
  segment: string | null;
  logo_url: string | null;
  /** Só preenchida na API pública quando `public_pix_suggest_enabled` e houver chave. */
  public_pix_key?: string | null;
  public_pix_suggest_enabled?: boolean;
  public_pix_suggest_message?: string | null;
  payment_policy: PaymentPolicy;
  deposit_mode: DepositMode;
  deposit_percent: number | null;
  deposit_fixed_cents: number | null;
  payment_client_message: string | null;
  mp_checkout_enabled: boolean;
  mp_connected: boolean;
};

export type { PublicBusinessPaymentFields };

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
    .select(
      "id, name, slug, city, phone, primary_color, segment, logo_url, public_pix_key, public_pix_suggest_enabled, public_pix_suggest_message, payment_policy, deposit_mode, deposit_percent, deposit_fixed_cents, payment_client_message, mp_checkout_enabled, mp_user_id, mp_access_token_enc"
    )
    .eq("slug", trimmed)
    .maybeSingle();

  if (!biz?.id) return empty;

  const suggestOn = Boolean(biz.public_pix_suggest_enabled);
  const rawKey = typeof biz.public_pix_key === "string" ? biz.public_pix_key.trim() : "";
  const payment = toPublicPaymentSettings(biz as Record<string, unknown>);
  const business: PublicBusinessRow = {
    id: biz.id,
    name: biz.name,
    slug: biz.slug,
    city: biz.city,
    phone: biz.phone,
    primary_color: biz.primary_color,
    segment: biz.segment,
    logo_url: biz.logo_url,
    public_pix_suggest_enabled: suggestOn,
    public_pix_key: suggestOn && rawKey ? rawKey : null,
    public_pix_suggest_message:
      suggestOn && rawKey
        ? typeof biz.public_pix_suggest_message === "string" && biz.public_pix_suggest_message.trim()
          ? biz.public_pix_suggest_message.trim()
          : null
        : null,
    payment_policy: payment.payment_policy,
    deposit_mode: payment.deposit_mode,
    deposit_percent: payment.deposit_percent,
    deposit_fixed_cents: payment.deposit_fixed_cents,
    payment_client_message: payment.payment_client_message,
    mp_checkout_enabled: payment.mp_checkout_enabled,
    mp_connected: payment.mp_connected,
  };

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
    business,
    services: (sRes.data as PublicServiceRow[]) ?? [],
    collaborators: (cRes.data as PublicCollabRow[]) ?? [],
    personalization: (pRes.data as PublicPersonalizationRow) ?? null,
  };
}
