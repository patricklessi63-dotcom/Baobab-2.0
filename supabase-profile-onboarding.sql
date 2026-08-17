-- ============================================================================
-- Phase 3 — Profil Baobab + Onboarding intelligent — à exécuter dans Supabase :
-- SQL Editor (une seule fois).
-- ============================================================================
-- Additif uniquement : n'affecte aucune colonne existante. Certaines colonnes
-- déjà utilisées par l'app (user_id, avatar_url, education_level,
-- has_children, occupation, interests) et la table profile_photos existent
-- déjà en base mais n'avaient jamais été ajoutées ici (dérive de schéma
-- historique) — ce fichier ne les recrée pas, seulement les vraies nouveautés
-- de la Phase 3.

-- ---------- Identité ----------
alter table profiles add column if not exists birth_date date;
-- Jamais affichée publiquement. `age` (colonne existante) continue d'être
-- écrit à chaque sauvegarde, recalculé côté application à partir de
-- birth_date.

-- ---------- Localisation ----------
alter table profiles add column if not exists province text default '';

-- ---------- Parcours Canada ----------
alter table profiles add column if not exists immigration_status text default '';
alter table profiles add column if not exists arrival_city text default '';

-- ---------- Langues ----------
-- Structure [{ "language": "Français", "level": "Courant" }, ...].
-- La colonne texte "languages" existante reste une liste à plat dérivée de
-- languages_detail à chaque sauvegarde, pour ne rien casser dans
-- src/lib/compatibility.js.
alter table profiles add column if not exists languages_detail jsonb not null default '[]'::jsonb;

-- ---------- Intentions ----------
-- Posé seulement si looking_for contient Amour / Relation sérieuse.
alter table profiles add column if not exists relationship_values text default '';

-- ---------- Projet de vie (tout facultatif) ----------
-- wants_children ("en veux-tu ?") est DISTINCT du has_children existant
-- ("en as-tu déjà ?") — ne pas confondre les deux dans l'interface.
alter table profiles add column if not exists wants_children text default '';
alter table profiles add column if not exists family_importance text default '';
alter table profiles add column if not exists career_goal text default '';
alter table profiles add column if not exists geographic_openness text default '';

-- ---------- Personnalité (léger, jamais un test psychologique) ----------
alter table profiles add column if not exists personality_evening text default '';
alter table profiles add column if not exists personality_travel text default '';
alter table profiles add column if not exists relationship_needs text default '';

-- ---------- Confidentialité par champ ----------
-- IMPORTANT : ce sont des filtres d'AFFICHAGE côté application uniquement.
-- profiles reste en lecture publique (select using (true)) car nécessaire à
-- la découverte — ces booléens ne cachent rien au niveau de la base de
-- données ou de l'API, ils indiquent seulement à l'app ce qu'elle doit
-- rendre visible dans la page de profil public.
alter table profiles add column if not exists show_city boolean not null default true;
alter table profiles add column if not exists show_country boolean not null default true;
alter table profiles add column if not exists show_occupation boolean not null default true;
alter table profiles add column if not exists show_studies boolean not null default true;
alter table profiles add column if not exists show_canada_journey boolean not null default true;
alter table profiles add column if not exists show_life_project boolean not null default true;
alter table profiles add column if not exists show_interests boolean not null default true;

-- ---------- Progression de l'onboarding ----------
alter table profiles add column if not exists onboarding_step integer not null default 0;
alter table profiles add column if not exists onboarding_completed_at timestamptz;

-- Backfill obligatoire : sans cette ligne, tous les utilisateurs déjà
-- inscrits seraient renvoyés dans le nouvel onboarding à leur prochaine
-- connexion (régression). On considère leur profil déjà "complété" à leur
-- date d'inscription initiale.
update profiles set onboarding_completed_at = created_at where onboarding_completed_at is null;

-- ============================================================================
-- Politique RLS UPDATE sur profiles — réécrite de façon idempotente.
-- Une policy UPDATE existe déjà en production (l'app met à jour son propre
-- profil avec succès) mais son nom exact n'est tracé dans aucun fichier SQL
-- de ce dépôt. Ce bloc supprime la ou les policy(ies) UPDATE existantes,
-- quel que soit leur nom, et les remplace par une seule policy canonique.
-- Sûr à ré-exécuter.
-- ============================================================================
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd = 'UPDATE'
  loop
    execute format('drop policy %I on public.profiles', pol.policyname);
  end loop;

  create policy "Un utilisateur modifie son propre profil"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
end $$;

-- ============================================================================
-- Table "favorites" — miroir exact de la table "likes" déjà existante.
-- ============================================================================
create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references profiles(id) on delete cascade,
  to_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (from_id, to_id)
);

alter table favorites enable row level security;

create policy "Un utilisateur lit ses favoris envoyes et recus"
on favorites for select
using (
  auth.uid() = (select user_id from profiles where id = favorites.from_id)
  or auth.uid() = (select user_id from profiles where id = favorites.to_id)
);

create policy "Un utilisateur ajoute ses propres favoris"
on favorites for insert
with check (auth.uid() = (select user_id from profiles where id = favorites.from_id));

create policy "Un utilisateur retire ses propres favoris"
on favorites for delete
using (auth.uid() = (select user_id from profiles where id = favorites.from_id));

-- ----------------------------------------------------------------------------
-- Vérification (facultatif, à exécuter séparément après pour confirmer) :
-- select column_name from information_schema.columns where table_name='profiles'
--   and column_name in ('birth_date','province','immigration_status','arrival_city',
--   'languages_detail','relationship_values','wants_children','family_importance',
--   'career_goal','geographic_openness','personality_evening','personality_travel',
--   'relationship_needs','show_city','show_country','show_occupation','show_studies',
--   'show_canada_journey','show_life_project','show_interests','onboarding_step',
--   'onboarding_completed_at');
-- select policyname, cmd from pg_policies where tablename='profiles';
-- select tablename from pg_tables where tablename='favorites';
