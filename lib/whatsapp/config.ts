import type { WhatsAppProviderKind, WhatsAppUiMode } from "./types";

export function getWhatsAppProviderKind(): WhatsAppProviderKind {
  const raw = (process.env.WHATSAPP_PROVIDER ?? "").trim().toLowerCase();
  if (raw === "mock" || raw === "noop" || raw === "gateway") return raw;
  if (process.env.NODE_ENV === "development") return "mock";
  return "noop";
}

export function getWhatsAppUiMode(): WhatsAppUiMode {
  const raw = (process.env.NEXT_PUBLIC_WHATSAPP_UI_MODE ?? "").trim().toLowerCase();
  if (raw === "dev" || raw === "coming_soon" || raw === "live") return raw;
  if (process.env.NODE_ENV === "development") return "dev";
  return "coming_soon";
}

export function getWhatsAppGatewayUrl(): string | null {
  const url = (process.env.WHATSAPP_GATEWAY_URL ?? "").trim();
  return url || null;
}

export function getWhatsAppGatewayApiKey(): string | null {
  const key = (process.env.WHATSAPP_GATEWAY_API_KEY ?? "").trim();
  return key || null;
}

export function isWhatsAppLiveEnabled(): boolean {
  return getWhatsAppUiMode() === "live" && getWhatsAppProviderKind() === "gateway" && !!getWhatsAppGatewayUrl();
}

export function isWhatsAppDevMockEnabled(): boolean {
  return getWhatsAppUiMode() === "dev" || getWhatsAppProviderKind() === "mock";
}
