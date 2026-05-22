# Tipos de conta e login

## Modelo no Postgres

| Tipo | Onde fica | Login típico |
|------|-----------|----------------|
| **Dono** | `businesses.profile_id` + membership `business_owner` | `/login` → setup/dashboard |
| **Funcionário** | `collaborators.auth_user_id` + membership `business_staff` | `/colaborador` → `/login?context=staff` |
| **Cliente** | `clients.auth_user_id` + membership `client` | `/entrar` (context cliente) → `/conta` |
| **Admin plataforma** | `profiles.account_kind = platform_admin` | manual |

### Tabelas

- **`user_accounts`** — 1 linha por `auth.users`: `primary_kind`, `signup_channel`, `last_login_channel`
- **`user_account_memberships`** — vínculos por negócio (pode haver vários papéis em negócios diferentes)
- **`profiles.account_kind`** — espelho para queries legadas; `role` mantido por compatibilidade

### Funções SQL (authenticated)

- `auth_user_primary_kind()`
- `auth_user_is_business_owner(business_id?)`
- `auth_user_is_business_staff(business_id?)`
- `auth_user_is_client(business_id?)`
- `recompute_user_primary_kind(user_id)` — recalcula após vínculos

## App (TypeScript)

- `lib/account-types.ts` — tipos e labels
- `lib/auth/sync-account-on-login.ts` — chamado após OAuth em callback/bridge

## Console interno (operadores YWP)

- Tabela **`platform_operators`** (não usar nome `admin_*` na API pública)
- Função **`is_platform_operator()`** — fonte de verdade para RLS global
- UI: **`/operacoes`** — login Supabase (anon + JWT do operador)
- Incluir operador: `supabase/scripts/grant-platform-operator.sql` (SQL Editor apenas)

Políticas `*_console` em todas as tabelas de negócio: `USING (is_platform_operator())`.

## Migration

- `supabase/migrations/20260522120000_user_account_kinds.sql`
- `supabase/migrations/20260523120000_platform_operators_rls.sql`
