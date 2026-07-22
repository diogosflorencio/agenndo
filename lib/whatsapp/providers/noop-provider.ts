import type { WhatsAppConnectResult } from "../provider-interface";
import type {
  SendWhatsAppMessageInput,
  SendWhatsAppMessageResult,
  WhatsAppSessionInfo,
} from "../types";

export class NoopWhatsAppProvider {
  readonly kind = "noop";

  async getSession(businessId: string): Promise<WhatsAppSessionInfo> {
    return {
      businessId,
      status: "disconnected",
      phoneE164: null,
      lastConnectedAt: null,
      lastError: null,
    };
  }

  async connect(_businessId: string): Promise<WhatsAppConnectResult> {
    return {
      ok: false,
      status: "disconnected",
      error: "Integracao WhatsApp disponivel em breve",
    };
  }

  async disconnect(_businessId: string) {
    return { ok: false, error: "Integracao WhatsApp disponivel em breve" };
  }

  async sendMessage(_input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageResult> {
    return { ok: false, error: "Integracao WhatsApp disponivel em breve" };
  }
}
