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
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [blockPairs, setBlockPairs] = useState([]); // [{from_id, to_id}] — blocages faits par moi
  const [menuOpenFor, setMenuOpenFor] = useState(null); // id du profil dont le menu ⋮ est ouvert
  const [reportTarget, setReportTarget] = useState(null); // profil en cours de signalement
  const [reportReason, setReportReason] = useState("");
  const [reportSending, setReportSending] = useState(false);

  const [form, setForm] = useState({
    name: "", age: "", country: "", languages: "", city: "",
    arrivedSince: "", lookingFor: LOOKING_FOR[0], bio: "",
  });

  const loadAll = useCallback(async () => {
    try {
      const [profRes, likeRes, passRes, blockRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: true }),
        supabase.from("likes").select("from_id,to_id"),
        supabase.from("passes").select("from_id,to_id"),
        supabase.from("blocks").select("from_id,to_id"),
      ]);
      if (profRes.error) throw profRes.error;
      if (likeRes.error) throw likeRes.error;
      if (passRes.error) throw passRes.error;
      if (blockRes.error) throw blockRes.error;
      setProfiles(profRes.data || []);
      setLikePairs(likeRes.data || []);
      setPassPairs(passRes.data || []);
      setBlockPairs(blockRes.data || []);
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

  function handleAvatarFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  }

  async function uploadAvatar(userId, file) {
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleAvatarUpdate(e) {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !session) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(session.user.id, file);
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", currentUser.id)
        .select()
        .single();
      if (updateError) throw updateError;
      setCurrentUser(data);
      setProfiles((ps) => ps.map((p) => (p.id === data.id ? data : p)));
    } catch (e) {
      console.error(e);
      setError("Échec de l'envoi de la photo.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleCreateProfile(e) {
    e.preventDefault();
    if (!form.name || !form.age) { setError("Nom et âge sont requis."); return; }
    setSaving(true);
    try {
      let avatarUrl = null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(session.user.id, avatarFile);
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
        avatar_url: avatarUrl,
      };
      const { data, error: insertError } = await supabase
        .from("profiles")
        .insert(payload)
        .select()
        .single();
      if (insertError) throw insertError;
      setCurrentUser(data);
      setProfiles((p) => [...p, data]);
      setDiscoverIdx(0);
      setError("");
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
        {currentUser && (
          <label className="flex items-center gap-2 cursor-pointer">
            <div style={{ position: "relative" }}>
              <Avatar name={currentUser.name} url={currentUser.avatar_url} size={30} />
              {uploadingAvatar && (
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 size={14} color="#fff" className="animate-spin" />
                </div>
              )}
            </div>
            <span className="text-sm font-medium">{currentUser.name}</span>
            <input type="file" accept="image/*" onChange={handleAvatarUpdate} className="hidden" />
          </label>
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
              <label className="flex flex-col items-center gap-2 mb-2 cursor-pointer">
                <div style={{ position: "relative" }}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Aperçu" style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 88, height: 88, borderRadius: "50%", background: "rgba(43,36,32,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="text-xs text-center px-2" style={{ color: "rgba(43,36,32,0.5)" }}>Ajouter une photo</span>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
              </label>
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

              <textarea placeholder="Une courte bio..." value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3} className="p-3 rounded-lg text-sm" style={{ border: "1px solid rgba(43,36,32,0.15)" }} />

              <button type="submit" disabled={saving} className="mt-2 py-3 rounded-full font-semibold text-sm disabled:opacity-60" style={{ background: C.indigo, color: C.sand }}>
                {saving ? "Création..." : "Créer mon profil"}
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
                      background: p.avatar_url
                        ? `linear-gradient(rgba(20,29,56,0) 40%, rgba(20,29,56,0.75)), url(${p.avatar_url}) center/cover`
                        : `linear-gradient(150deg, ${C.ochre}, ${C.clay} 55%, ${C.indigo} 130%)`
                    }}>
                      <div style={{ fontFamily: "serif", fontStyle: "italic", fontSize: 26, color: "#fff" }}>{p.name}, {p.age}</div>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.sand }}>{p.country}</span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.sand }}>{p.languages}</span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.sand }}>{p.city}</span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.sand }}>Arrivé·e {p.arrived_since}</span>
                      </div>
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
      {currentUser && view !== "form" && (
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
