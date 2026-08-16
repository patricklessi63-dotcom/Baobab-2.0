import React from "react";
import { C, LOOKING_FOR, EDUCATION_LEVELS, HAS_CHILDREN_OPTIONS, MAX_PHOTOS } from "../constants";

export default function CreateProfileForm({
  form,
  setForm,
  photoPreviews,
  handlePhotosSelected,
  removePhotoFile,
  saving,
  handleCreateProfile,
}) {
  return (
    <div className="p-6 max-w-md mx-auto w-full">
      <p className="text-sm mb-4" style={{ color: "rgba(43,36,32,0.65)" }}>
        Bienvenue ! Crée ton profil pour commencer à découvrir d'autres membres.
      </p>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 24, color: C.indigo }} className="mb-4">
        Créer ton profil
      </h2>
      <form onSubmit={handleCreateProfile} className="flex flex-col gap-3">
        <div className="mb-2">
          <div className="flex flex-wrap gap-2 mb-2">
            {photoPreviews.map((src, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={src} alt={`Photo ${i + 1}`} style={{ width: 72, height: 72, borderRadius: "var(--bb-radius-sm)", objectFit: "cover", boxShadow: "var(--bb-shadow-sm)" }} />
                <button type="button" onClick={() => removePhotoFile(i)}
                  style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: C.indigo, color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ×
                </button>
              </div>
            ))}
            {photoPreviews.length < MAX_PHOTOS && (
              <label className="cursor-pointer flex items-center justify-center transition-colors hover:bg-black/[0.02]" style={{ width: 72, height: 72, borderRadius: "var(--bb-radius-sm)", border: "1.5px dashed rgba(43,36,32,0.28)" }}>
                <span className="text-xs text-center px-1" style={{ color: "rgba(43,36,32,0.5)" }}>+ Ajouter</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotosSelected} className="hidden" />
              </label>
            )}
          </div>
          <p className="text-xs" style={{ color: "rgba(43,36,32,0.5)" }}>
            Jusqu'à {MAX_PHOTOS} photos. La première sera ta photo principale.
          </p>
        </div>
        <input placeholder="Prénom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="bb-input w-full text-sm" />
        <input placeholder="Âge" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })}
          className="bb-input w-full text-sm" />
        <input placeholder="Pays d'origine" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
          className="bb-input w-full text-sm" />
        <input placeholder="Langues parlées" value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })}
          className="bb-input w-full text-sm" />
        <input placeholder="Ville (Canada)" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="bb-input w-full text-sm" />
        <input placeholder="Depuis quand au Canada ? (ex: 4 mois)" value={form.arrivedSince} onChange={(e) => setForm({ ...form, arrivedSince: e.target.value })}
          className="bb-input w-full text-sm" />

        <div className="flex gap-2 flex-wrap">
          {LOOKING_FOR.map((opt) => (
            <button type="button" key={opt} onClick={() => setForm({ ...form, lookingFor: opt })}
              className={`bb-pill text-xs font-semibold px-3 py-2 rounded-full ${form.lookingFor === opt ? "bb-pill-active" : ""}`}>
              {opt}
            </button>
          ))}
        </div>

        <input placeholder="Profession / métier" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })}
          className="bb-input w-full text-sm" />
        <input placeholder="Centres d'intérêt (ex : cuisine, danse, foot...)" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })}
          className="bb-input w-full text-sm" />

        <div>
          <p className="text-xs mb-1.5" style={{ color: "rgba(43,36,32,0.55)" }}>Niveau d'études</p>
          <div className="flex gap-2 flex-wrap">
            {EDUCATION_LEVELS.map((opt) => (
              <button type="button" key={opt} onClick={() => setForm({ ...form, educationLevel: opt })}
                className={`bb-pill text-xs font-semibold px-3 py-2 rounded-full ${form.educationLevel === opt ? "bb-pill-active" : ""}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs mb-1.5" style={{ color: "rgba(43,36,32,0.55)" }}>As-tu des enfants ?</p>
          <div className="flex gap-2">
            {HAS_CHILDREN_OPTIONS.map((opt) => (
              <button type="button" key={opt} onClick={() => setForm({ ...form, hasChildren: opt })}
                className={`bb-pill text-xs font-semibold px-3 py-2 rounded-full ${form.hasChildren === opt ? "bb-pill-active" : ""}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        <textarea placeholder="Une courte bio..." value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
          rows={3} className="bb-input w-full text-sm" />

        <button type="submit" disabled={saving} className="bb-btn bb-btn-primary mt-2 py-3 rounded-full font-semibold text-sm">
          {saving ? "Création..." : "Créer mon profil"}
        </button>
      </form>
    </div>
  );
}
