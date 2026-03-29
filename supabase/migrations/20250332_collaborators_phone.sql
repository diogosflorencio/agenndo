-- Telefone opcional do colaborador (exibir na equipe / contato interno)
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS phone TEXT;
