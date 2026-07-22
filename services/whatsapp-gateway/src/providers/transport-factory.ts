import type { GatewaySession, SendMessageInput, SendMessageResult, WhatsAppTransport } from "./transport-interface.js";

const sessions = new Map<string, GatewaySession>();
const sent: Array<{ businessId: string; toPhone: string; body: string; at: string; id: string }> = [];

export class MockTransport implements WhatsAppTransport {
  readonly kind = "mock";

  async getSession(businessId: string): Promise<GatewaySession> {
    return (
      sessions.get(businessId) ?? {
        businessId,
        status: "disconnected",
        phoneE164: null,
        lastConnectedAt: null,
        lastError: null,
      }
    );
  }

  async connect(businessId: string) {
    const session: GatewaySession = {
      businessId,
      status: "connected",
      phoneE164: "5511999990000",
      lastConnectedAt: new Date().toISOString(),
      lastError: null,
    };
    sessions.set(businessId, session);
    return { ok: true, status: "connected" as const, phoneE164: session.phoneE164 };
  }

  async disconnect(businessId: string) {
    sessions.set(businessId, {
      businessId,
      status: "disconnected",
      phoneE164: null,
      lastConnectedAt: null,
      lastError: null,
    });
    return { ok: true };
  }

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const session = await this.getSession(input.businessId);
    if (session.status !== "connected") {
      return { ok: false, error: "Sessao nao conectada" };
    }
    const providerMessageId = `gw_mock_${Date.now()}`;
    sent.push({
      businessId: input.businessId,
      toPhone: input.toPhone,
      body: input.body,
      at: new Date().toISOString(),
      id: providerMessageId,
    });
    return { ok: true, providerMessageId };
  }
}

export function getMockSentLog() {
  return [...sent];
}

/** Placeholder para Baileys: implementar auth state, QR e envio real na VPS. */
export class BaileysTransport implements WhatsAppTransport {
  readonly kind = "baileys";

  async getSession(businessId: string): Promise<GatewaySession> {
    return {
      businessId,
      status: "disconnected",
      phoneE164: null,
      lastConnectedAt: null,
      lastError: "Baileys ainda nao implementado neste servico",
    };
  }

  async connect(_businessId: string) {
    return {
      ok: false,
      status: "error" as const,
      error: "Implementar Baileys em src/providers/baileys/session-manager.ts",
    };
  }

  async disconnect(_businessId: string) {
    return { ok: true };
  }

  async sendMessage(_input: SendMessageInput): Promise<SendMessageResult> {
    return { ok: false, error: "Baileys ainda nao implementado" };
  }
}

export function createTransport(kind: "mock" | "baileys"): WhatsAppTransport {
  return kind === "baileys" ? new BaileysTransport() : new MockTransport();
}
