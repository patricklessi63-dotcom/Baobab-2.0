-- ============================================================================
-- Table "events" (Événements) — à exécuter dans Supabase : SQL Editor
-- ============================================================================
-- Deux tables : events (l'événement) et event_attendees (qui participe,
-- pour un compteur réel et un bouton "Participer" qui fonctionne vraiment).
--
-- IMPORTANT (confidentialité) : la colonne "location" doit contenir une
-- ville ou un quartier approximatif ("Montréal", "Plateau-Mont-Royal"),
-- jamais une adresse exacte ni des coordonnées GPS.

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text not null,
  event_date timestamptz not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (event_id, profile_id)
);

alter table events enable row level security;
alter table event_attendees enable row level security;

-- Événements visibles par tous les utilisateurs connectés (comme les profils).
create policy "Lecture publique des evenements"
on events for select using (true);

-- Un utilisateur peut créer un événement en son propre nom (prêt pour une
-- future interface de création communautaire — pas encore construite).
create policy "Un utilisateur cree un evenement en son propre nom"
on events for insert
with check (created_by = (select id from profiles where user_id = auth.uid()));

-- Le nombre de participants doit être visible par tous.
create policy "Lecture publique des participations"
on event_attendees for select using (true);

-- Un utilisateur ne peut s'inscrire (et se désinscrire) qu'en son propre nom.
create policy "Un utilisateur s'inscrit en son propre nom"
on event_attendees for insert
with check (profile_id = (select id from profiles where user_id = auth.uid()));

create policy "Un utilisateur se desinscrit lui-meme"
on event_attendees for delete
using (profile_id = (select id from profiles where user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- Optionnel : un premier événement de test pour vérifier l'affichage.
-- Remplacez la date par une date future avant d'exécuter, sinon il
-- n'apparaîtra pas (l'app n'affiche que les événements à venir).
-- ----------------------------------------------------------------------------
-- insert into events (title, description, location, event_date)
-- values ('Coffee & Baobab', 'Rencontre informelle autour d''un café.', 'Montréal', '2026-09-06 19:00:00-04');
