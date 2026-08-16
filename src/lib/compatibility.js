// ============================================================================
// Baobab Match — moteur de compatibilité (v1, à base de règles).
//
// Ceci N'EST PAS un modèle scientifique : c'est une estimation transparente
// calculée uniquement à partir des champs de profil déjà stockés dans
// Supabase (interests, looking_for, city, country, languages,
// education_level). Aucune nouvelle table ni requête n'est nécessaire.
//
// Point de bascule pour une future IA : `computeCompatibility` est la seule
// fonction que les écrans appellent. Le jour où on branche un vrai modèle
// (ex. via une Supabase Edge Function ou une API externe), il suffit de
// remplacer le corps de cette fonction — la signature ({ score, reasons,
// commonInterests, commonIntention, proximity, disclaimer, source }) et les
// composants qui l'affichent n'ont pas à changer. Le champ `source` indique
// déjà quelle stratégie a produit le résultat ("rules-v1" aujourd'hui,
// "ai-v1" demain), pour permettre un affichage différencié si besoin.
// ============================================================================

export const DISCLAIMER =
  "Estimation basée sur les informations de profil — pas un score scientifique ni une garantie de compatibilité.";

function parseTags(text) {
  return (text || "")
    .split(/[,;/]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function sharedTags(listA, listB) {
  const setB = new Set(listB);
  const seen = new Set();
  return listA.filter((t) => setB.has(t) && !seen.has(t) && seen.add(t));
}

function proximityOf(userA, userB) {
  const cityA = (userA.city || "").trim().toLowerCase();
  const cityB = (userB.city || "").trim().toLowerCase();
  const countryA = (userA.country || "").trim().toLowerCase();
  const countryB = (userB.country || "").trim().toLowerCase();

  if (cityA && cityB && cityA === cityB) {
    return { level: "same_city", points: 25, label: `Même ville (${userB.city})` };
  }
  if (countryA && countryB && countryA === countryB) {
    return { level: "same_country", points: 12, label: `Même pays d'origine (${userB.country})` };
  }
  return { level: "unknown", points: 0, label: "Localisation approximative inconnue" };
}

export function computeCompatibility(currentUser, candidate) {
  if (!currentUser || !candidate) {
    return {
      score: 0,
      level: "unknown",
      reasons: [],
      commonInterests: [],
      commonIntention: null,
      proximity: null,
      disclaimer: DISCLAIMER,
      source: "rules-v1",
    };
  }

  const interestsA = parseTags(currentUser.interests);
  const interestsB = parseTags(candidate.interests);
  const commonInterests = sharedTags(interestsA, interestsB);
  const interestsPoints = Math.min(commonInterests.length * 12, 36);

  const intentionA = (currentUser.looking_for || "").trim().toLowerCase();
  const intentionB = (candidate.looking_for || "").trim().toLowerCase();
  const commonIntention = intentionA && intentionA === intentionB ? candidate.looking_for : null;
  const intentionPoints = commonIntention ? 25 : 0;

  const proximity = proximityOf(currentUser, candidate);

  const languageOverlap = sharedTags(parseTags(currentUser.languages), parseTags(candidate.languages));
  const educationMatch = Boolean(
    currentUser.education_level && candidate.education_level && currentUser.education_level === candidate.education_level
  );
  const bonusPoints = (languageOverlap.length > 0 ? 8 : 0) + (educationMatch ? 6 : 0);

  const rawScore = interestsPoints + intentionPoints + proximity.points + bonusPoints;
  // Bornée pour ne jamais afficher 0% (décourageant) ni 100% (faux sentiment
  // de certitude) — reste lisible comme une estimation, pas un verdict.
  const score = Math.max(8, Math.min(96, Math.round(rawScore)));

  const reasons = [];
  if (commonInterests.length > 0) {
    reasons.push(`${commonInterests.length} centre${commonInterests.length > 1 ? "s" : ""} d'intérêt en commun`);
  }
  if (commonIntention) reasons.push(`Vous recherchez tous les deux : ${commonIntention}`);
  if (proximity.level !== "unknown") reasons.push(proximity.label);
  if (languageOverlap.length > 0) {
    reasons.push(`Langue${languageOverlap.length > 1 ? "s" : ""} en commun : ${languageOverlap.join(", ")}`);
  }
  if (educationMatch) reasons.push(`Même niveau d'études (${candidate.education_level})`);
  if (reasons.length === 0) {
    reasons.push("Peu d'informations en commun pour l'instant — complétez vos profils pour affiner l'estimation.");
  }

  return {
    score,
    level: score >= 70 ? "high" : score >= 40 ? "medium" : "low",
    reasons,
    commonInterests,
    commonIntention,
    proximity,
    disclaimer: DISCLAIMER,
    source: "rules-v1",
  };
}
