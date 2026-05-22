# Segurança — Agenndo

Documento de referência após endurecimento de RLS (Row Level Security). **Segurança em primeiro lugar**: não existe painel “ver todos os utilizadores” via JWT normal — isso é intencional.

## Autenticação

- Login via **Supabase Auth** (Google OAuth). O identificador nas políticas é `auth.uid()` (UUID Supabase), **não** Firebase.
- Dashboard e app cliente usam a **anon key** + sessão do utilizador; o Postgres aplica RLS em cada query.
- Rotas críticas no servidor (`/api/public/*`, webhooks Stripe, alguns jobs) usam **`SUPABASE_SERVICE_ROLE_KEY`** (`createAdminClient()`), que **ignora RLS**. Use só em código servidor, nunca no browser.

## Modelo de acesso (resumo)

| Quem | O quê |
|------|--------|
| Prestador (dono) | Dados do negócio onde `businesses.profile_id = effective_user_id()` |
| Impersonação suporte | `effective_user_id()` devolve `target_uid` de `session_impersonation` |
| Colaborador com conta | Leitura das próprias linhas em `collaborators` / comissões |
| Cliente com conta | `clients.auth_user_id = auth.uid()`; agendamentos ligados ao `client_id` |
| Público (sem login) | Catálogo e agendamento via **APIs** (`/api/public/page-data`, `slots`, `book`, …), não listagem direta anon nas tabelas |
| `anon` (PostgREST) | **Sem** SELECT nas tabelas de negócio (migration `20260521120000_rls_hardening`) |
| Storage `business-assets` | Leitura pública de ficheiros; escrita só dono do negócio (inalterado) |

## O que não alterar sem revisão de segurança

- Colunas de URL de imagem, paths de storage, slugs públicos
- Políticas do bucket **business-assets**
- Fluxo de agendamento público (deve continuar a funcionar após mudanças de RLS)

## Migrations e CLI

```bash
npm run db:push          # aplica migrations (rever SQL antes em produção)
npm run db:migration:new # nova migration
```

Ordem recomendada em produção: rever o ficheiro em `supabase/migrations/` → `db push` → testar app e curl abaixo.

## Testes manuais (pós-deploy)

Com a **anon key** (como um atacante sem login):

```bash
curl "https://SEU_PROJETO.supabase.co/rest/v1/businesses?select=*" \
  -H "apikey: ANON_KEY" -H "Authorization: Bearer ANON_KEY"
```

Esperado: erro de permissão ou lista vazia — **não** deve devolver linhas com `stripe_customer_id`, etc.

Com sessão de prestador no app: dashboard, serviços, agendamentos e imagens devem funcionar normalmente.

Página pública `https://seu-dominio/SLUG`: serviços, equipa e imagens devem carregar (via `/api/public/page-data`).

## Migrations aplicadas (produção)

- `20260521120000_rls_hardening` — remove políticas públicas amplas, REVOKE anon, RPC `is_business_slug_available`
- `20260521130000_enable_rls_all` — `ENABLE` + `FORCE` RLS em todas as tabelas (obrigatório: `FORCE` sozinho não ativa RLS)

Histórico antigo do projeto foi alinhado com `supabase migration repair` (schema já existia antes do CLI).

## Código marcado para revisão

Procure no repositório:

- `SECURITY:` em comentários
- `lib/public-catalog-server.ts` — catálogo público
- `lib/supabase/admin.ts` — service role

Qualquer nova rota que use `createAdminClient()` deve documentar **por que** precisa ignorar RLS e validar entrada (slug, ids, rate limit).

## Impersonação

- Tokens em `user_impersonate_tokens` — só o próprio utilizador (RLS).
- Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no cliente.
