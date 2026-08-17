-- ============================================================================
-- Phase 5 — Messagerie Baobab — à exécuter dans Supabase : SQL Editor (une fois).
-- ============================================================================
-- Additif + durcissement de sécurité. N'affecte aucune donnée existante.
--
-- IMPORTANT (à faire une fois, hors SQL) : pour que le canal temps réel
-- global fonctionne, la table "messages" doit être ajoutée à la publication
-- Realtime dans le tableau de bord Supabase : Database → Replication →
-- activer "messages" (si ce n'est pas déjà fait).

-- ---------- 1. État de lecture des messages ----------
alter table messages add column if not exists read_at timestamptz;

-- Aucune policy UPDATE n'existait sur "messages" jusqu'ici. Celle-ci
-- n'autorise à marquer "lu" QUE les messages reçus (jamais les siens),
-- et seulement dans une conversation où l'utilisateur est réellement
-- participant (même vérification que la policy SELECT existante).
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'messages' and cmd = 'UPDATE' loop
    execute format('drop policy %I on public.messages', pol.policyname);
  end loop;

  create policy "Un utilisateur marque comme lus les messages recus de sa conversation"
  on messages for update
  using (
    (select id from profiles where user_id = auth.uid())::text
      = any (string_to_array(messages.match_key, '__'))
    and messages.from_id <> (select id from profiles where user_id = auth.uid())
  )
  with check (
    (select id from profiles where user_id = auth.uid())::text
      = any (string_to_array(messages.match_key, '__'))
    and messages.from_id <> (select id from profiles where user_id = auth.uid())
  );
end $$;

-- Défense en profondeur : la policy ci-dessus contrôle QUI/QUAND, ce
-- trigger contrôle QUOI — même un expéditeur ne peut jamais modifier le
-- texte, l'expéditeur, la conversation ou la date d'un message existant.
create or replace function messages_restrict_update_to_read_at()
returns trigger language plpgsql as $$
begin
  if new.text is distinct from old.text
     or new.from_id is distinct from old.from_id
     or new.match_key is distinct from old.match_key
     or new.created_at is distinct from old.created_at then
    raise exception 'Seul read_at peut etre modifie sur un message existant.';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_restrict_update on messages;
create trigger messages_restrict_update
before update on messages
for each row execute function messages_restrict_update_to_read_at();

-- ---------- 2. Table "reports" — reconciliation + categorie ----------
-- Cette table existe déjà en production (confirmé) mais n'avait jamais eu
-- de fichier SQL suivi dans ce dépôt — même dérive que "blocks" en Phase 4.
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references profiles(id) on delete cascade,
  to_id uuid not null references profiles(id) on delete cascade,
  reason text,
  created_at timestamptz default now()
);
alter table reports enable row level security;
alter table reports add column if not exists category text;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='reports' loop
    execute format('drop policy %I on public.reports', pol.policyname);
  end loop;

  create policy "Un utilisateur signale en son propre nom"
  on reports for insert
  with check (
    auth.uid() = (select user_id from profiles where id = reports.from_id)
    and reports.from_id <> reports.to_id
  );
  -- Volontairement aucune policy SELECT/UPDATE/DELETE : seul un
  -- administrateur via le tableau de bord (rôle service) doit pouvoir lire
  -- les signalements.
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'reports_no_self_check') then
    alter table reports add constraint reports_no_self_check check (from_id <> to_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reports_category_check') then
    alter table reports add constraint reports_category_check check (
      category is null or category in ('harcelement','spam','faux_profil','contenu_inapproprie','arnaque','autre')
    );
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Vérification (facultatif, à exécuter séparément après) :
-- select column_name from information_schema.columns where table_name='messages' and column_name='read_at';
-- select policyname, cmd from pg_policies where tablename in ('messages','reports') order by tablename, cmd;
-- select conname from pg_constraint where conname in ('reports_no_self_check','reports_category_check');
