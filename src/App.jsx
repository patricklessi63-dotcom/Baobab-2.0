import React, { useState, useEffect, useCallback } from "react";
import { Heart, X, MessageCircle, User, ArrowLeft, Send, Plus, Loader2, Sparkles } from "lucide-react";
import { supabase } from "./supabaseClient";

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

function Avatar({ name, size = 44 }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: `linear-gradient(135deg, ${C.clay}, ${C.ochre})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontFamily: "serif", fontWeight: 600,
        fontSize: size * 0.4, flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("loading");
  const [profiles, setProfiles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [likes, setLikes] = useState([]); // [{from_id, to_id}]
  const [passes, setPasses] = useState([]);
  const [discoverIdx, setDiscoverIdx] = useState(0);
  const [matchNotice, setMatchNotice] = useState(null);
  const [activeMatch, setActiveMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "", age: "", country: "", languages: "", city: "",
    arrivedSince: "", lookingFor: LOOKING_FOR[0], bio: "",
  });

  const loadAll = useCallback(async () => {
    try {
      const [{ data: profs, error: e1 }, { data: lk, error: e2 }, { data: ps, error: e3 }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("likes").select("from_id,to_id"),
        supabase.from("passes").select("from_id,to_id"),
      ]);
      if (e1 || e2 || e3) throw e1 || e2 || e3;
      setProfiles(profs || []);
      setLikes(lk || []);
      setPasses(ps || []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les données depuis Supabase. Vérifie ta configuration (.env, schéma SQL).");
    }
  }, []);

  useEffect(() => {
    loadAll().then(() => setView("welcome"));
  }, [loadAll]);

  const hasLiked = (from, to) => likes.some((l) => l.from_id === from && l.to_id === to);
  const hasPassed = (from, to) => passes.some((p) => p.from_id === from && p.to_id === to);

  const getMatches = useCallback(() => {
    if (!currentUser) return [];
    return profiles.filter(
      (p) => p.id !== currentUser.id && hasLiked(currentUser.id, p.id) && hasLiked(p.id, currentUser.id)
    );
  }, [profiles, likes, currentUser]);

  async function handleCreateProfile(e) {
    e.preventDefault();
    if (!form.name || !form.age) { setError("Nom et âge sont requis."); return; }
    try {
      const { data, error: err } = await supabase
        .from("profiles")
        .insert({
          name: form.name,
          age: Number(form.age),
          country: form.country,
          languages: form.languages,
          city: form.city,
          arrived_since: form.arrivedSince,
          looking_for: form.lookingFor,
          bio: form.bio,
        })
        .select()
        .single();
      if (err) throw err;
      setCurrentUser(data);
      setProfiles((p) => [data, ...p]);
      setDiscoverIdx(0);
      setError("");
      setView("discover");
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la création du profil.");
    }
  }

  function continueAs(profile) {
    setCurrentUser(profile);
    setDiscoverIdx(0);
    setView("discover");
  }

  const candidates = currentUser
    ? profiles.filter(
        (p) => p.id !== currentUser.id && !hasLiked(currentUser.id, p.id) && !hasPassed(currentUser.id, p.id)
      )
    : [];

  async function handleLike(target) {
    if (!currentUser) return;
    try {
      const { error: err } = await supabase.from("likes").insert({ from_id: currentUser.id, to_id: target.id });
      if (err) throw err;
      setLikes((k) => [...k, { from_id: currentUser.id, to_id: target.id }]);
      if (hasLiked(target.id, currentUser.id)) setMatchNotice(target);
      setDiscoverIdx((i) => i + 1);
    } catch (e) {
      console.error(e);
      setError("Impossible d'enregistrer ce like.");
    }
  }

  async function handlePass(target) {
    if (!currentUser) return;
    try {
      const { error: err } = await supabase.from("passes").insert({ from_id: currentUser.id, to_id: target.id });
      if (err) throw err;
      setPasses((k) => [...k, { from_id: currentUser.id, to_id: target.id }]);
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
      const { data, error: err } = await supabase
        .from("messages")
        .select("*")
        .eq("match_key", matchKey(currentUser.id, match.id))
        .order("created_at", { ascending: true });
      if (err) throw err;
      setMessages(data || []);
    } catch (e) {
      console.error(e);
      setMessages([]);
    }
  }

  async function sendMessage() {
    if (!messageDraft.trim() || !currentUser || !activeMatch) return;
    try {
      const { data, error: err } = await supabase
        .from("messages")
        .insert({
          match_key: matchKey(currentUser.id, activeMatch.id),
          from_id: currentUser.id,
          text: messageDraft.trim(),
        })
        .select()
        .single();
      if (err) throw err;
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

  if (view === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.sand }}>
        <Loader2 className="animate-spin" color={C.indigo} size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.sand, fontFamily: "Manrope, system-ui, sans-serif", color: C.ink }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid rgba(43,36,32,0.1)` }}>
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", fontWeight: 600, fontSize: 20, color: C.indigo }}>
            Baobab
          </span>
        </div>
        {currentUser && (
          <div className="flex items-center gap-2">
            <Avatar name={currentUser.name} size={30} />
            <span className="text-sm font-medium">{currentUser.name}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-5 mt-3 text-sm px-3 py-2 rounded-lg" style={{ background: "#fce8e0", color: C.clay }}>
          {error}
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {view === "welcome" && (
          <div className="p-6 max-w-md mx-auto w-full">
            <p className="text-sm mb-5" style={{ color: "rgba(43,36,32,0.65)" }}>
              Choisis un profil existant pour continuer, ou crée le tien.
            </p>

            <button
              onClick={() => setView("form")}
              className="w-full flex items-center justify-center gap-2 mb-6 py-3 rounded-full font-semibold text-sm"
              style={{ background: C.clay, color: C.sand }}
            >
              <Plus size={16} /> Créer mon profil
            </button>

            {profiles.length > 0 && (
              <>
                <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "rgba(43,36,32,0.45)" }}>
                  Profils existants
                </div>
                <div className="flex flex-col gap-2">
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => continueAs(p)}
                      className="flex items-center gap-3 p-3 rounded-xl text-left"
                      style={{ background: "#fff", border: "1px solid rgba(43,36,32,0.1)" }}
                    >
                      <Avatar name={p.name} />
                      <div>
                        <div className="text-sm font-semibold">{p.name}, {p.age}</div>
                        <div className="text-xs" style={{ color: "rgba(43,36,32,0.5)" }}>{p.country} · {p.city}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {view === "form" && (
          <div className="p-6 max-w-md mx-auto w-full">
            <button onClick={() => setView("welcome")} className="flex items-center gap-1 text-sm mb-4" style={{ color: C.indigo }}>
              <ArrowLeft size={16} /> Retour
            </button>
            <h2 style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", fontSize: 24, color: C.indigo }} className="mb-4">
              Créer ton profil
            </h2>
            <form onSubmit={handleCreateProfile} className="flex flex-col gap-3">
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

              <button type="submit" className="mt-2 py-3 rounded-full font-semibold text-sm" style={{ background: C.indigo, color: C.sand }}>
                Créer mon profil
              </button>
            </form>
          </div>
        )}

        {view === "discover" && currentUser && (
          <div className="p-6 max-w-md mx-auto w-full flex-1 flex flex-col items-center">
            {matchNotice && (
              <div className="fixed inset-0 flex items-center justify-center z-20" style={{ background: "rgba(20,29,56,0.6)" }}>
                <div className="bg-white rounded-2xl p-6 text-center max-w-xs mx-4">
                  <Sparkles color={C.ochre} className="mx-auto mb-2" />
                  <div style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", fontSize: 22, color: C.indigo }}>C'est un match !</div>
                  <p className="text-sm my-3" style={{ color: "rgba(43,36,32,0.65)" }}>
                    Toi et {matchNotice.name} vous êtes plu mutuellement.
                  </p>
                  <button onClick={() => setMatchNotice(null)} className="w-full py-2.5 rounded-full text-sm font-semibold" style={{ background: C.clay, color: "#fff" }}>
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
                  <div className="w-full rounded-2xl overflow-hidden bg-white" style={{ border: "1px solid rgba(43,36,32,0.1)" }}>
                    <div className="h-48 flex items-end p-4" style={{ background: `linear-gradient(150deg, ${C.ochre}, ${C.clay} 55%, ${C.indigo} 130%)` }}>
                      <div style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", fontSize: 26, color: "#fff" }}>{p.name}, {p.age}</div>
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

        {view === "matches" && currentUser && (
          <div className="p-6 max-w-md mx-auto w-full">
            <h2 style={{ fontFamily: "Fraunces, serif", fontStyle: "italic", fontSize: 22, color: C.indigo }} className="mb-4">Mes matchs</h2>
            {getMatches().length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(43,36,32,0.55)" }}>Pas encore de match. Continue à découvrir des profils !</p>
            ) : (
              <div className="flex flex-col gap-2">
                {getMatches().map((m) => (
                  <button key={m.id} onClick={() => openChat(m)} className="flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: "#fff", border: "1px solid rgba(43,36,32,0.1)" }}>
                    <Avatar name={m.name} />
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

        {view === "chat" && activeMatch && (
          <div className="flex flex-col flex-1 max-w-md mx-auto w-full">
            <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid rgba(43,36,32,0.1)" }}>
              <button onClick={() => setView("matches")}><ArrowLeft size={18} /></button>
              <Avatar name={activeMatch.name} size={34} />
              <div className="text-sm font-semibold">{activeMatch.name}</div>
              <button onClick={() => refreshMessages(activeMatch)} className="ml-auto text-xs" style={{ color: C.indigo }}>Actualiser</button>
            </div>

            <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-xs text-center mt-6" style={{ color: "rgba(43,36,32,0.45)" }}>Dites bonjour 👋</p>
              )}
              {messages.map((m, i) => (
                <div key={m.id ?? i} className="max-w-[75%] text-sm px-3 py-2 rounded-2xl"
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

      {currentUser && view !== "form" && (
        <div className="flex justify-around py-3" style={{ borderTop: "1px solid rgba(43,36,32,0.1)", background: "#fff" }}>
          <button onClick={() => setView("discover")} className="flex flex-col items-center gap-0.5 text-xs" style={{ color: view === "discover" ? C.clay : "rgba(43,36,32,0.45)" }}>
            <Heart size={18} /> Découvrir
          </button>
          <button onClick={() => setView("matches")} className="flex flex-col items-center gap-0.5 text-xs" style={{ color: view === "matches" ? C.clay : "rgba(43,36,32,0.45)" }}>
            <MessageCircle size={18} /> Matchs
          </button>
          <button onClick={() => setView("welcome")} className="flex flex-col items-center gap-0.5 text-xs" style={{ color: "rgba(43,36,32,0.45)" }}>
            <User size={18} /> Changer
          </button>
        </div>
      )}
    </div>
  );
}
