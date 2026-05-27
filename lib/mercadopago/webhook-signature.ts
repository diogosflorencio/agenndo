import { createHmac, timingSafeEqual } from "crypto";
import { getMercadoPagoConfig } from "@/lib/mercadopago/config";

/** Valida x-signature do Mercado Pago (notificações IPN/Webhooks). */
export function verifyMercadoPagoWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null
): boolean {
  const secret = getMercadoPagoConfig()?.webhookSecret;
  if (!secret || !xSignature || !dataId) return !secret ? true : false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    })
  ) as Record<string, string>;

  const ts = parts.ts;
  const sent = parts.v1;
  if (!ts || !sent) return false;

  const manifest = `id:${dataId};request-id:${xRequestId ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
  } catch {
    return false;
  }
}
