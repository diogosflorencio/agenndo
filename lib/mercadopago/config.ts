export type MercadoPagoConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  webhookSecret: string;
  publicKey: string;
  siteOrigin: string;
  /** Só true se o app MP tiver "OAuth com PKCE" habilitado no painel. */
  oauthUsePkce: boolean;
};

function parseOAuthUsePkce(): boolean {
  const raw = process.env.MERCADOPAGO_OAUTH_USE_PKCE?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function getMercadoPagoConfig(): MercadoPagoConfig | null {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID?.trim();
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET?.trim();
  const redirectUri = process.env.MERCADOPAGO_REDIRECT_URI?.trim();
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() ?? "";
  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim() ?? "";

  if (!clientId || !clientSecret || !redirectUri) return null;

  let siteOrigin = "http://localhost:3000";
  try {
    siteOrigin = new URL(redirectUri).origin;
  } catch {
    /* keep default */
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    webhookSecret,
    publicKey,
    siteOrigin,
    oauthUsePkce: parseOAuthUsePkce(),
  };
}

export function mercadoPagoConfigured(): boolean {
  return getMercadoPagoConfig() !== null;
}
