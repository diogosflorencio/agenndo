import { config } from "./config.js";
import { logger } from "./logger.js";
import { createApp } from "./app.js";
import { startOutboxWorker } from "./workers/outbox-worker.js";

const app = createApp();

app.listen(config.port, () => {
  logger.info({ port: config.port, provider: config.provider }, "whatsapp-gateway listening");
  startOutboxWorker();
});
