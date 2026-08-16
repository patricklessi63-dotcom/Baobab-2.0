// ============================================================================
// Baobab Protect — détection heuristique de demandes d'argent dans le chat.
//
// Comme Baobab Match, ceci N'EST PAS une garantie : c'est une liste de
// mots-clés/motifs qui déclenche un avertissement pédagogique. Un message
// peut être signalé à tort (faux positif) ou passer inaperçu (faux négatif).
// Isolé dans un module pur pour rester facile à étendre ou à remplacer plus
// tard par une vraie modération (ex. appel à un service de détection).
// ============================================================================

const KEYWORDS = [
  "envoie-moi de l'argent",
  "envoie moi de l'argent",
  "j'ai besoin d'argent",
  "besoin d'argent urgent",
  "urgence financière",
  "prête-moi",
  "prete moi",
  "prêt d'argent",
  "virement",
  "western union",
  "moneygram",
  "mandat cash",
  "carte cadeau",
  "carte-cadeau",
  "gift card",
  "bitcoin",
  "crypto",
  "numéro de carte",
  "numero de carte",
  "code cvv",
  "mot de passe bancaire",
  "coordonnées bancaires",
  "coordonnees bancaires",
];

// Motif générique d'IBAN (2 lettres + 2 chiffres + 10 à 30 caractères
// alphanumériques), suffisant pour repérer une tentative de partage de RIB.
const IBAN_PATTERN = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/i;

export function detectMoneyRequest(text) {
  const value = (text || "").trim();
  if (!value) return { flagged: false, matchedTerms: [] };

  const lower = value.toLowerCase();
  const matchedTerms = KEYWORDS.filter((kw) => lower.includes(kw));
  if (IBAN_PATTERN.test(value)) matchedTerms.push("format IBAN détecté");

  return { flagged: matchedTerms.length > 0, matchedTerms };
}
