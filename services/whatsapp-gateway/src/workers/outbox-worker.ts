import { config } from "../config.js";
import { createTransport } from "../providers/transport-factory.js";
import { ackOutboxFailed, ackOutboxSent, fetchPendingOutbox } from "../services/agenndo-client.js";
import { logger } from "../logger.js";

const transport = createTransport(config.provider);
let timer: NodeJS.Timeout | null = null;
let running = false;

async function processBatch() {
  if (running) return;
  running = true;
  try {
    const items = await fetchPendingOutbox();
    for (const item of items) {
      const result = await transport.sendMessage({
        businessId: item.business_id,
        toPhone: item.recipient_phone,
        body: item.body,
        outboxId: item.id,
      });
      if (result.ok) {
        await ackOutboxSent(item.id, result.providerMessageId);
        logger.info({ outboxId: item.id, businessId: item.business_id }, "message sent");
      } else {
        await ackOutboxFailed(item.id, result.error ?? "send failed");
        logger.warn({ outboxId: item.id, err: result.error }, "message failed");
      }
    }
  } catch (e) {
    logger.error({ err: e instanceof Error ? e.message : e }, "outbox worker batch error");
  } finally {
    running = false;
  }
}

export function startOutboxWorker() {
  if (timer) return;
  timer = setInterval(() => void processBatch(), config.outboxPollIntervalMs);
  void processBatch();
  logger.info({ intervalMs: config.outboxPollIntervalMs }, "outbox worker started");
}

export function stopOutboxWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}
