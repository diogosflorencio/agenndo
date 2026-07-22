import express from "express";
import { config } from "./config.js";
import { createTransport } from "./providers/transport-factory.js";
import { pingAgenndoHealth } from "./services/agenndo-client.js";

const transport = createTransport(config.provider);

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers.authorization ?? "";
  const headerKey = req.headers["x-whatsapp-gateway-key"];
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!config.apiKey || (token !== config.apiKey && headerKey !== config.apiKey)) {
    res.status(401).json({ error: "Nao autorizado" });
    return;
  }
  next();
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "whatsapp-gateway", provider: config.provider, ts: new Date().toISOString() });
  });

  app.use(requireAuth);

  app.get("/v1/sessions/:businessId", async (req, res) => {
    const session = await transport.getSession(req.params.businessId);
    res.json({
      status: session.status,
      phoneE164: session.phoneE164,
      lastConnectedAt: session.lastConnectedAt,
      lastError: session.lastError,
    });
  });

  app.post("/v1/sessions/:businessId/connect", async (req, res) => {
    const result = await transport.connect(req.params.businessId);
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post("/v1/sessions/:businessId/disconnect", async (req, res) => {
    const result = await transport.disconnect(req.params.businessId);
    res.json(result);
  });

  app.get("/v1/sessions/:businessId/qr", async (_req, res) => {
    res.json({ qrDataUrl: null, note: "QR via Baileys na VPS (placeholder)" });
  });

  app.post("/v1/messages/send", async (req, res) => {
    const { businessId, toPhone, body, outboxId } = req.body as {
      businessId?: string;
      toPhone?: string;
      body?: string;
      outboxId?: string;
    };
    if (!businessId || !toPhone || !body) {
      res.status(400).json({ ok: false, error: "businessId, toPhone e body sao obrigatorios" });
      return;
    }
    const result = await transport.sendMessage({ businessId, toPhone, body, outboxId });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.get("/v1/agenndo/health", async (_req, res) => {
    try {
      const data = await pingAgenndoHealth();
      res.json({ ok: true, agenndo: data });
    } catch (e) {
      res.status(502).json({ ok: false, error: e instanceof Error ? e.message : "Falha" });
    }
  });

  return app;
}
