import React from "react";
import { ArrowLeft, Camera } from "lucide-react";
import { C, LOOKING_FOR, EDUCATION_LEVELS, HAS_CHILDREN_OPTIONS, MAX_PHOTOS } from "../constants";

export default function EditProfileForm({
  setView,
  editForm,
  setEditForm,
  coverPreview,
  currentUser,
  setCoverFile,
  setCoverPreview,
  existingPhotos,
  removeExistingPhoto,
  newPhotoPreviews,
  removeNewPhotoFile,
  handleNewPhotosSelected,
  savingProfile,
  handleSaveProfile,
}) {
  return (
    <div className="p-6 max-w-md mx-auto w-full">
      <button onClick={() => setView("discover")} className="flex items-center gap-1 text-sm mb-4" style={{ color: C.indigo }}>
        <ArrowLeft size={16} /> Retour
      </button>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 24, color: C.indigo }} className="mb-4">
        Modifier mon profil
      </h2>

      <label className="cursor-pointer block mb-4" style={{ position: "relative" }}>
        <div
          className="w-full rounded-2xl flex items-center justify-center"
          style={{
            height: 120,
            background: coverPreview || currentUser?.cover_url
              ? `url(${coverPreview || currentUser.cover_url}) center/cover`
              : `linear-gradient(150deg, ${C.ochre}, ${C.clay} 55%, ${C.indigo} 130%)`,
          }}
        >
          {!coverPreview && !currentUser?.cover_url && (
            <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#fff" }}>
              <Camera size={14} /> Ajouter une photo de couverture
            </span>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setCoverFile(file);
            const reader = new FileReader();
            reader.onload = () => setCoverPreview(reader.result);
            reader.readAsDataURL(file);
          }}
        />
      </label>

      <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
        <div className="mb-2">
          <div className="flex flex-wrap gap-2 mb-2">
            {existingPhotos.map((photo) => (
              <div key={photo.id} style={{ position: "relative" }}>
                <img src={photo.url} alt="Photo" style={{ width: 72, height: 72, borderRadius: "var(--bb-radius-sm)", objectFit: "cover", boxShadow: "var(--bb-shadow-sm)" }} />
                <button type="button" onClick={() => removeExistingPhoto(photo)}
                  style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: C.indigo, color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ×
                </button>
              </div>
            ))}
            {newPhotoPreviews.map((src, i) => (
              <div key={`new-${i}`} style={{ position: "relative" }}>
                <img src={src} alt={`Nouvelle photo ${i + 1}`} style={{ width: 72, height: 72, borderRadius: "var(--bb-radius-sm)", objectFit: "cover", boxShadow: "var(--bb-shadow-sm)" }} />
                <button type="button" onClick={() => removeNewPhotoFile(i)}
                  style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: C.indigo, color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ×
                </button>
              </div>
            ))}
            {existingPhotos.length + newPhotoPreviews.length < MAX_PHOTOS && (
              <label className="cursor-pointer flex items-center justify-center transition-colors hover:bg-black/[0.02]" style={{ width: 72, height: 72, borderRadius: "var(--bb-radius-sm)", border: "1.5px dashed rgba(43,36,32,0.28)" }}>
                <span className="text-xs text-center px-1" style={{ color: "rgba(43,36,32,0.5)" }}>+ Ajouter</span>
                <input type="file" accept="image/*" multiple onChange={handleNewPhotosSelected} className="hidden" />
              </label>
            )}
          </div>
          <p className="text-xs" style={{ color: "rgba(43,36,32,0.5)" }}>
            Jusqu'à {MAX_PHOTOS} photos. La première est ta photo principale.
          </p>
        </div>

        <input placeholder="Prénom" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          className="bb-input w-full text-sm" />
        <input placeholder="Âge" type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
          className="bb-input w-full text-sm" />
        <input placeholder="Pays d'origine" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
          className="bb-input w-full text-sm" />
        <input placeholder="Langues parlées" value={editForm.languages} onChange={(e) => setEditForm({ ...editForm, languages: e.target.value })}
          className="bb-input w-full text-sm" />
        <input placeholder="Ville (Canada)" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
          className="bb-input w-full text-sm" />
        <input placeholder="Depuis quand au Canada ?" value={editForm.arrivedSince} onChange={(e) => setEditForm({ ...editForm, arrivedSince: e.target.value })}
          className="bb-input w-full text-sm" />

        <div className="flex gap-2 flex-wrap">
          {LOOKING_FOR.map((opt) => (
            <button type="button" key={opt} onClick={() => setEditForm({ ...editForm, lookingFor: opt })}
              className={`bb-pill text-xs font-semibold px-3 py-2 rounded-full ${editForm.lookingFor === opt ? "bb-pill-active" : ""}`}>
              {opt}
            </button>
          ))}
        </div>

        <input placeholder="Profession / métier" value={editForm.occupation} onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
          className="bb-input w-full text-sm" />
        <input placeholder="Centres d'intérêt" value={editForm.interests} onChange={(e) => setEditForm({ ...editForm, interests: e.target.value })}
          className="bb-input w-full text-sm" />

        <div>
          <p className="text-xs mb-1.5" style={{ color: "rgba(43,36,32,0.55)" }}>Niveau d'études</p>
          <div className="flex gap-2 flex-wrap">
            {EDUCATION_LEVELS.map((opt) => (
              <button type="button" key={opt} onClick={() => setEditForm({ ...editForm, educationLevel: opt })}
                className={`bb-pill text-xs font-semibold px-3 py-2 rounded-full ${editForm.educationLevel === opt ? "bb-pill-active" : ""}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs mb-1.5" style={{ color: "rgba(43,36,32,0.55)" }}>As-tu des enfants ?</p>
          <div className="flex gap-2">
            {HAS_CHILDREN_OPTIONS.map((opt) => (
              <button type="button" key={opt} onClick={() => setEditForm({ ...editForm, hasChildren: opt })}
                className={`bb-pill text-xs font-semibold px-3 py-2 rounded-full ${editForm.hasChildren === opt ? "bb-pill-active" : ""}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>

        <textarea placeholder="Une courte bio..." value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
          rows={3} className="bb-input w-full text-sm" />

        <button type="submit" disabled={savingProfile} className="bb-btn bb-btn-primary mt-2 py-3 rounded-full font-semibold text-sm">
          {savingProfile ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </form>
    </div>
  );
}
