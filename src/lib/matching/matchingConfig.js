// ============================================================================
// Baobab Match — configuration centralisée. Seul endroit du code où les
// pondérations doivent être modifiées.
// ============================================================================

// Les 6 catégories, somme = 100.
export const MATCH_WEIGHTS = {
  intentions: 30,
  interests: 20,
  lifeProject: 15,
  preferences: 15,
  languages: 10,
  location: 10,
};

// Score jamais affiché à 0% (décourageant) ni 100% (fausse certitude).
export const SCORE_FLOOR = 8;
export const SCORE_CEIL = 96;

export const DISCLAIMER =
  "Compatibilité estimée à partir des informations de ton profil — pas une garantie ni une prédiction.";

// Options que Baobab considère comme une intention "romantique" — utilisées
// pour décider si la sous-question "Intentions" (relationship_values) compte
// dans le score.
export const ROMANTIC_INTENTION_MARKERS = ["Amour", "Relation sérieuse"];

// Explicitement JAMAIS utilisées pour classer ou noter un profil.
export const NEVER_USED_FOR_SCORING = [
  "origine ethnique", "race", "religion", "orientation sexuelle", "handicap", "santé", "opinions politiques",
];
