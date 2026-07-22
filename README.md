# Agenndo

Agenndo é uma plataforma SaaS de agendamento online para prestadores de serviço (salões, clínicas, estética, barbearias e perfis semelhantes). Cada negócio recebe uma vitrine pública em `/{slug}` onde o cliente escolhe serviço, profissional, data e horário, confirma dados e pode pagar online ou seguir sem pagamento, conforme a política do estabelecimento. O dono e a equipe gerenciam agenda, disponibilidade, serviços, clientes e finanças no painel em `/dashboard`. A assinatura do próprio Agenndo é cobrada via Stripe; os pagamentos dos clientes finais ao prestador passam pela conta Mercado Pago do negócio (OAuth) ou por Pix manual exibido na confirmação, sem verificação automática.

Stack principal: Next.js 14 (App Router), React, Tailwind, Supabase (Auth, Postgres com RLS, Storage). Autenticação Google via Supabase. Rotas sensíveis no servidor usam `createClient` com sessão do usuário; agendamento público e webhooks usam service role em `lib/supabase/admin.ts`, nunca no browser.

## Tipos de usuário e entradas

Dono do negócio: cria conta em `/login` ou `/setup`, vincula `businesses.profile_id` e usa o dashboard completo. Colaborador: entra por `/colaborador` ou login com contexto staff; vê agenda e comissões (`/dashboard/minhas-comissoes`) conforme permissões em `lib/auth/staff-dashboard-access.ts`. Cliente final: pode agendar sem conta; se criar conta, usa `/entrar` e `/conta` para ver histórico. Operador interno da plataforma (YWP): `/operacoes` com `platform_operators` e impersonação de contas para suporte. Detalhes de papéis e tabelas `user_accounts` / memberships estão em `docs/ACCOUNTS.md` e `docs/SECURITY.md`.

## Rotas da aplicação (app/)

Landing e SEO: `app/page.tsx`, páginas de segmento (`app/agenda-online-para-*`, `app/sistema-de-agendamento-online`, etc.), `app/blog`, `app/sobre`, `app/termos`, `app/politicas`.

Vitrine pública: `app/[slug]/page.tsx` renderiza `components/public/public-slug-page.tsx` (catálogo, galeria, agendamento embutido). Fluxo de reserva em etapas: `app/[slug]/agendar` e `app/[slug]/agendar/[step]`. Componentes de booking: `components/public/booking-*`, `mercadopago-payment-brick.tsx`, `booking-success-screen.tsx`.

Painel prestador: `app/dashboard/*` ... `whatsapp` (templates e fila de mensagens automaticas); `conta`.

Cliente logado: `app/conta`. Onboarding negócio: `app/setup`. Auth: `app/login`, `app/entrar`, `app/auth/oauth-start`, `app/auth/oauth-bridge`. Console: `app/operacoes`.

## APIs (app/api/)

Público (sem login do cliente, service role no servidor): `public/page-data`, `public/slots`, `public/book` (cria appointment e cliente), `public/booking-meta`, `public/appointment-status` (polling pós pagamento), `public/cancel`. Mercado Pago: `mercadopago/oauth/*`, `mercadopago/checkout/create` e `process`, `mercadopago/webhook` (confirma pagamento e status do agendamento via `lib/mercadopago/apply-payment-approved.ts`). Stripe (assinatura Agenndo): `stripe/checkout`, `stripe/portal`, `stripe/webhook`, `stripe/pricing-config`. Dashboard: `dashboard/availability`, `dashboard/personalization/gallery`, `dashboard/collaborator-link`. Conta: `me/onboarding-redirect`, `account/delete`, `business/billing-fiscal`. Operações: `operacoes/*`, `impersonation/*`.

## Lógica de negócio importante (lib/)

`lib/public-booking.ts`, `public-booking-query.ts`, `public-booking-step-routes.ts`, `public-catalog-server.ts`: catálogo e slots da vitrine. `lib/disponibilidade.ts` e API de availability: regras de horário. `lib/business-payment-policy.ts` e `public-payment-display.ts`: políticas off, optional, required_deposit, required_full e valor devido (`due_cents`). `lib/public-booking-price.ts`: preço do serviço só no servidor, anti manipulação. `lib/appointment-payment-display.ts`: badges no dashboard. `lib/mercadopago/*`: OAuth, API, tokens criptografados (`lib/security/crypto.ts`). `lib/stripe/*`: planos em `lib/plans.ts`, escada paid_01 a paid_20. `lib/commission-resolve.ts`, `appointment-finance.ts`: comissões e financeiro. `lib/account-types.ts`, `auth/sync-account-on-login.ts`: tipos de conta após login. `lib/supabase/server.ts`, `client.ts`, `effective-user.ts`: sessão e impersonação.

Agendamento com pagamento obrigatório (sinal ou integral): status inicial `agendado`, `payment_status` pendente; após webhook MP aprovado passa a `confirmado`. Política opcional ou sem cobrança online: `confirmado` na criação. Confirmação de pagamento MP não deve ocorrer só na resposta síncrona do checkout; webhook é a fonte de verdade.

## Banco e deploy

Migrations em `supabase/migrations/`. Scripts npm: `db:push`, `db:migration:new`, `dev`, `build`. Documentação extra: `docs/MERCADOPAGO_AGENNDO.md`, `docs/ACCOUNTS.md`, `docs/SECURITY.md`. Variáveis em `.env.local` (Supabase URL e keys, Stripe, Mercado Pago, `APP_ENCRYPTION_KEY`, `NEXT_PUBLIC_SITE_URL`).

## Componentes e convenções

UI pública concentrada em `components/public/`. UI do painel em `components/dashboard/`. Landing em `components/home-page.tsx` e `components/seo/`. Tema claro/escuro via `lib/theme-context`. Ícones Material Symbols. Imagens de negócio no bucket Supabase `business-assets` (`lib/business-assets-storage.ts`).

Para estender o produto: alterações na vitrine costumam tocar `public-slug-page.tsx`, rotas `app/api/public/*` e libs `public-*`. Alterações de cobrança ao cliente: `pagamentos/page.tsx`, `business-payment-policy.ts`, rotas `mercadopago/*` e migration de appointments/payments. Alterações de assinatura do prestador ao Agenndo: Stripe e `lib/billing-access.ts`. Sempre respeitar RLS; novas tabelas precisam políticas explícitas (ver `docs/SECURITY.md`).
