-- Conceder acesso ao console interno (/operacao-interna) para um utilizador Auth existente.
-- Executar no Supabase Dashboard → SQL Editor (NUNCA expor isto no app cliente).
--
-- 1) Obter o UUID em Authentication → Users (copiar User UID)
-- 2) Substituir abaixo e executar:

-- INSERT INTO public.platform_operators (user_id, note, created_by)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   'Nome da pessoa - YWP',
--   NULL
-- );

-- SELECT public.recompute_user_primary_kind('00000000-0000-0000-0000-000000000000'::uuid);

-- Revogar acesso:
-- DELETE FROM public.platform_operators WHERE user_id = '...'::uuid;
