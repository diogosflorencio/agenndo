import { createClient } from "@supabase/supabase-js";

/**
 * SECURITY: service role ignora RLS. Só servidor (webhooks, /api/public/*, sitemap).
 * Nunca importar em Client Components nem expor a chave no browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL ausente");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
