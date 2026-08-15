import React, { useState, useEffect, useCallback } from "react";
import { Heart, X, MessageCircle, LogOut, ArrowLeft, Send, Loader2, Sparkles, MoreVertical, Flag, Ban } from "lucide-react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth.jsx";

// ---------- Palette "Baobab" ----------
const C = {
  indigo: "#1E2A4F",
  indigoDeep: "#141D38",
  clay: "#C1613D",
  ochre: "#D9A441",
  sand: "#F2E9DC",
  ink: "#2B2420",
};

const LOOKING_FOR = ["Relation sérieuse", "Amitié", "Je découvre"];
const EDUCATION_LEVELS = ["Secondaire", "Collégial / DEC", "Baccalauréat", "Maîtrise", "Doctorat", "Formation professionnelle"];
const HAS_CHILDREN_OPTIONS = ["Oui", "Non"];
const MAX_PHOTOS = 6;

function matchKey(a, b) {
  return [a, b].sort().join("__");
}

function Avatar({ name, size = 44, url }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${C.clay}, ${C.ochre})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontFamily: "serif",
        fontWeight: 600,
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = pas encore vérifié, null = pas connecté
  const [view, setView] = useState("loading"); // loading | form | discover | matches | chat
  const [profiles, setProfiles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [likePairs, setLikePairs] = useState([]); // [{from_id, to_id}]
  const [passPairs, setPassPairs] = useState([]); // [{from_id, to_id}]
  const [discoverIdx, setDiscoverIdx] = useState(0);
  const [matchNotice, setMatchNotice] = useState(null);
  const [activeMatch, setActiveMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [blockPairs, setBlockPairs] = useState([]); // [{from_id, to_id}] — blocages faits par moi
  const [menuOpenFor, setMenuOpenFor] = useState(null); // id du profil dont le menu ⋮ est ouvert
  const [reportTarget, setReportTarget] = useState(null); // profil en cours de signalement
  const [reportReason, setReportReason] = useState("");
  const [reportSending, setReportSending] = useState(false);

  // Photos multiples — création de profil
  const [photoFiles, setPhotoFiles] = useState([]); // File[]
  const [photoPreviews, setPhotoPreviews] = useState([]); // dataURL[]

  // Photos multiples — indexées par profil, pour l'affichage (discover, etc.)
  const [profilePhotos, setProfilePhotos] = useState({}); // { [profileId]: [{id, url, position}] }
  const [cardPhotoIdx, setCardPhotoIdx] = useState({}); // { [profileId]: index affiché }

  // Édition de profil existant
  const [editForm, setEditForm] = useState(null);
  const [existingPhotos, setExistingPhotos] = useState([]); // photos déjà enregistrées, en édition
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);

  const [form, setForm] = useState({
    name: "", age: "", country: "", languages: "", city: "",
    arrivedSince: "", lookingFor: LOOKING_FOR[0], bio: "",
    occupation: "", interests: "", educationLevel: EDUCATION_LEVELS[0], hasChildren: HAS_CHILDREN_OPTIONS[1],
  });

  const loadAll = useCallback(async () => {
    try {
      const [profRes, likeRes, passRes, blockRes, photoRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: true }),
        supabase.from("likes").select("from_id,to_id"),
        supabase.from("passes").select("from_id,to_id"),
        supabase.from("blocks").select("from_id,to_id"),
        supabase.from("profile_photos").select("*").order("position", { ascending: true }),
      ]);
      if (profRes.error) throw profRes.error;
      if (likeRes.error) throw likeRes.error;
      if (passRes.error) throw passRes.error;
      if (blockRes.error) throw blockRes.error;
      if (photoRes.error) throw photoRes.error;
      setProfiles(profRes.data || []);
      setLikePairs(likeRes.data || []);
      setPassPairs(passRes.data || []);
      setBlockPairs(blockRes.data || []);
      const grouped = {};
      (photoRes.data || []).forEach((ph) => {
        if (!grouped[ph.profile_id]) grouped[ph.profile_id] = [];
        grouped[ph.profile_id].push(ph);
      });
      setProfilePhotos(grouped);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les données. Réessaie.");
    }
  }, []);

  // Suivre l'état de connexion
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Une fois connecté, charger les données et retrouver (ou non) son propre profil
  useEffect(() => {
    if (session === undefined) return; // vérification en cours
    if (session === null) {
      setView("auth");
      setCurrentUser(null);
      return;
    }
    loadAll().then(() => {
      setView("checking-profile");
    });
  }, [session, loadAll]);

  useEffect(() => {
    if (view !== "checking-profile") return;
    if (!session) return;
    const own = profiles.find((p) => p.user_id === session.user.id);
    if (own) {
      setCurrentUser(own);
      setDiscoverIdx(0);
      setView("discover");
    } else {
      setCurrentUser(null);
      setView("form");
    }
  }, [view, profiles, session]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setProfiles([]);
    setLikePairs([]);
    setPassPairs([]);
  }

  const hasLiked = (from, to) => likePairs.some((l) => l.from_id === from && l.to_id === to);
  const hasPassed = (from, to) => passPairs.some((p) => p.from_id === from && p.to_id === to);
  const hasBlocked = (from, to) => blockPairs.some((b) => b.from_id === from && b.to_id === to);

  const getMatches = useCallback(() => {
    if (!currentUser) return [];
    return profiles.filter(
      (p) =>
        p.id !== currentUser.id &&
        hasLiked(currentUser.id, p.id) &&
        hasLiked(p.id, currentUser.id) &&
        !hasBlocked(currentUser.id, p.id)
    );
  }, [profiles, likePairs, blockPairs, currentUser]);

  async function handleBlock(target) {
    if (!currentUser) return;
    try {
      const { error: blockError } = await supabase
        .from("blocks")
        .insert({ from_id: currentUser.id, to_id: target.id });
      if (blockError) throw blockError;
      setBlockPairs((b) => [...b, { from_id: currentUser.id, to_id: target.id }]);
      setMenuOpenFor(null);
      if (activeMatch?.id === target.id) {
        setActiveMatch(null);
        setView("matches");
      }
    } catch (e) {
      console.error(e);
      setError("Impossible de bloquer ce profil.");
    }
  }

  async function submitReport() {
    if (!currentUser || !reportTarget || !reportReason.trim()) return;
    setReportSending(true);
    try {
      const { error: reportError } = await supabase
        .from("reports")
        .insert({ from_id: currentUser.id, to_id: reportTarget.id, reason: reportReason.trim() });
      if (reportError) throw reportError;
      setReportTarget(null);
      setReportReason("");
      setMenuOpenFor(null);
    } catch (e) {
      console.error(e);
      setError("Échec de l'envoi du signalement.");
    } finally {
      setReportSending(false);
    }
  }

  async function uploadPhoto(userId, file, idx = 0) {
    const ext = file.name.split(".").pop();
    const path = `${userId}/photo-${Date.now()}-${idx}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  }

  // ---- Sélection de photos pendant la création du profil ----
  function handlePhotosSelected(e) {
    const room = MAX_PHOTOS - photoFiles.length;
    const files = Array.from(e.target.files || []).slice(0, Math.max(room, 0));
    if (files.length === 0) return;
    setPhotoFiles((prev) => [...prev, ...files].slice(0, MAX_PHOTOS));
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreviews((prev) => [...prev, reader.result].slice(0, MAX_PHOTOS));
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removePhotoFile(idx) {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  // ---- Carrousel de photos (cartes discover / matches) ----
  function nextCardPhoto(profileId, total, ev) {
    if (ev) ev.stopPropagation();
    setCardPhotoIdx((m) => ({ ...m, [profileId]: ((m[profileId] || 0) + 1) % total }));
  }
  function prevCardPhoto(profileId, total, ev) {
    if (ev) ev.stopPropagation();
    setCardPhotoIdx((m) => ({ ...m, [profileId]: ((m[profileId] || 0) - 1 + total) % total }));
  }

  // ---- Édition de profil existant ----
  function openEditProfile() {
    if (!currentUser) return;
    setEditForm({
      name: currentUser.name || "",
      age: String(currentUser.age || ""),
      country: currentUser.country || "",
      languages: currentUser.languages || "",
      city: currentUser.city || "",
      arrivedSince: currentUser.arrived_since || "",
      lookingFor: currentUser.looking_for || LOOKING_FOR[0],
      bio: currentUser.bio || "",
      occupation: currentUser.occupation || "",
      interests: currentUser.interests || "",
      educationLevel: currentUser.education_level || EDUCATION_LEVELS[0],
      hasChildren: currentUser.has_children || HAS_CHILDREN_OPTIONS[1],
    });
    setExistingPhotos(profilePhotos[currentUser.id] || []);
    setNewPhotoFiles([]);
    setNewPhotoPreviews([]);
    setMenuOpenFor(null);
    setView("editProfile");
  }

  function handleNewPhotosSelected(e) {
    const total = existingPhotos.length + newPhotoFiles.length;
    const room = MAX_PHOTOS - total;
    const files = Array.from(e.target.files || []).slice(0, Math.max(room, 0));
    if (files.length === 0) return;
    setNewPhotoFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setNewPhotoPreviews((prev) => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removeNewPhotoFile(idx) {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPhotoPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function removeExistingPhoto(photo) {
    try {
      const { error: delError } = await supabase.from("profile_photos").delete().eq("id", photo.id);
      if (delError) throw delError;
      setExistingPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (e) {
      console.error(e);
      setError("Impossible de supprimer cette photo.");
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!editForm.name || !editForm.age || !currentUser) { setError("Nom et âge sont requis."); return; }
    setSavingProfile(true);
    try {
      const uploadedUrls = [];
      for (let i = 0; i < newPhotoFiles.length; i++) {
        const url = await uploadPhoto(session.user.id, newPhotoFiles[i], existingPhotos.length + i);
        uploadedUrls.push(url);
      }

      let newPhotoRows = [];
      if (uploadedUrls.length > 0) {
        const startPos = existingPhotos.length;
        const rows = uploadedUrls.map((url, idx) => ({
          profile_id: currentUser.id, url, position: startPos + idx,
        }));
        const { data: inserted, error: photoError } = await supabase
          .from("profile_photos")
          .insert(rows)
          .select();
        if (photoError) throw photoError;
        newPhotoRows = inserted || [];
      }

      const allPhotos = [...existingPhotos, ...newPhotoRows];
      const newAvatarUrl = allPhotos[0]?.url || null;

      const payload = {
        name: editForm.name,
        age: Number(editForm.age),
        country: editForm.country,
        languages: editForm.languages,
        city: editForm.city,
        arrived_since: editForm.arrivedSince,
        looking_for: editForm.lookingFor,
        bio: editForm.bio,
        occupation: editForm.occupation,
        interests: editForm.interests,
        education_level: editForm.educationLevel,
        has_children: editForm.hasChildren,
        avatar_url: newAvatarUrl,
      };
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", currentUser.id)
        .select()
        .single();
      if (updateError) throw updateError;

      setCurrentUser(data);
      setProfiles((ps) => ps.map((p) => (p.id === data.id ? data : p)));
      setProfilePhotos((pp) => ({ ...pp, [data.id]: allPhotos }));
      setError("");
      setView("discover");
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la mise à jour du profil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCreateProfile(e) {
    e.preventDefault();
    if (!form.name || !form.age) { setError("Nom et âge sont requis."); return; }
    setSaving(true);
    try {
      const uploadedUrls = [];
      for (let i = 0; i < photoFiles.length; i++) {
        const url = await uploadPhoto(session.user.id, photoFiles[i], i);
        uploadedUrls.push(url);
      }
      const payload = {
        user_id: session.user.id,
        name: form.name,
        age: Number(form.age),
        country: form.country,
        languages: form.languages,
        city: form.city,
        arrived_since: form.arrivedSince,
        looking_for: form.lookingFor,
        bio: form.bio,
        occupation: form.occupation,
        interests: form.interests,
        education_level: form.educationLevel,
        has_children: form.hasChildren,
        avatar_url: uploadedUrls[0] || null,
      };
      const { data, error: insertError } = await supabase
        .from("profiles")
        .insert(payload)
        .select()
        .single();
      if (insertError) throw insertError;

      let photoRows = [];
      if (uploadedUrls.length > 0) {
        const rows = uploadedUrls.map((url, idx) => ({ profile_id: data.id, url, position: idx }));
        const { data: inserted, error: photoError } = await supabase
          .from("profile_photos")
          .insert(rows)
          .select();
        if (photoError) throw photoError;
        photoRows = inserted || [];
      }

      setCurrentUser(data);
      setProfiles((p) => [...p, data]);
      setProfilePhotos((pp) => ({ ...pp, [data.id]: photoRows }));
      setDiscoverIdx(0);
      setError("");
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setView("discover");
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la création du profil.");
    } finally {
      setSaving(false);
    }
  }

  const candidates = currentUser
    ? profiles.filter(
        (p) =>
          p.id !== currentUser.id &&
          !hasLiked(currentUser.id, p.id) &&
          !hasPassed(currentUser.id, p.id) &&
          !hasBlocked(currentUser.id, p.id)
      )
    : [];

  async function handleLike(target) {
    if (!currentUser) return;
    try {
      const { error: likeError } = await supabase
        .from("likes")
        .insert({ from_id: currentUser.id, to_id: target.id });
      if (likeError) throw likeError;
      setLikePairs((k) => [...k, { from_id: currentUser.id, to_id: target.id }]);
      if (hasLiked(target.id, currentUser.id)) {
        setMatchNotice(target);
      }
      setDiscoverIdx((i) => i + 1);
    } catch (e) {
      console.error(e);
      setError("Impossible d'enregistrer ce like.");
    }
  }

  async function handlePass(target) {
    if (!currentUser) return;
    try {
      const { error: passError } = await supabase
        .from("passes")
        .insert({ from_id: currentUser.id, to_id: target.id });
      if (passError) throw passError;
      setPassPairs((k) => [...k, { from_id: currentUser.id, to_id: target.id }]);
      setDiscoverIdx((i) => i + 1);
    } catch (e) {
      console.error(e);
      setError("Une erreur est survenue.");
    }
  }

  async function openChat(match) {
    setActiveMatch(match);
    setView("chat");
    await refreshMessages(match);
  }

  async function refreshMessages(match) {
    if (!currentUser || !match) return;
    try {
      const { data, error: msgError } = await supabase
        .from("messages")
        .select("*")
        .eq("match_key", matchKey(currentUser.id, match.id))
        .order("created_at", { ascending: true });
      if (msgError) throw msgError;
      setMessages(data || []);
    } catch (e) {
      console.error(e);
      setMessages([]);
    }
  }

  async function sendMessage() {
    if (!messageDraft.trim() || !currentUser || !activeMatch) return;
    const text = messageDraft.trim();
    try {
      const { data, error: sendError } = await supabase
        .from("messages")
        .insert({
          match_key: matchKey(currentUser.id, activeMatch.id),
          from_id: currentUser.id,
          text,
        })
        .select()
        .single();
      if (sendError) throw sendError;
      setMessages((m) => [...m, data]);
      setMessageDraft("");
    } catch (e) {
      console.error(e);
      setError("Message non envoyé, réessaie.");
    }
  }

  const iceBreakers = [
    "Le plat de chez toi qui te manque le plus ?",
    "Comment se passe ton adaptation ici ?",
    "Qu'est-ce qui t'a le plus surpris en arrivant au Canada ?",
  ];

  // ---------------- RENDER ----------------

  if (view === "loading" || view === "checking-profile" || session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.sand }}>
        <Loader2 className="animate-spin" color={C.indigo} size={32} />
      </div>
    );
  }

  if (view === "auth") {
    return <Auth />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.sand, fontFamily: "system-ui, sans-serif", color: C.ink }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid rgba(43,36,32,0.1)` }}>
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: "serif", fontStyle: "italic", fontWeight: 600, fontSize: 20, color: C.indigo }}>
            Baobab
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: C.ochre, color: C.indigoDeep, fontWeight: 700 }}>
            prototype
          </span>
        </div>
        {currentUser && view !== "editProfile" && (
          <button onClick={openEditProfile} className="flex items-center gap-2">
            <div style={{ position: "relative" }}>
              <Avatar name={currentUser.name} url={currentUser.avatar_url} size={30} />
              {uploadingAvatar && (
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 size={14} color="#fff" className="animate-spin" />
                </div>
              )}
            </div>
            <span className="text-sm font-medium">{currentUser.name}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mx-5 mt-3 text-sm px-3 py-2 rounded-lg" style={{ background: "#fce8e0", color: C.clay }}>
          {error}
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {/* ---------- FORM (première connexion : pas encore de profil) ---------- */}
        {view === "form" && (
          <div className="p-6 max-w-md mx-auto w-full">
            <p className="text-sm mb-4" style={{ color: "rgba(43,36,32,0.65)" }}>
              Bienvenue ! Crée ton profil pour commencer à découvrir d'autres membres.
            </p>
            <h2 style={{ fontFamily: "serif", fontStyle: "italic", fontSize: 24, color: C.indigo }} className="mb-4">
              Créer ton profil
            </h2>
            <form onSubmit={handleCreateProfile} className="flex flex-col gap-3">
              <div className="mb-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  {photoPreviews.map((src, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={src} alt={`Photo ${i + 1}`} style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover" }} />
                      <button type="button" onClick={() => removePhotoFile(i)}
                        style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: C.indigo, color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        ×
                      </button>
                    </div>
                  ))}
                  {photoPreviews.length < MAX_PHOTOS && (
                    <label className="cursor-pointer flex items-center justify-center" style={{ width: 72, height: 72, borderRadius: 12, border: "1px dashed rgba(43,36,32,0.3)" }}>
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
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />
              <input placeholder="Âge" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />
              <input placeholder="Pays d'origine" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />
              <input placeholder="Langues parlées" value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })}
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />
              <input placeholder="Ville (Canada)" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />
              <input placeholder="Depuis quand au Canada ? (ex: 4 mois)" value={form.arrivedSince} onChange={(e) => setForm({ ...form, arrivedSince: e.target.value })}
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />

              <div className="flex gap-2 flex-wrap">
                {LOOKING_FOR.map((opt) => (
                  <button type="button" key={opt} onClick={() => setForm({ ...form, lookingFor: opt })}
                    className="text-xs font-semibold px-3 py-2 rounded-full"
                    style={form.lookingFor === opt
                      ? { background: C.ochre, color: C.indigoDeep }
                      : { border: "1px solid rgba(43,36,32,0.2)", color: C.ink }}>
                    {opt}
                  </button>
                ))}
              </div>

              <input placeholder="Profession / métier" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />
              <input placeholder="Centres d'intérêt (ex : cuisine, danse, foot...)" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })}
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />

              <div>
                <p className="text-xs mb-1.5" style={{ color: "rgba(43,36,32,0.55)" }}>Niveau d'études</p>
                <div className="flex gap-2 flex-wrap">
                  {EDUCATION_LEVELS.map((opt) => (
                    <button type="button" key={opt} onClick={() => setForm({ ...form, educationLevel: opt })}
                      className="text-xs font-semibold px-3 py-2 rounded-full"
                      style={form.educationLevel === opt
                        ? { background: C.ochre, color: C.indigoDeep }
                        : { border: "1px solid rgba(43,36,32,0.2)", color: C.ink }}>
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
                      className="text-xs font-semibold px-3 py-2 rounded-full"
                      style={form.hasChildren === opt
                        ? { background: C.ochre, color: C.indigoDeep }
                        : { border: "1px solid rgba(43,36,32,0.2)", color: C.ink }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <textarea placeholder="Une courte bio..." value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3} className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />

              <button type="submit" disabled={saving} className="mt-2 py-3 rounded-full font-semibold text-sm disabled:opacity-60" style={{ background: C.indigo, color: C.sand }}>
                {saving ? "Création..." : "Créer mon profil"}
              </button>
            </form>
          </div>
        )}

        {/* ---------- ÉDITION DE PROFIL ---------- */}
        {view === "editProfile" && editForm && (
          <div className="p-6 max-w-md mx-auto w-full">
            <button onClick={() => setView("discover")} className="flex items-center gap-1 text-sm mb-4" style={{ color: C.indigo }}>
              <ArrowLeft size={16} /> Retour
            </button>
            <h2 style={{ fontFamily: "serif", fontStyle: "italic", fontSize: 24, color: C.indigo }} className="mb-4">
              Modifier mon profil
            </h2>
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
              <div className="mb-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  {existingPhotos.map((photo) => (
                    <div key={photo.id} style={{ position: "relative" }}>
                      <img src={photo.url} alt="Photo" style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover" }} />
                      <button type="button" onClick={() => removeExistingPhoto(photo)}
                        style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: C.indigo, color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        ×
                      </button>
                    </div>
                  ))}
                  {newPhotoPreviews.map((src, i) => (
                    <div key={`new-${i}`} style={{ position: "relative" }}>
                      <img src={src} alt={`Nouvelle photo ${i + 1}`} style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover" }} />
                      <button type="button" onClick={() => removeNewPhotoFile(i)}
                        style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: C.indigo, color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        ×
                      </button>
                    </div>
                  ))}
                  {existingPhotos.length + newPhotoPreviews.length < MAX_PHOTOS && (
                    <label className="cursor-pointer flex items-center justify-center" style={{ width: 72, height: 72, borderRadius: 12, border: "1px dashed rgba(43,36,32,0.3)" }}>
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
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />
              <input placeholder="Âge" type="number" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />
              <input placeholder="Pays d'origine" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />
              <input placeholder="Langues parlées" value={editForm.languages} onChange={(e) => setEditForm({ ...editForm, languages: e.target.value })}
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />
              <input placeholder="Ville (Canada)" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />
              <input placeholder="Depuis quand au Canada ?" value={editForm.arrivedSince} onChange={(e) => setEditForm({ ...editForm, arrivedSince: e.target.value })}
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />

              <div className="flex gap-2 flex-wrap">
                {LOOKING_FOR.map((opt) => (
                  <button type="button" key={opt} onClick={() => setEditForm({ ...editForm, lookingFor: opt })}
                    className="text-xs font-semibold px-3 py-2 rounded-full"
                    style={editForm.lookingFor === opt
                      ? { background: C.ochre, color: C.indigoDeep }
                      : { border: "1px solid rgba(43,36,32,0.2)", color: C.ink }}>
                    {opt}
                  </button>
                ))}
              </div>

              <input placeholder="Profession / métier" value={editForm.occupation} onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />
              <input placeholder="Centres d'intérêt" value={editForm.interests} onChange={(e) => setEditForm({ ...editForm, interests: e.target.value })}
                className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />

              <div>
                <p className="text-xs mb-1.5" style={{ color: "rgba(43,36,32,0.55)" }}>Niveau d'études</p>
                <div className="flex gap-2 flex-wrap">
                  {EDUCATION_LEVELS.map((opt) => (
                    <button type="button" key={opt} onClick={() => setEditForm({ ...editForm, educationLevel: opt })}
                      className="text-xs font-semibold px-3 py-2 rounded-full"
                      style={editForm.educationLevel === opt
                        ? { background: C.ochre, color: C.indigoDeep }
                        : { border: "1px solid rgba(43,36,32,0.2)", color: C.ink }}>
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
                      className="text-xs font-semibold px-3 py-2 rounded-full"
                      style={editForm.hasChildren === opt
                        ? { background: C.ochre, color: C.indigoDeep }
                        : { border: "1px solid rgba(43,36,32,0.2)", color: C.ink }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <textarea placeholder="Une courte bio..." value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                rows={3} className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />

              <button type="submit" disabled={savingProfile} className="mt-2 py-3 rounded-full font-semibold text-sm disabled:opacity-60" style={{ background: C.indigo, color: C.sand }}>
                {savingProfile ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </form>
          </div>
        )}

        {/* ---------- DISCOVER ---------- */}
        {view === "discover" && currentUser && (
          <div className="p-6 max-w-md mx-auto w-full flex-1 flex flex-col items-center">
            {matchNotice && (
              <div className="fixed inset-0 flex items-center justify-center z-20" style={{ background: "rgba(20,29,56,0.6)" }}>
                <div className="bg-white rounded-2xl p-6 text-center max-w-xs mx-4">
                  <Sparkles color={C.ochre} className="mx-auto mb-2" />
                  <div style={{ fontFamily: "serif", fontStyle: "italic", fontSize: 22, color: C.indigo }}>C'est un match !</div>
                  <p className="text-sm my-3" style={{ color: "rgba(43,36,32,0.65)" }}>
                    Toi et {matchNotice.name} vous êtes plu mutuellement.
                  </p>
                  <button onClick={() => { setMatchNotice(null); }} className="w-full py-2.5 rounded-full text-sm font-semibold" style={{ background: C.clay, color: "#fff" }}>
                    Continuer
                  </button>
                </div>
              </div>
            )}

            {candidates.length === 0 || discoverIdx >= candidates.length ? (
              <div className="text-center mt-16">
                <p className="text-sm" style={{ color: "rgba(43,36,32,0.55)" }}>
                  Plus de profils à découvrir pour l'instant. Invite d'autres testeurs à créer leur profil !
                </p>
              </div>
            ) : (
              (() => {
                const p = candidates[discoverIdx];
                const photos = profilePhotos[p.id]?.length ? profilePhotos[p.id] : (p.avatar_url ? [{ url: p.avatar_url }] : []);
                const photoIdx = cardPhotoIdx[p.id] || 0;
                const currentPhoto = photos[photoIdx]?.url;
                return (
                  <div className="w-full rounded-2xl overflow-hidden bg-white" style={{ border: "1px solid rgba(43,36,32,0.1)", position: "relative" }}>
                    <div style={{ position: "absolute", top: 12, right: 12, zIndex: 5 }}>
                      <button
                        onClick={() => setMenuOpenFor(menuOpenFor === p.id ? null : p.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(20,29,56,0.5)" }}
                      >
                        <MoreVertical size={16} color="#fff" />
                      </button>
                      {menuOpenFor === p.id && (
                        <div className="mt-1 rounded-xl overflow-hidden bg-white" style={{ border: "1px solid rgba(43,36,32,0.1)", minWidth: 160 }}>
                          <button
                            onClick={() => { setReportTarget(p); setMenuOpenFor(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left"
                            style={{ color: C.ink }}
                          >
                            <Flag size={14} /> Signaler
                          </button>
                          <button
                            onClick={() => handleBlock(p)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left"
                            style={{ color: C.clay, borderTop: "1px solid rgba(43,36,32,0.08)" }}
                          >
                            <Ban size={14} /> Bloquer
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="h-48 flex items-end p-4" style={{
                      position: "relative",
                      background: currentPhoto
                        ? `linear-gradient(rgba(20,29,56,0) 40%, rgba(20,29,56,0.75)), url(${currentPhoto}) center/cover`
                        : `linear-gradient(150deg, ${C.ochre}, ${C.clay} 55%, ${C.indigo} 130%)`
                    }}>
                      {photos.length > 1 && (
                        <>
                          <button onClick={(ev) => prevCardPhoto(p.id, photos.length, ev)}
                            style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "35%" }} aria-label="Photo précédente" />
                          <button onClick={(ev) => nextCardPhoto(p.id, photos.length, ev)}
                            style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "35%" }} aria-label="Photo suivante" />
                          <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
                            {photos.map((_, i) => (
                              <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === photoIdx ? "#fff" : "rgba(255,255,255,0.4)" }} />
                            ))}
                          </div>
                        </>
                      )}
                      <div style={{ fontFamily: "serif", fontStyle: "italic", fontSize: 26, color: "#fff" }}>{p.name}, {p.age}</div>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.sand }}>{p.country}</span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.sand }}>{p.languages}</span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.sand }}>{p.city}</span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.sand }}>Arrivé·e {p.arrived_since}</span>
                        {p.occupation && <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.sand }}>{p.occupation}</span>}
                        {p.education_level && <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.sand }}>{p.education_level}</span>}
                        {p.has_children && <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.sand }}>{p.has_children === "Oui" ? "A des enfants" : "Sans enfant"}</span>}
                      </div>
                      {p.interests && (
                        <p className="text-xs mb-2" style={{ color: "rgba(43,36,32,0.55)" }}>
                          <span style={{ fontWeight: 600 }}>Intérêts : </span>{p.interests}
                        </p>
                      )}
                      <p className="text-sm mb-4" style={{ color: "rgba(43,36,32,0.7)" }}>{p.bio || "—"}</p>
                      <div className="flex justify-center gap-4">
                        <button onClick={() => handlePass(p)} className="w-14 h-14 rounded-full flex items-center justify-center" style={{ border: "1px solid rgba(43,36,32,0.15)" }}>
                          <X />
                        </button>
                        <button onClick={() => handleLike(p)} className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.clay, color: "#fff" }}>
                          <Heart fill="#fff" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* ---------- MATCHES ---------- */}
        {view === "matches" && currentUser && (
          <div className="p-6 max-w-md mx-auto w-full">
            <h2 style={{ fontFamily: "serif", fontStyle: "italic", fontSize: 22, color: C.indigo }} className="mb-4">Mes matchs</h2>
            {getMatches().length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(43,36,32,0.55)" }}>Pas encore de match. Continue à découvrir des profils !</p>
            ) : (
              <div className="flex flex-col gap-2">
                {getMatches().map((m) => (
                  <button key={m.id} onClick={() => openChat(m)} className="flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: "#fff", border: "1px solid rgba(43,36,32,0.1)" }}>
                    <Avatar name={m.name} url={m.avatar_url} />
                    <div>
                      <div className="text-sm font-semibold">{m.name}</div>
                      <div className="text-xs" style={{ color: "rgba(43,36,32,0.5)" }}>{m.country} · {m.city}</div>
                    </div>
                    <MessageCircle className="ml-auto" size={18} color={C.indigo} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------- CHAT ---------- */}
        {view === "chat" && activeMatch && (
          <div className="flex flex-col flex-1 max-w-md mx-auto w-full">
            <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid rgba(43,36,32,0.1)", position: "relative" }}>
              <button onClick={() => setView("matches")}><ArrowLeft size={18} /></button>
              <Avatar name={activeMatch.name} url={activeMatch.avatar_url} size={34} />
              <div className="text-sm font-semibold">{activeMatch.name}</div>
              <button onClick={() => refreshMessages(activeMatch)} className="ml-auto text-xs" style={{ color: C.indigo }}>Actualiser</button>
              <button onClick={() => setMenuOpenFor(menuOpenFor === activeMatch.id ? null : activeMatch.id)} className="ml-1">
                <MoreVertical size={18} color={C.ink} />
              </button>
              {menuOpenFor === activeMatch.id && (
                <div className="rounded-xl overflow-hidden bg-white" style={{ border: "1px solid rgba(43,36,32,0.1)", position: "absolute", top: 48, right: 12, minWidth: 160, zIndex: 5 }}>
                  <button
                    onClick={() => { setReportTarget(activeMatch); setMenuOpenFor(null); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left"
                    style={{ color: C.ink }}
                  >
                    <Flag size={14} /> Signaler
                  </button>
                  <button
                    onClick={() => handleBlock(activeMatch)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left"
                    style={{ color: C.clay, borderTop: "1px solid rgba(43,36,32,0.08)" }}
                  >
                    <Ban size={14} /> Bloquer
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-xs text-center mt-6" style={{ color: "rgba(43,36,32,0.45)" }}>Dites bonjour 👋</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className="max-w-[75%] text-sm px-3 py-2 rounded-2xl"
                  style={m.from_id === currentUser.id
                    ? { alignSelf: "flex-end", background: C.indigo, color: C.sand, borderBottomRightRadius: 4 }
                    : { alignSelf: "flex-start", background: C.sand, color: C.ink, borderBottomLeftRadius: 4 }}>
                  {m.text}
                </div>
              ))}
            </div>

            {messages.length === 0 && (
              <div className="px-4 pb-2 flex flex-col gap-1.5">
                {iceBreakers.map((ib) => (
                  <button key={ib} onClick={() => setMessageDraft(ib)} className="text-left text-xs px-3 py-2 rounded-lg" style={{ background: "#fff", border: "1px solid rgba(43,36,32,0.12)", color: C.indigo }}>
                    {ib}
                  </button>
                ))}
              </div>
            )}

            <div className="p-4 flex gap-2" style={{ borderTop: "1px solid rgba(43,36,32,0.1)" }}>
              <input
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Écris un message..."
                className="flex-1 p-2.5 rounded-full text-sm"
                style={{ border: "1px solid rgba(43,36,32,0.15)" }}
              />
              <button onClick={sendMessage} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: C.clay, color: "#fff" }}>
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------- MODAL SIGNALEMENT ---------- */}
      {reportTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-30" style={{ background: "rgba(20,29,56,0.6)" }}>
          <div className="bg-white rounded-2xl p-6 max-w-xs mx-4 w-full">
            <div style={{ fontFamily: "serif", fontStyle: "italic", fontSize: 20, color: C.indigo }} className="mb-1">
              Signaler {reportTarget.name}
            </div>
            <p className="text-sm mb-3" style={{ color: "rgba(43,36,32,0.6)" }}>
              Explique brièvement pourquoi. On examinera ton signalement.
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={3}
              placeholder="Ex : comportement déplacé, faux profil..."
              className="w-full p-3 rounded-lg text-sm mb-3"
              style={{ border: "1px solid rgba(43,36,32,0.15)" }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setReportTarget(null); setReportReason(""); }}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold"
                style={{ border: "1px solid rgba(43,36,32,0.15)", color: C.ink }}
              >
                Annuler
              </button>
              <button
                onClick={submitReport}
                disabled={reportSending || !reportReason.trim()}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold disabled:opacity-60"
                style={{ background: C.clay, color: "#fff" }}
              >
                {reportSending ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      {currentUser && view !== "form" && view !== "editProfile" && (
        <div className="flex justify-around py-3" style={{ borderTop: "1px solid rgba(43,36,32,0.1)", background: "#fff" }}>
          <button onClick={() => setView("discover")} className="flex flex-col items-center gap-0.5 text-xs" style={{ color: view === "discover" ? C.clay : "rgba(43,36,32,0.45)" }}>
            <Heart size={18} /> Découvrir
          </button>
          <button onClick={() => setView("matches")} className="flex flex-col items-center gap-0.5 text-xs" style={{ color: view === "matches" ? C.clay : "rgba(43,36,32,0.45)" }}>
            <MessageCircle size={18} /> Matchs
          </button>
          <button onClick={handleSignOut} className="flex flex-col items-center gap-0.5 text-xs" style={{ color: "rgba(43,36,32,0.45)" }}>
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
