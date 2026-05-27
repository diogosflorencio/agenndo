import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMercadoPagoConfig } from "@/lib/mercadopago/config";
import { createMercadoPagoPkcePair } from "@/lib/mercadopago/oauth-pkce";
import { signMercadoPagoOAuthState, safeOAuthReturnPath } from "@/lib/mercadopago/oauth-state";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const cfg = getMercadoPagoConfig();
  if (!cfg) {
    const rawRedirect = process.env.MERCADOPAGO_REDIRECT_URI?.trim() ?? "";
    const misconfiguredWebhook =
      rawRedirect.toLowerCase().includes("/webhook") ||
      (rawRedirect.length > 0 && !rawRedirect.toLowerCase().endsWith("/api/mercadopago/oauth/callback"));
    return NextResponse.json(
      {
        error: misconfiguredWebhook
          ? "MERCADOPAGO_REDIRECT_URI está errado (parece URL de webhook). Use …/api/mercadopago/oauth/callback — o webhook é outra variável/URL no painel MP."
          : "Mercado Pago não configurado no servidor.",
        expected_redirect_uri: "https://www.agenndo.com.br/api/mercadopago/oauth/callback",
        configured_redirect_uri: rawRedirect || null,
      },
      { status: misconfiguredWebhook ? 400 : 503 }
    );
  }

  if (cfg.redirectUri.startsWith("http://")) {
    return NextResponse.json(
      {
        error:
          "Mercado Pago só aceita redirect HTTPS. Ajuste MERCADOPAGO_REDIRECT_URI (ex.: https://www.agenndo.com.br/api/mercadopago/oauth/callback) ou use um túnel HTTPS (ngrok).",
        redirect_uri: cfg.redirectUri,
        redirect_uri_insecure: true,
      },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const returnTo = safeOAuthReturnPath(url.searchParams.get("returnTo"));
  const pkce = cfg.oauthUsePkce ? createMercadoPagoPkcePair() : null;
  const state = signMercadoPagoOAuthState({
    userId: user.id,
    returnTo,
    codeVerifier: pkce?.verifier ?? "",
  });

  const authorize = new URL("https://auth.mercadopago.com.br/authorization");
  authorize.searchParams.set("client_id", cfg.clientId);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("platform_id", "mp");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("redirect_uri", cfg.redirectUri);
  if (pkce) {
    authorize.searchParams.set("code_challenge", pkce.challenge);
    authorize.searchParams.set("code_challenge_method", "S256");
  }

  return NextResponse.json({
    authorize_url: authorize.toString(),
    redirect_uri: cfg.redirectUri,
    oauth_use_pkce: cfg.oauthUsePkce,
  });
}
