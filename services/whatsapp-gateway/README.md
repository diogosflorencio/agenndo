# WhatsApp Gateway (Agenndo)

Servico Node.js isolado para rodar na VPS. Responsavel por sessoes WhatsApp por empresa e processamento da fila de mensagens.

## Papel na arquitetura

O app Next.js (Agenndo) nunca importa Baileys. Ele enfileira mensagens em `whatsapp_message_outbox` e expoe APIs internas em `/api/whatsapp/gateway/*`. Este servico:

1. Poll da fila via API autenticada
2. Envia mensagens pelo transport (mock ou Baileys)
3. Confirma sucesso ou falha na outbox

## Desenvolvimento local

```bash
cd services/whatsapp-gateway
cp .env.example .env
npm install
npm run dev
```

No `.env.local` do Agenndo (app principal):

```
WHATSAPP_PROVIDER=gateway
WHATSAPP_GATEWAY_URL=http://localhost:4010
WHATSAPP_GATEWAY_API_KEY=dev-gateway-key-change-me
NEXT_PUBLIC_WHATSAPP_UI_MODE=dev
```

Use a mesma `WHATSAPP_GATEWAY_API_KEY` nos dois projetos.

## Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | /health | Health check publico |
| GET | /v1/sessions/:businessId | Status da sessao |
| POST | /v1/sessions/:businessId/connect | Inicia conexao (QR futuro) |
| POST | /v1/sessions/:businessId/disconnect | Encerra sessao |
| GET | /v1/sessions/:businessId/qr | QR code (placeholder Baileys) |
| POST | /v1/messages/send | Envio direto |
| GET | /v1/agenndo/health | Testa link com o app Agenndo |

Autenticacao: header `Authorization: Bearer <WHATSAPP_GATEWAY_API_KEY>`.

## Baileys (futuro)

Implementar em `src/providers/baileys/`:

- `session-manager.ts` auth state por `businessId` em `SESSION_STORE_PATH`
- Multi tenant: pasta `data/sessions/<businessId>/`
- Reconexao automatica e rotacao de QR

Trocar `WHATSAPP_PROVIDER=baileys` na VPS.

## Worker

`src/workers/outbox-worker.ts` faz poll periodico na outbox do Agenndo. Intervalo: `OUTBOX_POLL_INTERVAL_MS` (padrao 5000).

## Producao

1. Deploy deste servico na VPS (PM2, Docker ou systemd)
2. Configurar env apontando para `AGENNDO_APP_URL` de producao
3. No Vercel: `WHATSAPP_PROVIDER=gateway`, `WHATSAPP_GATEWAY_URL`, `NEXT_PUBLIC_WHATSAPP_UI_MODE=live`
