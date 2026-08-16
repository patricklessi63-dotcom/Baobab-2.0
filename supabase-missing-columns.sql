-- ============================================================================
-- Colonnes manquantes sur profiles — à exécuter dans Supabase SQL Editor
-- ============================================================================
-- Ces colonnes sont utilisées par le code depuis le début (statut en ligne,
-- photo de couverture) mais n'ont jamais été créées dans la table réelle,
-- causant des erreurs PGRST204 ("column not found in schema cache") sur le
-- heartbeat de présence et la sauvegarde de profil.

alter table profiles add column if not exists is_online boolean not null default false;
alter table profiles add column if not exists last_seen timestamptz;
alter table profiles add column if not exists cover_url text;
