import type {
  SendWhatsAppMessageInput,
  SendWhatsAppMessageResult,
  WhatsAppSessionInfo,
  WhatsAppSessionStatus,
} from "./types";

export type WhatsAppConnectResult = {
  ok: boolean;
  status: WhatsAppSessionStatus;
  qrDataUrl?: string | null;
  phoneE164?: string | null;
  error?: string;
};

/** Contrato entre o Agenndo e qualquer implementacao de WhatsApp (Baileys, API oficial, mock). */
export interface WhatsAppProvider {
  readonly kind: string;
  getSession(businessId: string): Promise<WhatsAppSessionInfo>;
  connect(businessId: string): Promise<WhatsAppConnectResult>;
  disconnect(businessId: string): Promise<{ ok: boolean; error?: string }>;
  sendMessage(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageResult>;
}

export type WhatsAppProviderFactory = () => WhatsAppProvider;
