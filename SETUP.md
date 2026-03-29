# Configuração do Agenndo

Guia para conectar Supabase, Google Auth, repositório GitHub e Vercel.

---

## 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Settings → API** anote:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. No **SQL Editor**, execute o conteúdo de `supabase/schema.sql` na ordem (tabelas, RLS, triggers).

### Habilitar login com Google no Supabase

1. No projeto: **Authentication → Providers → Google**.
2. Ative o provider e preencha **Client ID** e **Client Secret** do Google (veja seção Google abaixo).
3. Em **Authentication → URL Configuration**:
   - **Site URL**: em dev `http://localhost:3000`, em produção sua URL da Vercel (ex.: `https://agenndo.vercel.app`).
   - **Redirect URLs**: adicione **todas** as URLs que o app usar (literalmente iguais ao `redirectTo`):
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/oauth-bridge` (fluxo com popup em localhost)
     - `https://seu-dominio.vercel.app/auth/callback`
     - (e qualquer outro host/porta que você abrir no navegador)

4. No `.env.local`, para o Supabase não “cair” na Site URL errada em dev, use:

   - `NEXT_PUBLIC_SUPABASE_OAUTH_ORIGIN=http://localhost:3000`

   Isso força `signInWithOAuth({ redirectTo: 'http://localhost:3000/auth/callback' })` (e o bridge no popup). Em produção, defina na Vercel o mesmo tipo de variável com a URL pública do app (ex.: `https://agenndo.com.br`).

---

## 2. Google (OAuth para login)

