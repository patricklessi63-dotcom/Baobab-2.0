-- ============================================================================
-- Baobab Protect — correctifs RLS critiques + colonnes de confiance/sécurité
-- À exécuter dans Supabase : Project > SQL Editor > New query
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PRIORITÉ 0 : messages, likes et passes étaient en lecture PUBLIQUE
-- (policy `using (true)`) — n'importe qui pouvait lire tous les messages
-- privés et tout l'historique like/pass de tout le monde via l'API Supabase,
-- authentifié ou non. Corrigé ci-dessous.
-- ----------------------------------------------------------------------------

-- messages : un utilisateur ne lit que les conversations dont son profil
-- fait partie (son id apparaît dans match_key, ex "idA__idB").
drop policy if exists "Lecture publique des messages" on messages;
create policy "Un utilisateur lit ses propres conversations"
on messages for select
using (
  (select id from profiles where user_id = auth.uid())::text
    = any (string_to_array(messages.match_key, '__'))
);

-- messages : en plus d'être l'expéditeur (déjà vérifié), l'expéditeur doit
-- aussi faire partie de la conversation visée — empêche d'injecter un faux
-- message dans le match_key de deux AUTRES personnes.
drop policy if exists "Un utilisateur envoie ses propres messages" on messages;
create policy "Un utilisateur envoie dans ses propres conversations"
on messages for insert
with check (
  auth.uid() = (select user_id from profiles where id = messages.from_id)
  and (select id from profiles where user_id = auth.uid())::text
    = any (string_to_array(messages.match_key, '__'))
);

-- likes : le client a besoin de voir ses propres likes ET les likes reçus
-- (pour détecter un match mutuel), mais pas les likes entre deux autres
-- personnes.
drop policy if exists "Lecture publique des likes" on likes;
create policy "Un utilisateur lit ses likes envoyés et reçus"
on likes for select
using (
  auth.uid() = (select user_id from profiles where id = likes.from_id)
  or auth.uid() = (select user_id from profiles where id = likes.to_id)
);

-- passes : le client n'a jamais besoin de savoir qui d'autre a passé qui —
-- seulement ses propres passes (pour filtrer les profils déjà vus).
drop policy if exists "Lecture publique des passes" on passes;
create policy "Un utilisateur lit ses propres passes"
on passes for select
using (
  auth.uid() = (select user_id from profiles where id = passes.from_id)
);

-- ----------------------------------------------------------------------------
-- Badges de vérification + préférence de confidentialité "statut en ligne"
-- ----------------------------------------------------------------------------

alter table profiles add column if not exists email_verified boolean not null default false;
alter table profiles add column if not exists phone_verified boolean not null default false;
alter table profiles add column if not exists show_online_status boolean not null default true;

-- Synchronise email_verified/phone_verified depuis auth.users à chaque
-- confirmation. SECURITY DEFINER nécessaire pour lire auth.users depuis un
-- trigger déclenché par les changements d'état d'authentification.
create or replace function sync_profile_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set
    email_verified = (new.email_confirmed_at is not null),
    phone_verified = (new.phone_confirmed_at is not null)
  where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_verification_change on auth.users;
create trigger on_auth_user_verification_change
after update of email_confirmed_at, phone_confirmed_at on auth.users
for each row
execute function sync_profile_verification();

-- Backfill : synchronise les comptes déjà confirmés avant la création du trigger.
update profiles p
set
  email_verified = (u.email_confirmed_at is not null),
  phone_verified = (u.phone_confirmed_at is not null)
from auth.users u
where u.id = p.user_id;

-- ----------------------------------------------------------------------------
-- Vérification — à exécuter après pour confirmer les nouvelles policies
-- ----------------------------------------------------------------------------
-- select tablename, policyname, cmd, qual, with_check
-- from pg_policies where schemaname='public'
-- and tablename in ('messages','likes','passes')
-- order by tablename, cmd;
