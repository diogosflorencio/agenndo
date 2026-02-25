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
   - **Redirect URLs**: adicione:
     - `http://localhost:3000/auth/callback`
     - `https://seu-dominio.vercel.app/auth/callback`
     - (e qualquer outro domínio que usar)

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
