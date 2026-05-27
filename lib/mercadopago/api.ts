import { getMercadoPagoConfig } from "@/lib/mercadopago/config";

const MP_API = "https://api.mercadopago.com";

export type MpPreferenceItem = {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
};

export type MpPreferenceResult = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
};

export type MpPaymentInfo = {
  id: number;
  status: string;
  transaction_amount: number;
  external_reference?: string;
};

async function mpFetch(path: string, accessToken: string, init?: RequestInit) {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "message" in json
        ? String((json as { message: unknown }).message)
        : res.statusText;
    throw new Error(msg || `Mercado Pago HTTP ${res.status}`);
  }
  return json;
}

export async function mpExchangeOAuthCode(code: string, codeVerifier?: string): Promise<{
  access_token: string;
  refresh_token?: string;
  user_id: number;
  expires_in?: number;
}> {
  const cfg = getMercadoPagoConfig();
  if (!cfg) throw new Error("Mercado Pago não configurado.");

  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: cfg.redirectUri,
  });
  if (codeVerifier?.trim()) {
    body.set("code_verifier", codeVerifier.trim());
  }

  const res = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = typeof json === "object" && json && "error" in json ? String(json.error) : "oauth_failed";
    const e = new Error(err);
    (e as Error & { code?: string }).code = err;
    throw e;
  }
  return json as {
    access_token: string;
    refresh_token?: string;
    user_id: number;
    expires_in?: number;
  };
}

export async function mpCreatePreference(
  accessToken: string,
  input: {
    items: MpPreferenceItem[];
    externalReference: string;
    notificationUrl: string;
    backUrls?: { success?: string; pending?: string; failure?: string };
    payerEmail?: string;
  }
): Promise<MpPreferenceResult> {
  const payload = {
    items: input.items.map((i) => ({
      ...i,
      currency_id: i.currency_id ?? "BRL",
    })),
    external_reference: input.externalReference,
    notification_url: input.notificationUrl,
    back_urls: input.backUrls,
    auto_return: "approved",
    statement_descriptor: "AGENNDO",
  };
  return mpFetch("/checkout/preferences", accessToken, {
    method: "POST",
    body: JSON.stringify(payload),
  }) as Promise<MpPreferenceResult>;
}

export async function mpGetPayment(accessToken: string, paymentId: string | number): Promise<MpPaymentInfo> {
  return mpFetch(`/v1/payments/${paymentId}`, accessToken) as Promise<MpPaymentInfo>;
}

export function mercadoPagoWebhookUrl(): string {
  const origin = getMercadoPagoConfig()?.siteOrigin ?? "http://localhost:3000";
  return `${origin}/api/mercadopago/webhook`;
}
