-- One-shot: remove o usuario josy_teixeira@yahoo.com.br se estiver cadastrado.
-- Como clients.user_id e demais FKs apontam para auth.users com ON DELETE CASCADE,
-- apagar do auth.users limpa tudo (profiles, clients, user_roles, etc.) em cascata.
--
-- Idempotente: se o usuario nao existir mais, o DELETE simplesmente nao remove nada.

DO $$
DECLARE
  target_uid uuid;
BEGIN
  SELECT id INTO target_uid
  FROM auth.users
  WHERE lower(email) = 'josy_teixeira@yahoo.com.br'
  LIMIT 1;

  IF target_uid IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = target_uid;
    RAISE NOTICE 'Usuario josy_teixeira@yahoo.com.br removido (uid=%)', target_uid;
  ELSE
    RAISE NOTICE 'Usuario josy_teixeira@yahoo.com.br nao encontrado, nada a fazer';
  END IF;
END$$;
