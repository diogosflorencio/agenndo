import type { WhatsAppProvider } from "./provider-interface";
import { MockWhatsAppProvider } from "./providers/mock-provider";
import { NoopWhatsAppProvider } from "./providers/noop-provider";
import { GatewayWhatsAppProvider } from "./providers/gateway-provider";
import { getWhatsAppProviderKind } from "./config";

let cached: WhatsAppProvider | null = null;

export function getWhatsAppProvider(): WhatsAppProvider {
  if (cached) return cached;
  const kind = getWhatsAppProviderKind();
  switch (kind) {
    case "mock":
      cached = new MockWhatsAppProvider();
      break;
    case "gateway":
      cached = new GatewayWhatsAppProvider();
      break;
    case "noop":
    default:
      cached = new NoopWhatsAppProvider();
      break;
  }
  return cached;
}

export function resetWhatsAppProviderCache() {
  cached = null;
}
