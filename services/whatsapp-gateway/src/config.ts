export const config = {
  port: Number(process.env.PORT ?? 4010),
  apiKey: (process.env.WHATSAPP_GATEWAY_API_KEY ?? "").trim(),
  agenndoAppUrl: (process.env.AGENNDO_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  provider: ((process.env.WHATSAPP_PROVIDER ?? "mock").trim().toLowerCase() === "baileys" ? "baileys" : "mock") as
    | "mock"
    | "baileys",
  sessionStorePath: process.env.SESSION_STORE_PATH ?? "./data/sessions",
  outboxPollIntervalMs: Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 5000),
  outboxBatchSize: Number(process.env.OUTBOX_BATCH_SIZE ?? 20),
  logLevel: process.env.LOG_LEVEL ?? "info",
};
