import { getWhatsAppGatewayApiKey, getWhatsAppGatewayUrl } from "../config";
import type { WhatsAppConnectResult } from "../provider-interface";
import type {
  SendWhatsAppMessageInput,
  SendWhatsAppMessageResult,
  WhatsAppSessionInfo,
  WhatsAppSessionStatus,
} from "../types";

async function gatewayFetch(path: string, init?: RequestInit) {
  const base = getWhatsAppGatewayUrl();
  const key = getWhatsAppGatewayApiKey();
  if (!base || !key) {
    throw new Error("WHATSAPP_GATEWAY_URL ou WHATSAPP_GATEWAY_API_KEY nao configurados");
  }
  const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof data.error === "string" ? data.error : `Gateway HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export class GatewayWhatsAppProvider {
  readonly kind = "gateway";

  async getSession(businessId: string): Promise<WhatsAppSessionInfo> {
    try {
      const data = await gatewayFetch(`/v1/sessions/${encodeURIComponent(businessId)}`);
      return {
        businessId,
        status: (data.status as WhatsAppSessionStatus) ?? "disconnected",
        phoneE164: typeof data.phoneE164 === "string" ? data.phoneE164 : null,
        lastConnectedAt: typeof data.lastConnectedAt === "string" ? data.lastConnectedAt : null,
        lastError: typeof data.lastError === "string" ? data.lastError : null,
      };
    } catch (e) {
      return {
        businessId,
        status: "error",
        phoneE164: null,
        lastConnectedAt: null,
        lastError: e instanceof Error ? e.message : "Erro ao consultar gateway",
      };
    }
  }

  async connect(businessId: string): Promise<WhatsAppConnectResult> {
    try {
      const data = await gatewayFetch(`/v1/sessions/${encodeURIComponent(businessId)}/connect`, {
        method: "POST",
      });
      return {
        ok: Boolean(data.ok),
        status: (data.status as WhatsAppConnectResult["status"]) ?? "connecting",
        qrDataUrl: typeof data.qrDataUrl === "string" ? data.qrDataUrl : null,
        phoneE164: typeof data.phoneE164 === "string" ? data.phoneE164 : null,
        error: typeof data.error === "string" ? data.error : undefined,
      };
    } catch (e) {
      return {
        ok: false,
        status: "error",
        error: e instanceof Error ? e.message : "Falha ao conectar gateway",
      };
    }
  }

  async disconnect(businessId: string) {
    try {
      await gatewayFetch(`/v1/sessions/${encodeURIComponent(businessId)}/disconnect`, { method: "POST" });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Falha ao desconectar" };
    }
  }

  async sendMessage(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageResult> {
    try {
      const data = await gatewayFetch("/v1/messages/send", {
        method: "POST",
        body: JSON.stringify({
          businessId: input.businessId,
          toPhone: input.toPhone,
          body: input.body,
          outboxId: input.outboxId,
        }),
      });
      return {
        ok: Boolean(data.ok),
        providerMessageId: typeof data.providerMessageId === "string" ? data.providerMessageId : undefined,
        error: typeof data.error === "string" ? data.error : undefined,
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Falha ao enviar" };
    }
  }
}