1. Acesse [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um projeto ou selecione um existente.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Tipo: **Web application**.
5. **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `https://seu-dominio.vercel.app`
6. **Authorized redirect URIs** (use a URL de callback do **Supabase**):
   - Abra no Supabase: **Authentication → Providers → Google**.
   - Copie a URL que aparece como “Callback URL” (algo como `https://seu-projeto.supabase.co/auth/v1/callback`) e cole aqui.
7. Gere o **Client ID** e **Client Secret** e preencha no Supabase em **Authentication → Providers → Google**.

---

## 3. Variáveis de ambiente (local)

Na raiz do projeto:

```bash
cp .env.example .env.local
```

Edite `.env.local` e preencha:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Não commite `.env.local` (já deve estar no `.gitignore`).

---

## 4. Repositório GitHub e Vercel

O repositório [diogosflorencio/agenndo](https://github.com/diogosflorencio/agenndo) já está conectado à Vercel. Para garantir:

### Se o projeto ainda não estiver na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login (com a conta GitHub).
2. **Add New → Project** e importe o repositório `diogosflorencio/agenndo`.
3. Framework: **Next.js** (detectado automaticamente).
4. Em **Environment Variables** adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Em **Supabase → URL Configuration**, adicione a URL de produção da Vercel (ex.: `https://agenndo.vercel.app`) em **Site URL** e em **Redirect URLs** como `https://agenndo.vercel.app/auth/callback`.

### Deploy

- Cada push na branch principal (ex.: `main`) gera um deploy automático na Vercel.
- Para rodar local: `npm run dev` (com `.env.local` configurado).

---

## 5. Resumo de URLs importantes

| Onde           | O que configurar |
|----------------|------------------|
| **Google Console** | Redirect URI = callback do **Supabase** (não do seu app). |
| **Supabase**       | Site URL e Redirect URLs = seu app (localhost + Vercel). |
| **Vercel**         | Env vars = `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |

Depois disso, **Entrar com Google** no `/login` e em **Entrar como cliente** (`/entrar`) deve redirecionar para o Google, voltar ao Supabase e então para o seu app (callback → dashboard ou setup).

---

## 6. Stripe (assinaturas)

No app, tudo que é **público** para o usuário chama só **Plano**. No código e no banco as variantes de assinatura paga são **`plano_1`**, **`plano_2`**, **`plano_3`** (mapeadas para três `price_...` no Stripe).

### 6.1 Projeto Stripe

1. [Dashboard Stripe](https://dashboard.stripe.com) → **Products** → três preços recorrentes mensais (BRL). Nomes na fatura como quiser (ex.: “Agenndo”).
2. Copie o **Price ID** de cada um (`price_...`).

### 6.2 Variáveis de ambiente

No `.env.local` (e na Vercel):

| Variável | Onde obter |
|----------|------------|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (**Secret**) |
| `STRIPE_WEBHOOK_SECRET` | Após criar o endpoint de webhook (signing secret) |
| `STRIPE_PRICE_PLANO_1` | Price ID para variante interna `plano_1` |
| `STRIPE_PRICE_PLANO_2` | Price ID para `plano_2` |
| `STRIPE_PRICE_PLANO_3` | Price ID para `plano_3` |
| `STRIPE_PRICE_PLANO_UNICO_INFRAESTRUTURA_*`, `PERFIL_*`, `STARTER`/`GROWTH`/`ENTERPRISE` | Legado: usados se `PLANO_1/2/3` estiverem vazios |

Após deploy com `plano_*` no código, rode no Supabase o SQL em `supabase/migrations/20250329_plano_n.sql` se ainda existir `starter`/`growth`/`enterprise` nas tabelas.
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (**service_role**) — só servidor, nunca no client |

Opcional em dev se o redirect cair no domínio errado:

- `NEXT_PUBLIC_SITE_URL` = `http://localhost:3000` (ou sua URL exata)

### 6.3 Webhook (tela “Selecionar eventos” / “Configure o destino”)

1. **Tipo de destino:** use **Sua conta** (não use “Contas conectadas” a menos que você integre Stripe Connect).
2. **URL do endpoint:** `https://seu-dominio.com/api/stripe/webhook` (produção) — caminho exato do app Next.js.
3. **Versão da API:** pode manter a versão sugerida pelo Stripe no painel; o SDK valida a assinatura do evento normalmente.
4. **Eventos — não marque “Todos os eventos”.** Selecione **somente** estes três (é o que o código processa hoje):

   | Evento | Para quê |
   |--------|-----------|
   | `checkout.session.completed` | Após o Checkout, grava customer/subscription e plano no `businesses`. |
   | `customer.subscription.updated` | Renovações, mudança de status (ex.: `active`, `past_due`, `trialing`). |
   | `customer.subscription.deleted` | Cancelamento → limpa assinatura e volta plano para `free`. |

5. Copie o **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`.

**Local:** `stripe listen --forward-to localhost:3000/api/stripe/webhook` e use o `whsec_...` que o CLI imprime no `.env.local`.

### 6.3.1 Pagamento só com cartão (por enquanto)

No Stripe: **Settings → Payment methods** — deixe habilitado o que você aceita (ex.: **Cartões**). Boleto/PIX direto no Stripe podem ser adicionados depois; o app já usa Checkout + Customer Portal. PIX via AbacatePay seria um fluxo paralelo no futuro (fora deste webhook).

### 6.3.2 Faturas e portal

Em **Settings → Customer portal** ative a edição de métodos de pagamento e visualização de faturas, para o botão “Fatura e método de pagamento” (`/api/stripe/portal`) funcionar como esperado.

### 6.4 Banco Supabase

Execute no SQL Editor:

- `supabase/migrations/20250328_stripe_billing.sql` (colunas Stripe em `businesses`)
- `supabase/migrations/20250328_profiles_pricing_lock.sql` (perfil de precificação no onboarding em `profiles`)

Ou os blocos equivalentes no final de `schema.sql`.

### 6.5 Fluxo no app

- **Setup**: ao escolher plano pago, após criar o negócio o usuário é enviado ao **Stripe Checkout** (trial 7 dias, `payment_method_collection: if_required`).
- **Conta → Meu plano**: botões para assinar cada tier; **Fatura e método de pagamento** abre o **Customer Portal**.
- O **webhook** atualiza `stripe_*` e `subscription_*` na tabela `businesses`.
