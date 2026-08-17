// Filet de régression léger pour src/lib/matching/matchingService.js.
// Lancer : node scripts/check-matching.mjs
import { computeMatch, filterCandidatesByPreferences, rankCandidates } from "../src/lib/matching/matchingService.js";

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}`);
  }
}

function assertScoreSane(name, result) {
  assert(`${name} — score is a number`, typeof result.score === "number" && !Number.isNaN(result.score));
  assert(`${name} — score >= 0`, result.score >= 0);
  assert(`${name} — score <= 100`, result.score <= 100);
  assert(`${name} — reasons is an array`, Array.isArray(result.reasons));
  assert(`${name} — reasons has 1-4 items`, result.reasons.length >= 1 && result.reasons.length <= 4);
}

const base = {
  id: "u1", age: 30, city: "Montréal", country: "Sénégal",
  interests: "Sport, Voyage, Cuisine, Musique",
  looking_for: "❤️ Amour, 💍 Relation sérieuse",
  relationship_values: "🌱 Construire une relation progressivement",
  languages_detail: [{ language: "Français", level: "Courant" }, { language: "Anglais", level: "Avancé" }],
  wants_children: "Oui", family_importance: "Importante", career_goal: "Carrière", geographic_openness: "Je suis ouvert(e) à déménager",
};

// 1. Profils identiques
{
  const identical = computeMatch(base, { ...base, id: "u2" });
  assertScoreSane("Profils identiques", identical);
  assert("Profils identiques — score élevé", identical.score >= 70);
  assert("Profils identiques — 4 raisons", identical.reasons.length === 4);
}

// 2. Profils très différents
{
  const different = computeMatch(base, {
    id: "u3", age: 55, city: "Toronto", country: "Vietnam",
    interests: "Jardinage, Histoire",
    looking_for: "🤝 Amitié",
    languages_detail: [{ language: "Vietnamien", level: "Courant" }],
  });
  assertScoreSane("Profils très différents", different);
  assert("Profils très différents — score bas", different.score <= 20);
  assert("Profils très différents — intentions incompatibles", different.compatibleIntentions === false);
}

// 3. Aucune donnée
{
  const empty = computeMatch({ id: "u1" }, { id: "u4" });
  assertScoreSane("Aucune donnée (les deux)", empty);
  assert("Aucune donnée — score au plancher", empty.score === 8);
  assert("Aucune donnée — message de repli", empty.reasons[0].includes("Peu d'informations"));
}

// 4. Données partielles (un profil riche, un presque vide)
{
  const partial = computeMatch(base, { id: "u5" });
  assertScoreSane("Données partielles", partial);
}

// 5. Intentions incompatibles mais autres catégories communes
{
  const incompatibleIntentions = computeMatch(base, {
    ...base, id: "u6", looking_for: "🤝 Amitié",
  });
  assertScoreSane("Intentions incompatibles, ville commune", incompatibleIntentions);
  assert("Intentions incompatibles — compatibleIntentions=false", incompatibleIntentions.compatibleIntentions === false);
  assert("Intentions incompatibles — score non nul (autres catégories)", incompatibleIntentions.score > 8);
}

// 6. Intérêts communs
{
  const sharedInterests = computeMatch(base, { id: "u7", interests: "Sport, Voyage, Lecture" });
  assert("Intérêts communs — 2 intérêts détectés", sharedInterests.commonInterests.length === 2);
}

// 7. Langues communes
{
  const sharedLang = computeMatch(base, { id: "u8", languages_detail: [{ language: "Français", level: "Débutant" }] });
  assert("Langues communes — raison présente", sharedLang.reasons.some((r) => r.includes("Français")));
}

// 8. Préférence d'âge — exclusion dure
{
  const candidates = [
    { id: "young", age: 20, city: "Montréal" },
    { id: "mid", age: 30, city: "Montréal" },
    { id: "old", age: 60, city: "Montréal" },
    { id: "no-age", city: "Montréal" }, // pas de donnée -> ne doit pas être exclu
  ];
  const viewer = { id: "viewer", age: 28, pref_age_min: 25, pref_age_max: 35, city: "Montréal" };
  const filtered = filterCandidatesByPreferences(viewer, candidates);
  assert("Préférence d'âge — exclut trop jeune", !filtered.some((c) => c.id === "young"));
  assert("Préférence d'âge — exclut trop âgé", !filtered.some((c) => c.id === "old"));
  assert("Préférence d'âge — garde dans la plage", filtered.some((c) => c.id === "mid"));
  assert("Préférence d'âge — ne pénalise pas l'absence de donnée", filtered.some((c) => c.id === "no-age"));
}

// 9. Soi-même — rankCandidates ne doit jamais se recommander lui-même
{
  const viewer = { ...base, id: "self" };
  const candidates = [viewer, { ...base, id: "other" }];
  const ranked = rankCandidates(viewer, candidates);
  assert("Soi-même — jamais dans les recommandations", !ranked.some((r) => r.profile.id === "self"));
  assert("Soi-même — pas de crash sur computeMatch(soi, soi)", (() => {
    const selfMatch = computeMatch(viewer, viewer);
    return typeof selfMatch.score === "number";
  })());
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
