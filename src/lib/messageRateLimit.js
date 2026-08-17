// Garde-fou d'UX contre l'envoi trop rapide de messages — PAS une barrière
// de sécurité (contournable via un appel API direct). Une vraie limite
// nécessiterait un trigger Postgres ou une Edge Function ; recommandé pour
// une phase future, pas construit ici.
export const MESSAGE_RATE_LIMIT = {
  maxMessages: 8,
  windowMs: 15000,
};

// Fenêtre glissante : reçoit la liste des timestamps d'envois récents,
// retourne { allowed, remainingTimestamps }.
export function checkRateLimit(recentTimestamps, now = Date.now()) {
  const cutoff = now - MESSAGE_RATE_LIMIT.windowMs;
  const remainingTimestamps = recentTimestamps.filter((t) => t > cutoff);
  return {
    allowed: remainingTimestamps.length < MESSAGE_RATE_LIMIT.maxMessages,
    remainingTimestamps,
  };
}
