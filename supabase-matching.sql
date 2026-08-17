-- ============================================================================
-- Phase 4 — Baobab Match — à exécuter dans Supabase : SQL Editor (une fois).
-- ============================================================================
-- Additif + durcissement de sécurité. N'affecte aucune donnée existante.

-- ---------- 1. Préférences de recherche (profiles) ----------
alter table profiles add column if not exists pref_age_min int not null default 18;
alter table profiles add column if not exists pref_age_max int not null default 99;
alter table profiles add column if not exists pref_distance text not null default '';
-- '' = non défini (aucun filtre) ; sinon 'Ma ville uniquement' / 'Ma ville ou mon pays' / 'Peu importe'.

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_pref_age_range_check') then
    alter table profiles add constraint profiles_pref_age_range_check check (pref_age_min <= pref_age_max);
  end if;
end $$;

-- ---------- 2. Table "blocks" — premier DDL/RLS tracé ----------
-- Cette table existe déjà en production (l'app la lit/écrit depuis
-- longtemps) mais n'avait jamais eu de fichier SQL dans ce dépôt. On la
-- (re)déclare ici de façon sûre pour pouvoir lui ajouter sa contrainte
-- anti-auto-blocage.
create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references profiles(id) on delete cascade,
  to_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (from_id, to_id)
);
alter table blocks enable row level security;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'blocks' loop
    execute format('drop policy %I on public.blocks', pol.policyname);
  end loop;

  create policy "Un utilisateur lit ses propres blocages"
  on blocks for select
  using (auth.uid() = (select user_id from profiles where id = blocks.from_id));

  create policy "Un utilisateur bloque en son propre nom"
  on blocks for insert
  with check (
    auth.uid() = (select user_id from profiles where id = blocks.from_id)
    and blocks.from_id <> blocks.to_id
  );

  create policy "Un utilisateur retire ses propres blocages"
  on blocks for delete
  using (auth.uid() = (select user_id from profiles where id = blocks.from_id));
end $$;

-- ---------- 3. Durcissement RLS INSERT sur likes / passes ----------
-- Ces policies INSERT venaient encore de supabase-schema.sql (`with check
-- (true)`) : n'importe quel client authentifié pouvait insérer un like/pass
-- avec un from_id arbitraire, usurpant n'importe quel utilisateur.
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'likes' and cmd = 'INSERT' loop
    execute format('drop policy %I on public.likes', pol.policyname);
  end loop;

  create policy "Un utilisateur like en son propre nom"
  on likes for insert
  with check (
    auth.uid() = (select user_id from profiles where id = likes.from_id)
    and likes.from_id <> likes.to_id
  );
end $$;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'passes' and cmd = 'INSERT' loop
    execute format('drop policy %I on public.passes', pol.policyname);
  end loop;

  create policy "Un utilisateur passe en son propre nom"
  on passes for insert
  with check (
    auth.uid() = (select user_id from profiles where id = passes.from_id)
    and passes.from_id <> passes.to_id
  );
end $$;

-- ---------- 4. Contraintes anti-auto-référence (défense en profondeur) ----------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'likes_no_self_check') then
    alter table likes add constraint likes_no_self_check check (from_id <> to_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'passes_no_self_check') then
    alter table passes add constraint passes_no_self_check check (from_id <> to_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'favorites_no_self_check') then
    alter table favorites add constraint favorites_no_self_check check (from_id <> to_id);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Vérification (facultatif, à exécuter séparément après) :
-- select column_name from information_schema.columns where table_name='profiles'
--   and column_name in ('pref_age_min','pref_age_max','pref_distance');
-- select tablename, policyname, cmd from pg_policies where tablename in ('blocks','likes','passes','favorites') order by tablename, cmd;
-- select conname from pg_constraint where conname like '%_no_self_check' or conname = 'profiles_pref_age_range_check';
