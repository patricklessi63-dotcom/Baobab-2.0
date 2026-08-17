// Découpe un texte en une liste de segments texte/lien, pour un rendu JSX
// sûr (jamais dangerouslySetInnerHTML). Seuls les liens commençant
// explicitement par http:// ou https:// sont reconnus — ferme par
// construction tout vecteur javascript:/data:.
const URL_RE = /(https?:\/\/[^\s<>"']+)/gi;

export function linkify(text) {
  // String.split avec un groupe capturant alterne texte/correspondance/texte/...
  // — on utilise cette parité (calculée AVANT tout filtrage, sinon les
  // index se décalent) plutôt que de retester le regex global (dont le
  // lastIndex serait sinon incorrectement partagé entre appels).
  return String(text || "")
    .split(URL_RE)
    .map((part, i) => (i % 2 === 1 ? { type: "link", href: part, text: part } : { type: "text", text: part }))
    .filter((seg) => seg.text !== "");
}
