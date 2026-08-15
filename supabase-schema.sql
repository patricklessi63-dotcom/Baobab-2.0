-- ============================================================================
-- Schéma Baobab — à exécuter dans Supabase : Project > SQL Editor > New query
-- ============================================================================

create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int not null,
  country text,
  languages text,
  city text,
  arrived_since text,
  looking_for text,
  bio text,
  created_at timestamptz default now()
);

create table likes (
  id bigint generated always as identity primary key,
  from_id uuid references profiles(id) on delete cascade,
  to_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (from_id, to_id)
);

create table passes (
  id bigint generated always as identity primary key,
  from_id uuid references profiles(id) on delete cascade,
  to_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (from_id, to_id)
);

create table messages (
  id bigint generated always as identity primary key,
  match_key text not null,
  from_id uuid references profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

-- ============================================================================
-- Sécurité (RLS)
-- ⚠️ Ces règles sont VOLONTAIREMENT permissives pour un prototype de test sans
-- authentification (n'importe qui avec le lien peut lire/écrire). Avant un
-- vrai lancement public, il faudra ajouter une authentification Supabase
-- (email, téléphone...) et restreindre ces règles en conséquence.
-- ============================================================================

alter table profiles enable row level security;
alter table likes enable row level security;
alter table passes enable row level security;
alter table messages enable row level security;

create policy "Lecture publique des profils" on profiles for select using (true);
create policy "Création publique de profils" on profiles for insert with check (true);

create policy "Lecture publique des likes" on likes for select using (true);
create policy "Création publique de likes" on likes for insert with check (true);

create policy "Lecture publique des passes" on passes for select using (true);
create policy "Création publique de passes" on passes for insert with check (true);

create policy "Lecture publique des messages" on messages for select using (true);
create policy "Création publique de messages" on messages for insert with check (true);
