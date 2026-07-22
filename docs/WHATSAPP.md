# WhatsApp no Agenndo

Infraestrutura preparada para integracao futura com WhatsApp (Baileys ou API oficial), sem acoplar o app principal a nenhuma biblioteca de mensagens.

## Camadas

| Camada | Caminho | Funcao |
|--------|---------|--------|
| UI | `app/dashboard/whatsapp/page.tsx` | Configuracao, templates, preview, simulacao em dev |
| API dashboard | `app/api/dashboard/whatsapp/*` | Settings, templates, sessao, simulacao |
| API gateway | `app/api/whatsapp/gateway/*` | Poll e ack da outbox (servico VPS) |
| Dominio | `lib/whatsapp/*` | Eventos, variaveis, outbox, provider abstrato |
| Integracao | `lib/whatsapp/integration/appointment-events.ts` | Ponto de ligacao com book/cancel/webhook (nao ligado aos fluxos atuais) |
| Servico VPS | `services/whatsapp-gateway/` | Node isolado, mock ou Baileys |

## Banco

Migration: `supabase/migrations/20260721120000_whatsapp_infrastructure.sql`

Tabelas:

- `whatsapp_settings` configuracao geral por negocio (`owner_notification_phone` e opcional; se vazio, alertas do dono usam o numero da sessao WhatsApp conectada)
- `whatsapp_sessions` sessao isolada por empresa
- `whatsapp_message_templates` templates por evento e destinatario
- `whatsapp_message_outbox` fila para envio imediato ou agendado

Funcao `seed_whatsapp_defaults(business_id)` cria registros e templates padrao.

## Eventos mapeados

Definidos em `lib/whatsapp/events.ts`: criacao, confirmacao, cancelamento, reagendamento, pagamento pendente/confirmado, lembretes (48h, 24h, 2h, 1h), confirmacao de presenca, agradecimento, avaliacao, reativacao, falta, alertas para dono e profissional.

## Variaveis de template

`lib/whatsapp/variables.ts`: `{nome}`, `{empresa}`, `{servico}`, `{data}`, `{hora}`, `{valor}`, `{link_vitrine}`, etc. Sistema extensivel por aliases.

## Modos de operacao

| Ambiente | WHATSAPP_PROVIDER | NEXT_PUBLIC_WHATSAPP_UI_MODE | Comportamento |
|----------|-------------------|-------------------------------|---------------|
| Dev local | mock (padrao) | dev (padrao) | UI completa, conexao simulada, simular envio |
| Producao sem VPS | noop | coming_soon (padrao) | Configuracao salva; conexao bloqueada |
| Producao com VPS | gateway | live | Gateway externo envia mensagens |

## Env (app principal)

Ver `.env.example` secoes WhatsApp.

## Ligacao aos fluxos de agendamento (proxima fase)

Chamar `enqueueWhatsAppForAppointmentEvent()` de:

- `app/api/public/book/route.ts` apos insert
- `app/api/public/cancel/route.ts` apos cancelamento
- `lib/mercadopago/apply-payment-approved.ts` apos pagamento
- Dashboard ao alterar status (compareceu, faltou)

Somente quando `whatsapp_settings.master_enabled = true`. Nenhuma dessas chamadas foi adicionada nesta fase para preservar comportamento atual.

## Servico VPS

Ver `services/whatsapp-gateway/README.md`.
