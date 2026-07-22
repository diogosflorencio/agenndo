export type SessionStatus = "disconnected" | "connecting" | "connected" | "error";

export type GatewaySession = {
  businessId: string;
  status: SessionStatus;
  phoneE164: string | null;
  lastConnectedAt: string | null;
  lastError: string | null;
};

export type SendMessageInput = {
  businessId: string;
  toPhone: string;
  body: string;
  outboxId?: string;
};

export type SendMessageResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

export interface WhatsAppTransport {
  readonly kind: string;
  getSession(businessId: string): Promise<GatewaySession>;
  connect(businessId: string): Promise<{ ok: boolean; status: SessionStatus; phoneE164?: string | null; qrDataUrl?: string | null; error?: string }>;
  disconnect(businessId: string): Promise<{ ok: boolean; error?: string }>;
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
}
