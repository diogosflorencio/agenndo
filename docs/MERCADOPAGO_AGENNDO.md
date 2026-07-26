# Mercado Pago no Agenndo (agendamento)

## Objetivo

Permitir que o **prestador** conecte a **própria conta** Mercado Pago e cobre clientes na página pública:

- Pagamento **opcional** (antecipado)
- **Sinal** obrigatório (% ou valor fixo)
- **100%** antecipado obrigatório

Complementa o **Pix manual** (chave + mensagem, sem verificação).

## Diferença do Catallogo

| Catallogo | Agenndo |
|-----------|---------|
| Checkout Pro (redirect) | **Payment Brick** embutido na confirmação do agendamento |
| `orders` | `appointments` |
| Total do pedido | `due_cents` = sinal ou total (servidor) |

## Variáveis de ambiente

Crie um app em [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/app) (tipo Checkout / Marketplace conforme modelo).

| Variável | Onde pegar | Uso |
|----------|------------|-----|
| `MERCADOPAGO_CLIENT_ID` | App → Credenciais | OAuth |
| `MERCADOPAGO_CLIENT_SECRET` | App → Credenciais | OAuth + API |
| `MERCADOPAGO_REDIRECT_URI` | Você define | **OAuth:** `https://SEU_DOMINIO/api/mercadopago/oauth/callback` - **não** use a URL do webhook aqui |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | App → Credenciais públicas | Payment Brick no browser |
| `MERCADOPAGO_WEBHOOK_SECRET` | App → Webhooks → assinatura | Só para validar `POST /api/mercadopago/webhook` (URL do webhook é configurada no **painel** MP, não nesta variável) |
| `APP_ENCRYPTION_KEY` | String longa aleatória (32+ chars) | Criptografia dos tokens OAuth + HMAC do `state` |

Opcional: `NEXT_PUBLIC_SITE_URL` - fallback de origem se redirect URI for outro host.

### Painel Mercado Pago

1. **URLs de redirecionamento** = valor **idêntico** de `MERCADOPAGO_REDIRECT_URI` - **somente HTTPS** (o MP não aceita `http://localhost`)
   - Produção: `https://www.agenndo.com.br/api/mercadopago/oauth/callback`
2. **Webhook** URL = `https://SEU_DOMINIO/api/mercadopago/webhook`
3. Eventos: pagamentos (`payment`)
4. **PKCE** (opcional): padrão **off** (`MERCADOPAGO_OAUTH_USE_PKCE=false`). Só `true` se o app MP tiver **OAuth com PKCE** ligado; senão a URL de autorização retorna **400**.

### OAuth em desenvolvimento local

O Mercado Pago **não permite** `http://localhost` como redirect. Opções:

| Opção | Como |
|-------|------|
| **Produção (mais simples)** | `MERCADOPAGO_REDIRECT_URI=https://www.agenndo.com.br/api/mercadopago/oauth/callback` no `.env.local` e no painel MP. Conecte a conta em **www.agenndo.com.br** → Receber pagamentos. O resto do app pode rodar em `localhost`. |
| **Túnel HTTPS** | [ngrok](https://ngrok.com/) / Cloudflare Tunnel: `https://SEU-TUNEL.ngrok-free.app/api/mercadopago/oauth/callback` no painel MP e no `.env`; `NEXT_PUBLIC_SITE_URL` com o mesmo host. |

### Erro 403 em `auth.mercadopago.com.br/authorization`

| Sintoma | Correção |
|---------|----------|
| `redirect_uri` com `http://` | Troque por URL **HTTPS** cadastrada no app MP |
| URL não cadastrada no painel | Cadastre exatamente o valor de `MERCADOPAGO_REDIRECT_URI` |
| `.env` diferente do painel | Mesma string, byte a byte (sem barra final) |

### Testes (sandbox)

Use credenciais de **test** do app e usuários de teste MP. A Public Key de teste vai em `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`.

## Fluxo técnico

1. Dono: **Dashboard → Receber pagamentos** → Conectar MP (OAuth).
2. Define política (opcional / sinal / integral) e ativa cobrança online.
3. Cliente agenda na vitrine; se houver valor devido, servidor cria **preference** e retorna `preferenceId`.
4. **Payment Brick** renderiza na página (SDK `https://sdk.mercadopago.com/js/v2`).
5. Webhook confirma pagamento → atualiza `appointment_payments` + `appointments.payment_status` + `status = confirmado`.

## Arquivos principais

- `lib/mercadopago/*` - OAuth, API, webhook
- `lib/business-payment-policy.ts` - cálculo de sinal
- `app/api/mercadopago/*` - rotas
- `app/dashboard/pagamentos/page.tsx` - configuração
- `components/public/mercadopago-payment-brick.tsx` - UI cliente
- `supabase/migrations/20260528120000_mercadopago_appointments.sql`

## Integração pública (vitrine)

- Política de pagamento exposta em `/api/public/page-data` (catálogo por slug).
- Na confirmação do agendamento: bloco Pix (manual) + bloco Mercado Pago quando `mp_connected` + `mp_checkout_enabled` + política ≠ `off`.
- Após `POST /api/public/book`: `payment_due_cents` / `payment_status`; tela de sucesso com **Payment Brick** quando há valor devido.
- Pagamento obrigatório: agendamento fica `agendado` + `payment_status=pending` até webhook aprovar → `confirmado`.

## Deploy

```bash
npx supabase db push
```

Confirme env na Vercel/hosting e rode teste OAuth + pagamento de teste + webhook (túnel HTTPS se precisar testar callback em máquina local).
