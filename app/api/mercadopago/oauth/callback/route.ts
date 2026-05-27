import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMercadoPagoConfig } from "@/lib/mercadopago/config";
import { mpExchangeOAuthCode } from "@/lib/mercadopago/api";
import { mercadoPagoOAuthErrorMessage } from "@/lib/mercadopago/oauth-messages";
import {
  absoluteMercadoPagoRedirect,
  mercadoPagoOAuthErrorPath,
  mercadoPagoOAuthReturnPath,
} from "@/lib/mercadopago/oauth-redirect";
import { verifyMercadoPagoOAuthState } from "@/lib/mercadopago/oauth-state";
import { saveBusinessMpTokens } from "@/lib/mercadopago/business-mp";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const parsed = stateRaw ? verifyMercadoPagoOAuthState(stateRaw) : null;
  const returnTo = parsed?.returnTo ?? "/dashboard/pagamentos";

  if (oauthError) {
    return NextResponse.redirect(
      absoluteMercadoPagoRedirect(mercadoPagoOAuthErrorPath(oauthError, returnTo))
    );
  }

  if (!code || !parsed?.userId) {
    return NextResponse.redirect(
      absoluteMercadoPagoRedirect(mercadoPagoOAuthErrorPath("invalid_state", returnTo))
    );
  }

  try {
    const mpCfg = getMercadoPagoConfig();
    const codeVerifier =
      mpCfg?.oauthUsePkce && parsed.codeVerifier?.trim() ? parsed.codeVerifier.trim() : undefined;
    const tokens = await mpExchangeOAuthCode(code, codeVerifier);
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return NextResponse.redirect(
        absoluteMercadoPagoRedirect(mercadoPagoOAuthErrorPath("server_config", returnTo))
      );
    }

    const { data: biz } = await admin
      .from("businesses")
      .select("id")
      .eq("profile_id", parsed.userId)
      .maybeSingle();

    if (!biz?.id) {
      return NextResponse.redirect(
        absoluteMercadoPagoRedirect(mercadoPagoOAuthErrorPath("no_business", returnTo))
      );
    }

    await saveBusinessMpTokens(admin, biz.id, {
      mpUserId: String(tokens.user_id),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresInSec: tokens.expires_in,
    });

    return NextResponse.redirect(absoluteMercadoPagoRedirect(mercadoPagoOAuthReturnPath(returnTo)));
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "oauth_failed";
    const msg = mercadoPagoOAuthErrorMessage(code);
    const path = mercadoPagoOAuthErrorPath(code, returnTo);
    const u = new URL(path, "http://local");
    u.searchParams.set("mp_error_detail", msg.slice(0, 120));
    return NextResponse.redirect(absoluteMercadoPagoRedirect(`${u.pathname}${u.search}`));
  }
}
