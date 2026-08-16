-- ============================================================================
-- Table "stories" (Statuts) — à exécuter dans Supabase : Project > SQL Editor
-- ============================================================================
-- Un statut n'est visible que par son auteur ou par un match mutuel (like
-- réciproque, sans blocage dans un sens ou l'autre) — voir la policy SELECT.

create table stories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  text text,
  media_url text,
  media_kind text check (media_kind in ('photo', 'video')),
  created_at timestamptz default now()
);

alter table stories enable row level security;

-- Lecture : soi-même, ou un profil avec qui il y a un match mutuel (deux
-- lignes "likes" dans les deux sens) et aucun blocage entre les deux.
create policy "Lecture des statuts par soi-même ou match mutuel"
on stories for select
using (
  profile_id = (select id from profiles where user_id = auth.uid())
  or (
    exists (
      select 1 from likes l1
      where l1.from_id = (select id from profiles where user_id = auth.uid())
        and l1.to_id = stories.profile_id
    )
    and exists (
      select 1 from likes l2
      where l2.from_id = stories.profile_id
        and l2.to_id = (select id from profiles where user_id = auth.uid())
    )
    and not exists (
      select 1 from blocks b
      where (b.from_id = (select id from profiles where user_id = auth.uid()) and b.to_id = stories.profile_id)
         or (b.from_id = stories.profile_id and b.to_id = (select id from profiles where user_id = auth.uid()))
    )
  )
);

-- Création : uniquement son propre statut.
create policy "Création de son propre statut"
on stories for insert
with check (profile_id = (select id from profiles where user_id = auth.uid()));

-- Suppression : uniquement son propre statut.
create policy "Suppression de son propre statut"
on stories for delete
using (profile_id = (select id from profiles where user_id = auth.uid()));
