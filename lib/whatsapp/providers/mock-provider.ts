import type { WhatsAppConnectResult } from "../provider-interface";
import type {
  SendWhatsAppMessageInput,
  SendWhatsAppMessageResult,
  WhatsAppSessionInfo,
  WhatsAppSessionStatus,
} from "../types";

const sessions = new Map<
  string,
  {
    status: WhatsAppSessionStatus;
    phoneE164: string | null;
    lastConnectedAt: string | null;
    lastError: string | null;
  }
>();

const sentLog: Array<{
  businessId: string;
  toPhone: string;
  body: string;
  at: string;
  providerMessageId: string;
}> = [];

function ensureSession(businessId: string) {
  if (!sessions.has(businessId)) {
    sessions.set(businessId, {
      status: "disconnected",
      phoneE164: null,
      lastConnectedAt: null,
      lastError: null,
    });
  }
  return sessions.get(businessId)!;
}

export function getMockWhatsAppSentLog() {
  return [...sentLog];
}

export function clearMockWhatsAppState() {
  sessions.clear();
  sentLog.length = 0;
}

export class MockWhatsAppProvider {
  readonly kind = "mock";

  async getSession(businessId: string): Promise<WhatsAppSessionInfo> {
    const s = ensureSession(businessId);
    return {
      businessId,
      status: s.status,
      phoneE164: s.phoneE164,
      lastConnectedAt: s.lastConnectedAt,
      lastError: s.lastError,
    };
  }

  async connect(businessId: string): Promise<WhatsAppConnectResult> {
    const s = ensureSession(businessId);
    s.status = "connecting";
    s.lastError = null;
    s.status = "connected";
    s.phoneE164 = "5511999990000";
    s.lastConnectedAt = new Date().toISOString();
    return {
      ok: true,
      status: "connected",
      phoneE164: s.phoneE164,
      qrDataUrl: null,
    };
  }

  async disconnect(businessId: string) {
    const s = ensureSession(businessId);
    s.status = "disconnected";
    s.phoneE164 = null;
    s.lastConnectedAt = null;
    return { ok: true };
  }

  async sendMessage(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageResult> {
    const s = ensureSession(input.businessId);
    if (s.status !== "connected") {
      return { ok: false, error: "Sessao WhatsApp nao conectada (mock)" };
    }
    const providerMessageId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sentLog.push({
      businessId: input.businessId,
      toPhone: input.toPhone,
      body: input.body,
      at: new Date().toISOString(),
      providerMessageId,
    });
    return { ok: true, providerMessageId };
  }
}
