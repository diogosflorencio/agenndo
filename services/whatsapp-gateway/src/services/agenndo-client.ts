import { config } from "../config.js";

export type OutboxItem = {
  id: string;
  business_id: string;
  recipient_phone: string;
  body: string;
  event_key: string;
};

async function agenndoFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${config.agenndoAppUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `HTTP ${res.status}`);
  }
  return data;
}

export async function fetchPendingOutbox(limit = config.outboxBatchSize): Promise<OutboxItem[]> {
  const data = await agenndoFetch(`/api/whatsapp/gateway/outbox?limit=${limit}`);
  return (data.items as OutboxItem[]) ?? [];
}

export async function ackOutboxSent(outboxId: string, providerMessageId?: string) {
  await agenndoFetch("/api/whatsapp/gateway/outbox", {
    method: "POST",
    body: JSON.stringify({ outboxId, status: "sent", providerMessageId }),
  });
}

export async function ackOutboxFailed(outboxId: string, error: string) {
  await agenndoFetch("/api/whatsapp/gateway/outbox", {
    method: "POST",
    body: JSON.stringify({ outboxId, status: "failed", error }),
  });
}

export async function pingAgenndoHealth() {
  return agenndoFetch("/api/whatsapp/gateway/health");
}
