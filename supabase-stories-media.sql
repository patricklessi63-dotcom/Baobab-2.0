-- ============================================================================
-- Ajout photo/vidéo aux statuts — à exécuter après supabase-stories.sql,
-- dans Supabase : Project > SQL Editor > New query
-- ============================================================================

alter table stories add column media_url text;
alter table stories add column media_kind text check (media_kind in ('photo', 'video'));

-- Un statut pouvait uniquement être du texte jusqu'ici (colonne "text" en
-- NOT NULL) ; on autorise maintenant un statut composé uniquement d'un
-- média, sans légende.
alter table stories alter column text drop not null;

-- Les statuts avec média utilisent le bucket de stockage "avatars" (déjà
-- utilisé pour les photos de profil), sous un chemin <profile_id>/story-....
-- Aucune nouvelle policy de storage n'est nécessaire si ce bucket est déjà
-- public en lecture et accepte l'upload pour les utilisateurs authentifiés.
