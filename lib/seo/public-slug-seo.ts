import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type PublicSlugSeo = {
  business: {
    id: string;
    name: string;
    city: string | null;
    segment: string | null;
    logo_url: string | null;
  } | null;
  personalization: {
    banner_url: string | null;
    tagline: string | null;
    about: string | null;
  } | null;
};

/** Uma query por request (generateMetadata + layout compartilham via React cache). */
export const getPublicSlugSeo = cache(async (slug: string): Promise<PublicSlugSeo> => {
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, city, segment, logo_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!business) return { business: null, personalization: null };
  const { data: personalization } = await supabase
    .from("personalization")
    .select("banner_url, tagline, about")
    .eq("business_id", business.id)
    .maybeSingle();
  return { business, personalization };
});
