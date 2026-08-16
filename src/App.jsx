import React, { useState, useEffect, useCallback, useRef } from "react";
import { Home, Heart, X, MessageCircle, LogOut, ArrowLeft, Send, Loader2, Sparkles, MoreVertical, Flag, Ban, Settings, Shield, Info, Moon, Image as ImageIcon, CheckCheck, Circle, UserRound, Camera, Menu, Search, Bell } from "lucide-react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth.jsx";
import { PrivacyPolicyContent, TermsOfServiceContent } from "./legalContent";

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

function formatLastSeen(iso) {
  if (!iso) return "Statut inconnu";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Vu à l'instant";
  if (mins < 60) return `Vu il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Vu il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Vu il y a ${days} j`;
}

function formatMessageTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Aujourd'hui";
  if (sameDay(d, yesterday)) return "Hier";
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "long" });
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
          boxShadow: "0 1px 3px rgba(20,29,56,0.15)",
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
        fontFamily: "'Fraunces', serif",
        fontWeight: 600,
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}


function SocialShell({
  currentUser,
  setView,
  handleSignOut,
  candidates = [],
  getMatches = () => [],
  openChat = () => {},
  handleLike = () => {},
  handlePass = () => {},
  profilePhotos = {},
  openEditProfile = () => setView("editProfile"),
}) {
  const [tab, setTab] = useState("feed");
  const [profileTab, setProfileTab] = useState("posts");
  const [composer, setComposer] = useState(false);
  const [draft, setDraft] = useState("");
  const [composerMedia, setComposerMedia] = useState(null);
  const [composerMediaKind, setComposerMediaKind] = useState("");
  const [posts, setPosts] = useState([
    { id: 1, name: "Sarah Mbarga", initial: "S", place: "Montréal", time: "12 min", text: "Belle journée à Montréal ☀️ Qui connaît un bon endroit pour bruncher ce week-end ?", likes: 128, color: "#E56B5D" },
    { id: 2, name: "David N.", initial: "D", place: "Québec", time: "38 min", text: "Petit souvenir de voyage. La vie est plus belle quand on découvre de nouvelles personnes 🌍", likes: 76, color: "#5667A9", media: true },
    { id: 3, name: "Mireille K.", initial: "M", place: "Toronto", time: "1 h", text: "Nouveau départ, nouvelle énergie. Si tu viens d'arriver au Canada, bienvenue 🤎", likes: 54, color: "#2F8F6B" },
  ]);
  const [liked, setLiked] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({
    1: [{ id: 1, name: "Brenda", text: "Je te recommande L'Avenue sur du Mont-Royal 👌" }],
  });
  const [commenting, setCommenting] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [menu, setMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [stories, setStories] = useState([
    { name: "Votre statut", initial: "+", own: true, color: "#151B3D" },
    { name: "Sarah", initial: "S", color: "#E56B5D" },
    { name: "Brenda", initial: "B", color: "#2F8F6B" },
    { name: "David", initial: "D", color: "#5667A9" },
    { name: "Mireille", initial: "M", color: "#F2B84B" },
  ]);
  const [storyComposer, setStoryComposer] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [storyViewerIndex, setStoryViewerIndex] = useState(null);
  const [viewedStories, setViewedStories] = useState({});
  const [storyReply, setStoryReply] = useState("");
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [swipeExit, setSwipeExit] = useState(null); // "like" | "pass" | null
  const [discoverPhotoIndex, setDiscoverPhotoIndex] = useState(0);
  const swipeStartRef = useRef(0);

  const primary = "#151B3D";
  const green = "#2F8F6B";
  const coral = "#E56B5D";
  const gold = "#F2B84B";
  const bg = "#F5F6FA";
  const muted = "#7D8194";
  const matches = getMatches();

  const firstName = currentUser?.name?.split(" ")[0] || "toi";

  const filteredPosts = posts.filter((post) =>
    !search.trim() ||
    `${post.name} ${post.place} ${post.text}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  const filteredPeople = candidates.filter((p) =>
    !search.trim() ||
    `${p.name} ${p.city || ""} ${p.country || ""} ${p.occupation || ""}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  const topPerson = filteredPeople[0] || null;
  const topPhotos = topPerson
    ? (profilePhotos[topPerson.id]?.length ? profilePhotos[topPerson.id] : (topPerson.avatar_url ? [{ url: topPerson.avatar_url }] : []))
    : [];

  useEffect(() => {
    setDiscoverPhotoIndex(0);
    setSwipeX(0);
    setSwipeExit(null);
    setSwiping(false);
  }, [topPerson?.id]);

  const decideSwipe = (dir) => {
    if (!topPerson || swipeExit) return;
    setSwipeExit(dir);
    setTimeout(() => {
      dir === "like" ? handleLike(topPerson) : handlePass(topPerson);
    }, 240);
  };

  const onSwipeStart = (clientX) => {
    if (swipeExit) return;
    swipeStartRef.current = clientX;
    setSwiping(true);
  };
  const onSwipeMove = (clientX) => {
    if (!swiping || swipeExit) return;
    setSwipeX(clientX - swipeStartRef.current);
  };
  const onSwipeEnd = () => {
    if (!swiping || swipeExit) return;
    setSwiping(false);
    if (swipeX > 110) decideSwipe("like");
    else if (swipeX < -110) decideSwipe("pass");
    else setSwipeX(0);
  };

  const publish = () => {
    if (!draft.trim() && !composerMedia) return;
    const next = {
      id: Date.now(),
      name: currentUser?.name || "Toi",
      initial: (currentUser?.name || "T")[0].toUpperCase(),
      place: currentUser?.city || "Canada",
      time: "à l'instant",
      text: draft.trim() || "Nouveau partage sur Baobab ✨",
      likes: 0,
      color: green,
      media: Boolean(composerMedia),
      mediaUrl: composerMedia ? URL.createObjectURL(composerMedia) : null,
      mediaKind: composerMediaKind,
    };
    setPosts((prev) => [next, ...prev]);
    setDraft("");
    setComposerMedia(null);
    setComposerMediaKind("");
    setComposer(false);
  };

  const pickMedia = (kind) => {
    if (kind === "photo") photoInputRef.current?.click();
    else videoInputRef.current?.click();
  };

  const onMediaSelected = (e, kind) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setComposerMedia(file);
    setComposerMediaKind(kind);
    e.target.value = "";
  };

  const submitComment = (postId) => {
    const text = commentDraft.trim();
    if (!text) return;
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), {
        id: Date.now(),
        name: currentUser?.name || "Toi",
        text,
      }],
    }));
    setCommentDraft("");
  };

  const sharePost = async (post) => {
    const shareText = `${post.name} sur Baobab : ${post.text}`;
    try {
      if (navigator.share) await navigator.share({ title: "Baobab", text: shareText });
      else await navigator.clipboard?.writeText(shareText);
    } catch (_) {}
  };

  const addStory = () => {
    if (!storyText.trim()) return;
    setStories((prev) => [
      { name: "Votre statut", initial: "+", own: true, color: primary, text: storyText.trim() },
      ...prev.filter((s) => !s.own),
    ]);
    setStoryText("");
    setStoryComposer(false);
  };

  const openStory = (index) => {
    const s = stories[index];
    if (s?.own) { setStoryComposer(true); return; }
    setStoryViewerIndex(index);
    setViewedStories((prev) => ({ ...prev, [index]: true }));
    setStoryReply("");
  };

  const closeStoryViewer = () => setStoryViewerIndex(null);

  const nextStory = () => {
    setStoryViewerIndex((i) => {
      if (i === null) return i;
      let next = i + 1;
      while (next < stories.length && stories[next].own) next++;
      if (next >= stories.length) { return null; }
      setViewedStories((prev) => ({ ...prev, [next]: true }));
      setStoryReply("");
      return next;
    });
  };

  const prevStory = () => {
    setStoryViewerIndex((i) => {
      if (i === null) return i;
      let prev = i - 1;
      while (prev >= 0 && stories[prev].own) prev--;
      if (prev < 0) return i;
      setStoryReply("");
      return prev;
    });
  };

  const sendStoryReply = () => {
    if (!storyReply.trim()) return;
    setStoryReply("");
    nextStory();
  };

  // Auto-avance chaque story après 5 secondes, comme sur Instagram
  useEffect(() => {
    if (storyViewerIndex === null) return;
    const t = setTimeout(() => nextStory(), 5000);
    return () => clearTimeout(t);
  }, [storyViewerIndex]);

  const nav = [
    ["feed", Home, "Accueil"],
    ["discover", Heart, "Rencontres"],
    ["matches", MessageCircle, "Messages"],
    ["stories", Camera, "Statuts"],
    ["profile", UserRound, "Profil"],
  ];

  const goTab = (next) => {
    setTab(next);
    setSearch("");
    setMenu(false);
    setNotificationsOpen(false);
  };

  const card = "rounded-[28px] border bg-white shadow-[0_16px_50px_rgba(21,27,61,0.07)]";
  const buttonBase = "transition-all duration-200 active:scale-[0.98] hover:-translate-y-0.5";

  return (
    <div className="bb-app min-h-screen relative overflow-x-hidden" style={{ color: "#20243A", fontFamily: "'Manrope',system-ui,sans-serif" }}>
      <style>{`
        @keyframes bbAppDrift { from { transform: scale(1.02) translate3d(0,0,0); } to { transform: scale(1.07) translate3d(-1.2%, -1%, 0); } }
        @keyframes bbContentIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .bb-app-bg { animation: bbAppDrift 24s ease-in-out alternate infinite; }
        .bb-content-in { animation: bbContentIn .55s cubic-bezier(.22,1,.36,1) both; }
        .bb-glass { background: rgba(255,255,255,.78) !important; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
        @media (prefers-reduced-motion: reduce) { .bb-app * { animation: none !important; transition: none !important; } }
      `}</style>
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none" style={{ background: "#F7F8FA" }} />
      <header className="sticky top-0 z-40 border-b bb-glass" style={{ borderColor: "rgba(21,27,61,.08)" }}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-[74px] flex items-center gap-4">
          <button onClick={() => goTab("feed")} className="flex items-center gap-3 shrink-0">
            <div className="h-11 w-11 rounded-[15px] flex items-center justify-center text-white font-black text-xl shadow-lg" style={{ background: `linear-gradient(135deg,${coral},${gold})` }}>B</div>
            <div className="hidden sm:block text-left">
              <div className="text-xl font-black tracking-tight" style={{ color: primary }}>baobab</div>
              <div className="text-[9px] uppercase tracking-[.24em] font-bold" style={{ color: muted }}>connecter · s'intégrer · aimer</div>
            </div>
          </button>

          <div className="flex-1 max-w-xl mx-auto relative">
            <div className="h-11 rounded-2xl flex items-center gap-2 px-4" style={{ background: bg, border: search ? `1px solid ${primary}22` : "1px solid transparent" }}>
              <Search size={18} color={muted} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => {}}
                className="bg-transparent outline-none text-sm w-full"
                placeholder="Rechercher une personne, une ville, une discussion…"
              />
              {search && <button onClick={() => setSearch("")}><X size={16} color={muted} /></button>}
            </div>
            {search && (
              <div className="absolute top-14 left-0 right-0 bg-white rounded-2xl border shadow-2xl p-2 z-50">
                <div className="px-3 py-2 text-[11px] font-black uppercase tracking-wider" style={{ color: muted }}>Personnes</div>
                {filteredPeople.slice(0, 4).map((p) => (
                  <button key={p.id} onClick={() => { goTab("discover"); }} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-left">
                    <Avatar name={p.name} url={p.avatar_url} size={38} />
                    <div className="min-w-0"><div className="text-sm font-bold truncate">{p.name}, {p.age}</div><div className="text-xs" style={{ color: muted }}>{p.city || "Canada"} · {p.country || "Afrique"}</div></div>
                  </button>
                ))}
                {filteredPeople.length === 0 && <div className="px-3 py-3 text-sm" style={{ color: muted }}>Aucun profil trouvé.</div>}
                <div className="border-t mt-1 pt-1">
                  <button onClick={() => goTab("feed")} className="w-full text-left px-3 py-2 text-xs font-bold" style={{ color: primary }}>Voir les résultats dans le fil →</button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 relative">
            <button onClick={() => { setNotificationsOpen((v) => !v); setMenu(false); }} className={`${buttonBase} h-11 w-11 rounded-2xl hidden sm:flex items-center justify-center relative`} style={{ background: bg }}>
              <Bell size={19} color={primary} />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full" style={{ background: coral }} />
            </button>
            {notificationsOpen && (
              <div className="absolute right-12 top-14 w-80 bg-white rounded-2xl border shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between px-2 pb-2"><b>Notifications</b><span className="text-xs" style={{ color: muted }}>2 nouvelles</span></div>
                {[["Sarah a aimé ton profil", "Il y a 8 min", Heart], ["Brenda a publié un nouveau statut", "Il y a 25 min", Camera]].map(([title,time,Icon], i) => (
                  <button key={i} onClick={() => setNotificationsOpen(false)} className="w-full flex gap-3 p-3 rounded-xl hover:bg-slate-50 text-left">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: i ? "#EEF8F4" : "#FFF3F1" }}><Icon size={16} color={i ? green : coral} /></div>
                    <div><div className="text-sm font-semibold">{title}</div><div className="text-[11px]" style={{ color: muted }}>{time}</div></div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => { setMenu((v) => !v); setNotificationsOpen(false); }} className={`${buttonBase} h-11 w-11 rounded-2xl flex items-center justify-center text-white font-black`} style={{ background: primary }}>
              {(currentUser?.name || "T")[0].toUpperCase()}
            </button>
            {menu && (
              <div className="absolute right-0 top-14 w-64 bg-white rounded-2xl border shadow-2xl p-2 z-50">
                <div className="rounded-xl p-3 mb-1" style={{ background: `linear-gradient(135deg,${primary},#2B3766)` }}>
                  <div className="text-white font-bold">{currentUser?.name || "Ton profil"}</div>
                  <div className="text-white/60 text-xs mt-0.5">{currentUser?.city || "Canada"} · 🟢 En ligne</div>
                </div>
                <button onClick={() => { goTab("profile"); }} className="w-full text-left rounded-xl px-3 py-3 text-sm hover:bg-slate-50"><UserRound size={16} className="inline mr-3" />Mon profil</button>
                <button onClick={() => { goTab("discover"); }} className="w-full text-left rounded-xl px-3 py-3 text-sm hover:bg-slate-50"><Heart size={16} className="inline mr-3" />Découvrir</button>
                <button onClick={() => { setMenu(false); openEditProfile(); }} className="w-full text-left rounded-xl px-3 py-3 text-sm hover:bg-slate-50"><Settings size={16} className="inline mr-3" />Modifier mon profil</button>
                <button onClick={() => { setMenu(false); handleSignOut(); }} className="w-full text-left rounded-xl px-3 py-3 text-sm" style={{ color: coral }}><LogOut size={16} className="inline mr-3" />Déconnexion</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="bb-content-in relative z-10 max-w-7xl mx-auto px-4 lg:px-8 pb-28 pt-6">
        {tab === "feed" && (
          <div className="grid xl:grid-cols-[minmax(0,1fr)_330px] gap-7">
            <section className="max-w-3xl">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider" style={{ background: "#FFF1EC", color: coral }}><Sparkles size={13} /> Communauté africaine au Canada</div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-3" style={{ color: primary }}>Bonjour {firstName} 👋</h1>
                <p className="mt-1 text-sm md:text-base" style={{ color: muted }}>Rencontre, échange et construis ton nouveau cercle au Canada.</p>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-1 mb-6 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                {stories.map((s, i) => {
                  const seen = viewedStories[i];
                  const ringBg = s.own
                    ? "transparent"
                    : seen
                    ? "#D9DCE4"
                    : `linear-gradient(135deg,${coral},${gold},${green})`;
                  return (
                    <button key={`${s.name}-${i}`} onClick={() => openStory(i)} className="shrink-0 flex flex-col items-center gap-1.5 w-[68px]">
                      <div className="h-[64px] w-[64px] rounded-full flex items-center justify-center p-[3px]" style={{ background: ringBg }}>
                        <div className="h-full w-full rounded-full p-[2px] bg-white flex items-center justify-center">
                          {s.own ? (
                            <div className="h-full w-full rounded-full flex items-center justify-center relative" style={{ background: bg }}>
                              <Avatar name={currentUser?.name || "+"} url={currentUser?.avatar_url} size={56} />
                              <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center text-white text-sm font-black border-2 border-white" style={{ background: coral }}>+</span>
                            </div>
                          ) : (
                            <div className="h-full w-full rounded-full flex items-center justify-center text-white font-black text-lg" style={{ background: `linear-gradient(160deg,${s.color},${primary})` }}>
                              {s.initial}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold truncate w-full text-center" style={{ color: seen ? muted : "#20243A" }}>{s.own ? "Ton statut" : s.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className={`${card} p-4 md:p-5 mb-6`}>
                <div className="flex items-center gap-3">
                  <Avatar name={currentUser?.name || "Toi"} url={currentUser?.avatar_url} size={46} />
                  <button onClick={() => setComposer(true)} className="flex-1 h-12 rounded-2xl px-4 text-left text-sm" style={{ background: bg, color: muted }}>Qu'est-ce que tu veux partager aujourd'hui, {firstName} ?</button>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button onClick={() => { setComposer(true); setTimeout(() => pickMedia("photo"), 50); }} className={`${buttonBase} rounded-xl py-2.5 text-sm font-bold`} style={{ background: "#FFF3F1", color: coral }}><ImageIcon size={16} className="inline mr-1.5" />Photo</button>
                  <button onClick={() => { setComposer(true); setTimeout(() => pickMedia("video"), 50); }} className={`${buttonBase} rounded-xl py-2.5 text-sm font-bold`} style={{ background: "#EEF8F4", color: green }}><Camera size={16} className="inline mr-1.5" />Vidéo</button>
                  <button onClick={() => setComposer(true)} className={`${buttonBase} rounded-xl py-2.5 text-sm font-bold`} style={{ background: "#FFF8E8", color: "#A87414" }}>✍️ Texte</button>
                </div>
              </div>

              {filteredPosts.length === 0 ? (
                <div className={`${card} p-10 text-center`}><Search size={28} className="mx-auto mb-3" color={muted} /><b>Aucun partage trouvé</b><p className="text-sm mt-1" style={{ color: muted }}>Essaie un autre mot-clé.</p></div>
              ) : filteredPosts.map((post, postIndex) => {
                const postComments = commentsByPost[post.id] || [];
                const isLiked = Boolean(liked[post.id]);
                return (
                  <React.Fragment key={post.id}>
                  <article className={`${card} mb-5 overflow-hidden`}>
                    <div className="p-4 flex items-center gap-3">
                      <Avatar name={post.name} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm">{post.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: muted }}>{post.place} · {post.time} · <span style={{ color: green }}>●</span> membre actif</div>
                      </div>
                      <button className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-slate-50"><MoreVertical size={18} color={muted} /></button>
                    </div>
                    <div className="px-4 pb-4 text-[15px] leading-6">{post.text}</div>
                    {post.media && (
                      post.mediaKind === "video" && post.mediaUrl ? (
                        <video src={post.mediaUrl} controls className="w-full max-h-[460px] object-cover bg-black" />
                      ) : post.mediaUrl ? (
                        <img src={post.mediaUrl} alt="" className="w-full max-h-[460px] object-cover" />
                      ) : (
                        <div className="h-72 flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg,${primary},${post.color})` }}>
                          <div className="text-center"><div className="text-7xl">🌍</div><div className="font-bold">Souvenir de voyage</div></div>
                        </div>
                      )
                    )}
                    <div className="px-4 py-3 flex justify-between text-xs" style={{ color: muted }}>
                      <span>{post.likes + (isLiked ? 1 : 0)} J'aime</span>
                      <span>{postComments.length} commentaire{postComments.length > 1 ? "s" : ""}</span>
                    </div>
                    <div className="grid grid-cols-3 border-t" style={{ borderColor: "rgba(21,27,61,.07)" }}>
                      <button onClick={() => setLiked((prev) => ({ ...prev, [post.id]: !prev[post.id] }))} className="py-3 text-sm font-bold" style={{ color: isLiked ? coral : muted }}><Heart size={17} className="inline mr-1.5" fill={isLiked ? coral : "none"} />J'aime</button>
                      <button onClick={() => setCommenting(commenting === post.id ? null : post.id)} className="py-3 text-sm font-bold" style={{ color: muted }}><MessageCircle size={17} className="inline mr-1.5" />Commenter</button>
                      <button onClick={() => sharePost(post)} className="py-3 text-sm font-bold" style={{ color: muted }}>↗ Partager</button>
                    </div>
                    {commenting === post.id && (
                      <div className="border-t p-3" style={{ borderColor: "rgba(21,27,61,.07)" }}>
                        {postComments.length > 0 && <div className="space-y-2 mb-3">{postComments.map((c) => <div key={c.id} className="flex gap-2 text-sm"><Avatar name={c.name} size={28} /><div className="rounded-2xl px-3 py-2" style={{ background: bg }}><b className="text-xs">{c.name}</b><div>{c.text}</div></div></div>)}</div>}
                        <div className="flex gap-2">
                          <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitComment(post.id)} className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: bg }} placeholder="Écrire un commentaire..." />
                          <button onClick={() => submitComment(post.id)} className="w-10 rounded-xl text-white flex items-center justify-center" style={{ background: green }}><Send size={16} /></button>
                        </div>
                      </div>
                    )}
                  </article>
                  {postIndex === 0 && candidates.length > 0 && (
                    <div className={`${card} mb-5 p-5`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <b className="text-sm">Suggestions pour toi</b>
                          <div className="text-xs mt-0.5" style={{ color: muted }}>De nouveaux membres de la communauté</div>
                        </div>
                        <button onClick={() => goTab("discover")} className="text-xs font-bold" style={{ color: coral }}>Tout voir</button>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                        {candidates.slice(0, 6).map((p) => (
                          <div key={p.id} className="shrink-0 w-36 rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(21,27,61,.08)" }}>
                            <div className="h-24 relative" style={{ background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : `linear-gradient(150deg,${gold},${coral})` }}>
                              {!p.avatar_url && <div className="absolute inset-0 flex items-center justify-center text-3xl">🌍</div>}
                            </div>
                            <div className="p-2.5">
                              <div className="text-xs font-bold truncate">{p.name}, {p.age}</div>
                              <div className="text-[10px] truncate mt-0.5" style={{ color: muted }}>{p.city || "Canada"}</div>
                              <button onClick={() => handleLike(p)} className="w-full mt-2 rounded-lg py-1.5 text-[11px] font-bold" style={{ background: "#FFF3F1", color: coral }}>
                                <Heart size={11} className="inline mr-1" />J'aime
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </React.Fragment>
                );
              })}
            </section>

            <aside className="hidden xl:block space-y-5">
              <div className="rounded-[30px] p-6 text-white shadow-[0_20px_60px_rgba(21,27,61,.18)] overflow-hidden relative" style={{ background: `linear-gradient(145deg,${primary},#2B3766)` }}>
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
                <div className="text-[11px] uppercase tracking-[.22em] text-white/55">Nouveau départ</div>
                <div className="text-2xl font-black mt-2">Ton cercle commence ici.</div>
                <p className="text-sm text-white/70 mt-2 leading-6">Trouve des personnes qui comprennent le parcours d'installation au Canada.</p>
                <button onClick={() => goTab("discover")} className="mt-5 rounded-xl px-4 py-3 font-bold" style={{ background: gold, color: primary }}>Découvrir des profils <span className="ml-1">→</span></button>
              </div>

              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between mb-4"><div><b className="text-sm">Nouveaux arrivants</b><div className="text-xs mt-0.5" style={{ color: muted }}>Des connexions proches de toi</div></div><span className="text-xs font-bold" style={{ color: coral }}>{candidates.length} profils</span></div>
                <div className="space-y-3">
                  {candidates.slice(0, 4).map((p) => (
                    <button key={p.id} onClick={() => goTab("discover")} className="w-full flex items-center gap-3 text-left">
                      <Avatar name={p.name} url={p.avatar_url} size={40} />
                      <div className="min-w-0 flex-1"><div className="text-sm font-bold truncate">{p.name}, {p.age}</div><div className="text-xs truncate" style={{ color: muted }}>{p.city || "Canada"} · {p.country || "Afrique"}</div></div>
                      <Heart size={16} color={coral} />
                    </button>
                  ))}
                  {candidates.length === 0 && <p className="text-sm" style={{ color: muted }}>Crée ton profil et invite ta communauté à rejoindre Baobab.</p>}
                </div>
              </div>

              <div className={`${card} p-5`}>
                <div className="text-sm font-black mb-2">Bien s'intégrer au Canada 🇨🇦</div>
                <p className="text-xs leading-5" style={{ color: muted }}>Partage tes bonnes adresses, tes conseils d'installation et les petites victoires de ton quotidien.</p>
              </div>
            </aside>
          </div>
        )}

        {tab === "discover" && (
          <section className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider" style={{ background: "#FFF1EC", color: coral }}><Heart size={13} fill={coral} /> Connexions qui ont du sens</div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-3" style={{ color: primary }}>Découvrir</h1>
              <p className="text-sm mt-1" style={{ color: muted }}>Glisse à droite pour aimer, à gauche pour passer.</p>
            </div>
            {filteredPeople.length === 0 ? (
              <div className={`${card} p-10 text-center`}>
                <div className="text-5xl mb-4">🌍</div>
                <h2 className="text-xl font-black" style={{ color: primary }}>Pas encore de nouveaux profils</h2>
                <p className="text-sm mt-2" style={{ color: muted }}>Invite des amis africains installés au Canada à rejoindre Baobab.</p>
                <button onClick={() => navigator.clipboard?.writeText(window.location.href)} className="mt-5 px-5 py-3 rounded-xl text-white font-bold" style={{ background: primary }}>Inviter ma communauté</button>
              </div>
            ) : (
              <div className="relative h-[620px] select-none" style={{ touchAction: "pan-y" }}>
                <style>{`
                  @keyframes bbCardIn { from { opacity: 0; transform: scale(.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                  .bb-swipe-card { animation: bbCardIn .35s cubic-bezier(.22,1,.36,1) both; }
                `}</style>

                {/* Pile de cartes derrière, purement visuelle */}
                {filteredPeople[2] && (
                  <div className="absolute inset-0 bg-white rounded-[34px] border" style={{ transform: "scale(0.92) translateY(22px)", opacity: 0.5 }} />
                )}
                {filteredPeople[1] && (
                  <div className="absolute inset-0 bg-white rounded-[34px] border overflow-hidden" style={{ transform: "scale(0.96) translateY(11px)", opacity: 0.8 }}>
                    <div className="h-full" style={{ background: `linear-gradient(145deg,${primary},${green},${gold})`, opacity: 0.5 }} />
                  </div>
                )}

                {(() => {
                  const p = topPerson;
                  const photos = topPhotos;
                  const photo = photos[discoverPhotoIndex]?.url || photos[0]?.url;
                  const rotate = swipeX / 18;
                  const isExiting = Boolean(swipeExit);
                  const exitX = swipeExit === "like" ? 640 : swipeExit === "pass" ? -640 : 0;
                  const transform = `translateX(${isExiting ? exitX : swipeX}px) rotate(${isExiting ? rotate * 2.5 : rotate}deg)`;
                  const likeOpacity = Math.min(Math.max(swipeX, 0) / 100, 1);
                  const passOpacity = Math.min(Math.max(-swipeX, 0) / 100, 1);

                  return (
                    <div
                      className="bb-swipe-card absolute inset-0 bg-white rounded-[34px] overflow-hidden border shadow-[0_24px_80px_rgba(21,27,61,.18)] cursor-grab active:cursor-grabbing"
                      style={{ transform, opacity: isExiting ? 0.4 : 1, transition: swiping ? "none" : "transform .35s cubic-bezier(.22,1,.36,1), opacity .35s", touchAction: "pan-y" }}
                      onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); onSwipeStart(e.clientX); }}
                      onPointerMove={(e) => onSwipeMove(e.clientX)}
                      onPointerUp={onSwipeEnd}
                      onPointerCancel={onSwipeEnd}
                      onPointerLeave={() => swiping && onSwipeEnd()}
                    >
                      <div className="h-[500px] relative overflow-hidden" style={{ background: photo ? `linear-gradient(180deg,rgba(21,27,61,.05) 35%,rgba(21,27,61,.88)),url(${photo}) center/cover` : `linear-gradient(145deg,${primary},${green},${gold})` }}>
                        {!photo && <div className="absolute inset-0 flex items-center justify-center text-8xl">🌍</div>}

                        {photos.length > 1 && (
                          <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-10">
                            {photos.map((_, i) => (
                              <div key={i} className="h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden">
                                <div className="h-full bg-white" style={{ width: i === discoverPhotoIndex ? "100%" : i < discoverPhotoIndex ? "100%" : "0%" }} />
                              </div>
                            ))}
                          </div>
                        )}
                        {photos.length > 1 && (
                          <>
                            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setDiscoverPhotoIndex((i) => Math.max(0, i - 1))} className="absolute left-0 top-0 bottom-24 w-1/3 z-[5]" aria-label="Photo précédente" />
                            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setDiscoverPhotoIndex((i) => Math.min(photos.length - 1, i + 1))} className="absolute right-0 top-0 bottom-24 w-1/3 z-[5]" aria-label="Photo suivante" />
                          </>
                        )}

                        <div className="absolute top-4 left-4 flex gap-2 z-10">
                          <span className="px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-[11px] font-bold">{p.city || "Canada"}</span>
                          {p.country && <span className="px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-[11px] font-bold">🌍 {p.country}</span>}
                        </div>

                        <div className="absolute top-16 left-6 border-4 rounded-2xl px-3 py-1 z-10" style={{ borderColor: "#27C56D", transform: `rotate(-14deg)`, opacity: likeOpacity }}>
                          <span className="text-lg font-black tracking-widest" style={{ color: "#27C56D" }}>OUI</span>
                        </div>
                        <div className="absolute top-16 right-6 border-4 rounded-2xl px-3 py-1 z-10" style={{ borderColor: coral, transform: `rotate(14deg)`, opacity: passOpacity }}>
                          <span className="text-lg font-black tracking-widest" style={{ color: coral }}>PASSER</span>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                          <div className="text-3xl font-black">{p.name}, {p.age}</div>
                          <div className="text-sm text-white/75 mt-1">📍 {p.city || "Canada"} · {p.occupation || "Nouveau membre"}</div>
                          {p.bio && <p className="text-sm text-white/80 mt-3 leading-6 max-w-lg">{p.bio}</p>}
                          <div className="flex flex-wrap gap-2 mt-4">
                            {p.languages && <span className="px-2.5 py-1 rounded-full bg-white/12 text-xs">🗣 {p.languages}</span>}
                            {p.arrived_since && <span className="px-2.5 py-1 rounded-full bg-white/12 text-xs">✈️ Au Canada depuis {p.arrived_since}</span>}
                            {p.looking_for && <span className="px-2.5 py-1 rounded-full bg-white/12 text-xs">♡ {p.looking_for}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="p-5 md:p-6">
                        {p.interests && <div className="mb-4"><div className="text-[11px] font-black uppercase tracking-wider" style={{ color: muted }}>Centres d'intérêt</div><div className="text-sm mt-1">{p.interests}</div></div>}
                        <div className="flex items-center justify-center gap-5">
                          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => decideSwipe("pass")} className={`${buttonBase} h-16 w-16 rounded-full border-2 flex items-center justify-center bg-white`} style={{ borderColor: "#E5E7EF" }}><X size={28} color={muted} /></button>
                          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => decideSwipe("like")} className={`${buttonBase} h-[72px] w-[72px] rounded-full text-white flex items-center justify-center shadow-xl`} style={{ background: `linear-gradient(135deg,${coral},#D94F70)` }}><Heart size={30} fill="white" /></button>
                        </div>
                        <div className="text-center text-[11px] mt-3" style={{ color: muted }}>♥ Oui si tu veux faire connaissance · × Passer</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </section>
        )}

        {tab === "matches" && (
          <section className="max-w-3xl mx-auto">
            <div className="mb-6"><div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider" style={{ background: "#EEF8F4", color: green }}><MessageCircle size={13} /> Connexions réciproques</div><h1 className="text-3xl font-black mt-3" style={{ color: primary }}>Tes conversations</h1><p className="text-sm mt-1" style={{ color: muted }}>Quand le feeling est réciproque, la discussion commence ici.</p></div>
            {matches.length === 0 ? (
              <div className={`${card} p-10 text-center`}>
                <div className="h-16 w-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "#FFF3F1" }}><Heart size={28} color={coral} /></div>
                <h2 className="text-xl font-black mt-4" style={{ color: primary }}>Ton prochain match est peut-être juste là</h2>
                <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: muted }}>Explore les profils et envoie un like quand tu as envie de faire connaissance.</p>
                <button onClick={() => goTab("discover")} className="mt-5 px-5 py-3 rounded-xl text-white font-bold" style={{ background: primary }}>Découvrir des profils</button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {matches.map((m) => (
                  <button key={m.id} onClick={() => openChat(m)} className={`${card} ${buttonBase} p-3.5 flex items-center gap-3.5 text-left w-full`}>
                    <div className="relative flex-shrink-0">
                      <Avatar name={m.name} url={m.avatar_url} size={54} />
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white" style={{ background: m.is_online ? "#27C56D" : "#B9BEC9" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold truncate">{m.name}</span>
                        <span className="text-[11px] flex-shrink-0" style={{ color: m.is_online ? green : muted }}>{m.is_online ? "En ligne" : "Hors ligne"}</span>
                      </div>
                      <div className="text-xs mt-1 truncate" style={{ color: muted }}>{m.city || "Canada"} · Dites bonjour 👋</div>
                    </div>
                    <div className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#FFF3F1" }}>
                      <MessageCircle size={16} color={coral} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "stories" && (
          <section>
            <div className="mb-6"><h1 className="text-3xl font-black" style={{ color: primary }}>Statuts <span className="text-xl">✨</span></h1><p className="text-sm mt-1" style={{ color: muted }}>Les petits moments de la communauté.</p></div>
            <div className="flex gap-4 overflow-x-auto pb-3">
              {stories.map((s, i) => (
                <button key={`${s.name}-${i}`} onClick={() => openStory(i)} className="shrink-0 w-32 bg-white rounded-[22px] border p-2 text-left shadow-sm hover:-translate-y-1 transition">
                  <div className="h-40 rounded-2xl flex items-end p-3 relative overflow-hidden" style={{ background: `linear-gradient(160deg,${s.color},${primary})`, opacity: viewedStories[i] && !s.own ? 0.55 : 1 }}>
                    <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20">🌍</div>
                    <span className="h-10 w-10 rounded-full bg-white/20 backdrop-blur text-white flex items-center justify-center font-black border border-white/30">{s.initial}</span>
                    {s.own && <span className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white text-primary flex items-center justify-center text-xs font-black" style={{ color: primary }}>+</span>}
                  </div>
                  <div className="text-xs font-bold mt-2 truncate">{s.name}</div>
                  {s.text && <div className="text-[10px] mt-1 truncate" style={{ color: muted }}>{s.text}</div>}
                </button>
              ))}
            </div>
            <button onClick={() => setStoryComposer(true)} className={`${buttonBase} mt-6 rounded-2xl px-5 py-3 text-white font-bold`} style={{ background: coral }}><Camera size={17} className="inline mr-2" />Partager un moment</button>
          </section>
        )}

        {tab === "profile" && (() => {
          const isComplete = Boolean(currentUser?.bio && currentUser?.occupation && currentUser?.languages);
          const myPosts = posts.filter((p) => p.name === currentUser?.name);
          const aboutRows = [
            ["Profession", currentUser?.occupation, "💼"],
            ["Niveau d'études", currentUser?.education_level, "🎓"],
            ["Langues parlées", currentUser?.languages, "🗣"],
            ["Pays d'origine", currentUser?.country, "🌍"],
            ["Ville au Canada", currentUser?.city, "📍"],
            ["Au Canada depuis", currentUser?.arrived_since, "✈️"],
            ["Recherche", currentUser?.looking_for, "♡"],
            ["A des enfants", currentUser?.has_children, "👨‍👩‍👧"],
            ["Centres d'intérêt", currentUser?.interests, "✨"],
          ].filter(([, value]) => value);

          return (
          <section className="max-w-3xl mx-auto">
            <div className="bg-white rounded-[32px] overflow-hidden border shadow-[0_18px_60px_rgba(21,27,61,.08)]">
              <div className="h-40 md:h-52 relative" style={{ background: `linear-gradient(135deg,${primary},#2B3766 50%,${green})` }}>
                <div className="absolute inset-0 opacity-20 text-[150px] leading-none flex items-center justify-center">🌍</div>
                <div className="absolute right-4 top-4 flex gap-2">
                  <button onClick={() => { navigator.share ? navigator.share({ title: "Baobab", text: `Découvre le profil de ${currentUser?.name} sur Baobab` }) : navigator.clipboard?.writeText(window.location.href); }} className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/15">
                    <Send size={15} color="#fff" />
                  </button>
                  <button onClick={openEditProfile} className="rounded-xl bg-white/15 backdrop-blur text-white px-4 py-2.5 text-xs font-bold border border-white/15">Modifier le profil</button>
                </div>
                <div className="absolute -bottom-12 left-6"><div className="rounded-full p-1.5 bg-white"><Avatar name={currentUser?.name || "Toi"} url={currentUser?.avatar_url} size={92} /></div></div>
              </div>
              <div className="pt-16 p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-black" style={{ color: primary }}>{currentUser?.name || "Ton profil"}</h1>
                      <span className="h-3 w-3 rounded-full" style={{ background: "#27C56D" }} />
                      {isComplete && (
                        <span className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#3897F0" }} title="Profil complet">
                          <CheckCheck size={12} color="#fff" />
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1" style={{ color: muted }}>🟢 En ligne · {currentUser?.city || "Canada"} · {currentUser?.country || "Afrique"}</p>
                  </div>
                  <button onClick={() => goTab("discover")} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: "#FFF3F1", color: coral }}>Trouver des personnes</button>
                </div>
                {currentUser?.bio && <p className="text-sm leading-6 mt-5 max-w-2xl">{currentUser.bio}</p>}
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {[[matches.length, "Matchs"], [myPosts.length, "Publications"], [candidates.length, "Profils à découvrir"]].map(([value, label]) => <div key={label} className="rounded-2xl p-4 text-center" style={{ background: bg }}><b className="text-xl" style={{ color: primary }}>{value}</b><div className="text-[11px] mt-1" style={{ color: muted }}>{label}</div></div>)}
                </div>
              </div>

              <div className="flex border-t" style={{ borderColor: "rgba(21,27,61,.08)" }}>
                {[["posts", "Publications"], ["about", "À propos"]].map(([key, label]) => (
                  <button key={key} onClick={() => setProfileTab(key)} className="flex-1 py-3.5 text-sm font-bold relative" style={{ color: profileTab === key ? primary : muted }}>
                    {label}
                    {profileTab === key && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-10 rounded-full" style={{ background: coral }} />}
                  </button>
                ))}
              </div>

              {profileTab === "posts" ? (
                myPosts.length === 0 ? (
                  <div className="p-10 text-center">
                    <ImageIcon size={26} className="mx-auto mb-2" color={muted} />
                    <p className="text-sm" style={{ color: muted }}>Pas encore de publication. Partage ton premier moment depuis le fil d'actualité.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-0.5 p-0.5">
                    {myPosts.map((p) => (
                      <div key={p.id} className="aspect-square relative overflow-hidden">
                        {p.mediaUrl ? (
                          p.mediaKind === "video" ? (
                            <video src={p.mediaUrl} className="w-full h-full object-cover" />
                          ) : (
                            <img src={p.mediaUrl} alt="" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-3 text-center" style={{ background: `linear-gradient(150deg,${primary},${p.color})` }}>
                            <span className="text-white text-[11px] font-semibold leading-4 line-clamp-4">{p.text}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="p-6">
                  {aboutRows.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm" style={{ color: muted }}>Complète ton profil pour donner plus de contexte aux autres membres.</p>
                      <button onClick={openEditProfile} className="mt-3 px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: primary, color: "#fff" }}>Compléter mon profil</button>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      {aboutRows.map(([label, value, icon]) => (
                        <div key={label} className="rounded-2xl p-4 flex items-start gap-3" style={{ background: bg }}>
                          <span className="text-lg leading-none">{icon}</span>
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wider font-black" style={{ color: muted }}>{label}</div>
                            <div className="text-sm font-bold mt-1 break-words">{value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
          );
        })()}
      </main>


      <nav className="fixed bottom-0 left-0 right-0 z-40 bb-glass border-t" style={{ borderColor: "rgba(21,27,61,.08)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-xl mx-auto grid grid-cols-5 px-2">
          {nav.map(([key, Icon, label]) => (
            <button key={key} onClick={() => goTab(key)} className="py-3 flex flex-col items-center gap-1.5 rounded-2xl" style={{ minHeight: 48 }}>
              <div className="h-7 w-9 flex items-center justify-center rounded-xl" style={{ background: tab === key ? "rgba(225,107,93,.11)" : "transparent" }}>
                <Icon size={19} color={tab === key ? coral : muted} fill={tab === key && key === "discover" ? coral : "none"} />
              </div>
              <span className="text-[10px] font-black" style={{ color: tab === key ? primary : muted }}>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onMediaSelected(e, "photo")} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => onMediaSelected(e, "video")} />

      {composer && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-5" style={{ background: "rgba(21,27,61,.55)", backdropFilter: "blur(5px)" }} onClick={() => setComposer(false)}>
          <div className="bg-white w-full max-w-xl rounded-t-[30px] md:rounded-[30px] p-5 md:p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-black" style={{ color: primary }}>Créer une publication</h2><p className="text-xs mt-1" style={{ color: muted }}>Partage quelque chose d'utile, drôle ou inspirant.</p></div>
              <button onClick={() => setComposer(false)} className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: bg }}><X size={18} /></button>
            </div>
            <div className="flex gap-3 mt-5">
              <Avatar name={currentUser?.name || "Toi"} url={currentUser?.avatar_url} size={40} />
              <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="flex-1 min-h-32 rounded-2xl p-4 outline-none resize-none" style={{ background: bg }} placeholder="Écris ton message..." />
            </div>
            {composerMedia && <div className="mt-3 rounded-2xl overflow-hidden bg-black max-h-56">{composerMediaKind === "video" ? <video src={URL.createObjectURL(composerMedia)} controls className="w-full max-h-56 object-contain" /> : <img src={URL.createObjectURL(composerMedia)} alt="" className="w-full max-h-56 object-contain" />}</div>}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => pickMedia("photo")} className="rounded-xl py-3 font-bold" style={{ background: "#FFF3F1", color: coral }}><ImageIcon size={17} className="inline mr-1" />Ajouter une photo</button>
              <button onClick={() => pickMedia("video")} className="rounded-xl py-3 font-bold" style={{ background: "#EEF8F4", color: green }}><Camera size={17} className="inline mr-1" />Ajouter une vidéo</button>
            </div>
            <button onClick={publish} disabled={!draft.trim() && !composerMedia} className="w-full mt-4 rounded-xl py-3.5 text-white font-bold disabled:opacity-40" style={{ background: primary }}>Publier sur Baobab</button>
          </div>
        </div>
      )}

      {storyViewerIndex !== null && stories[storyViewerIndex] && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: "#000" }}>
          <style>{`
            @keyframes bbStoryBar { from { width: 0%; } to { width: 100%; } }
            .bb-story-bar-fill { animation: bbStoryBar 5s linear forwards; }
          `}</style>
          <div className="relative w-full h-full max-w-md mx-auto" style={{ background: `linear-gradient(160deg,${stories[storyViewerIndex].color},${primary})` }}>
            <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-15">🌍</div>

            {/* Barres de progression, une par story non-personnelle */}
            <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-10">
              {stories.map((s, i) => (
                !s.own && (
                  <div key={i} className="h-[3px] flex-1 rounded-full bg-white/25 overflow-hidden">
                    {i < storyViewerIndex && <div className="h-full w-full bg-white" />}
                    {i === storyViewerIndex && <div className="h-full bg-white bb-story-bar-fill" />}
                  </div>
                )
              ))}
            </div>

            <div className="absolute top-8 left-4 right-4 flex items-center gap-2.5 z-10">
              <div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-black border border-white/30">
                {stories[storyViewerIndex].initial}
              </div>
              <div className="text-white text-sm font-bold flex-1">{stories[storyViewerIndex].name}</div>
              <button onClick={closeStoryViewer} className="h-9 w-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
                <X size={18} color="#fff" />
              </button>
            </div>

            {/* Zones tactiles gauche/droite pour naviguer */}
            <button onClick={prevStory} className="absolute left-0 top-0 bottom-0 w-1/3 z-[5]" aria-label="Précédent" />
            <button onClick={nextStory} className="absolute right-0 top-0 bottom-0 w-1/3 z-[5]" aria-label="Suivant" />

            <div className="absolute inset-0 flex items-center justify-center px-10 text-center z-[2]">
              {stories[storyViewerIndex].text ? (
                <p className="text-white text-2xl font-bold leading-snug">{stories[storyViewerIndex].text}</p>
              ) : (
                <div className="text-white/70 text-sm">Moment partagé par {stories[storyViewerIndex].name}</div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 flex gap-2 z-10" style={{ background: "linear-gradient(180deg,transparent,rgba(0,0,0,.35))" }}>
              <input
                value={storyReply}
                onChange={(e) => setStoryReply(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendStoryReply()}
                placeholder={`Répondre à ${stories[storyViewerIndex].name}...`}
                className="flex-1 rounded-full px-4 py-2.5 text-sm text-white bg-white/15 backdrop-blur border border-white/25 outline-none placeholder-white/60"
              />
              <button onClick={sendStoryReply} className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#fff" }}>
                <Send size={16} color={primary} />
              </button>
            </div>
          </div>
        </div>
      )}

      {storyComposer && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-5" style={{ background: "rgba(21,27,61,.55)", backdropFilter: "blur(5px)" }} onClick={() => setStoryComposer(false)}>
          <div className="bg-white w-full max-w-md rounded-t-[30px] md:rounded-[30px] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-xl font-black" style={{ color: primary }}>Nouveau statut</h2><button onClick={() => setStoryComposer(false)}><X /></button></div>
            <textarea autoFocus value={storyText} onChange={(e) => setStoryText(e.target.value)} className="mt-5 w-full min-h-28 rounded-2xl p-4 outline-none resize-none" style={{ background: bg }} placeholder="Une pensée, une bonne nouvelle, un moment de ta journée…" />
            <button onClick={addStory} disabled={!storyText.trim()} className="w-full mt-4 rounded-xl py-3 text-white font-bold disabled:opacity-40" style={{ background: coral }}>Partager le statut</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = pas encore vérifié, null = pas connecté
  const [view, setView] = useState("loading"); // loading | form | feed | discover | matches | chat | stories
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
  const [showMenu, setShowMenu] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [typing, setTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesChannelRef = useRef(null);

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

  // Présence en ligne : heartbeat léger. Si les colonnes presence/last_seen
  // n'existent pas encore en base, l'interface continue simplement à fonctionner.
  useEffect(() => {
    if (!session?.user?.id) return;
    let alive = true;

    const heartbeat = async () => {
      const now = new Date().toISOString();
      setIsOnline(true);
      setLastSeen(now);
      try {
        await supabase.from("profiles").update({
          is_online: true,
          last_seen: now
        }).eq("user_id", session.user.id);
      } catch (_) {}
    };

    heartbeat();
    const timer = setInterval(heartbeat, 30000);

    const handleVisibility = async () => {
      if (document.visibilityState === "visible") heartbeat();
      else {
        setIsOnline(false);
        try {
          await supabase.from("profiles").update({
            is_online: false,
            last_seen: new Date().toISOString()
          }).eq("user_id", session.user.id);
        } catch (_) {}
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [session?.user?.id]);

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
      setView("feed");
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
        !hasBlocked(currentUser.id, p.id) &&
        !hasBlocked(p.id, currentUser.id)
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
        setView("feed");
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
    setCoverFile(null);
    setCoverPreview("");
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
    const editAgeNum = Number(editForm.age);
    if (Number.isNaN(editAgeNum) || editAgeNum < 18) { setError("Tu dois avoir au moins 18 ans."); return; }
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

      let coverUrl = currentUser.cover_url || null;
      if (coverFile) {
        coverUrl = await uploadPhoto(session.user.id, coverFile, "cover");
      }

      const payload = {
        name: editForm.name,
        cover_url: coverUrl,
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
      setCoverFile(null);
      setCoverPreview("");
      setError("");
      setView("feed");
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la mise à jour du profil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCreateProfile(e) {
    e.preventDefault();
    const ageNum = Number(form.age);
    if (!form.name || !form.age) { setError("Nom et âge sont requis."); return; }
    if (Number.isNaN(ageNum) || ageNum < 18) { setError("Tu dois avoir au moins 18 ans pour créer un profil."); return; }
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
      setView("feed");
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
          !hasBlocked(currentUser.id, p.id) &&
          !hasBlocked(p.id, currentUser.id)
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

  // Messages en direct + indicateur "en train d'écrire" pour la conversation active
  useEffect(() => {
    // on quitte une conversation : nettoyer les anciens canaux
    if (messagesChannelRef.current) {
      supabase.removeChannel(messagesChannelRef.current);
      messagesChannelRef.current = null;
    }
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }
    setOtherTyping(false);
    if (!currentUser || !activeMatch) return;

    const key = matchKey(currentUser.id, activeMatch.id);

    const msgChannel = supabase
      .channel(`messages:${key}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_key=eq.${key}` },
        (payload) => {
          setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
        }
      )
      .subscribe();
    messagesChannelRef.current = msgChannel;

    const typingChannel = supabase.channel(`typing:${key}`);
    typingChannel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.user_id === currentUser.id) return; // ignorer sa propre frappe
        setOtherTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3000);
      })
      .subscribe();
    typingChannelRef.current = typingChannel;

    return () => {
      if (messagesChannelRef.current) supabase.removeChannel(messagesChannelRef.current);
      if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [currentUser, activeMatch]);

  function broadcastTyping() {
    if (!currentUser || !typingChannelRef.current) return;
    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUser.id },
    });
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

  if (currentUser && ["feed", "stories", "profile", "discover", "matches"].includes(view)) {
    return <SocialShell currentUser={currentUser} setView={setView} handleSignOut={handleSignOut} candidates={candidates} getMatches={getMatches} openChat={openChat} handleLike={handleLike} handlePass={handlePass} profilePhotos={profilePhotos} openEditProfile={openEditProfile} />;
  }

  return (
    <div className="bb-app min-h-screen flex flex-col relative overflow-x-hidden" style={{ fontFamily: "'Manrope', system-ui, sans-serif", color: C.ink }}>
      <style>{`
        @keyframes bbGenericDrift { from { transform: scale(1.02); } to { transform: scale(1.06) translate3d(-1%, -1%, 0); } }
        .bb-generic-bg { animation: bbGenericDrift 26s ease-in-out alternate infinite; }
        .bb-generic-glass { background: rgba(255,255,255,.82) !important; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
        @media (prefers-reduced-motion: reduce) { .bb-app * { animation: none !important; transition: none !important; } }
      `}</style>
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none" style={{ background: "#F7F8FA" }} />
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-5 py-4 bb-generic-glass" style={{ borderBottom: `1px solid rgba(43,36,32,0.08)`, boxShadow: "0 1px 0 rgba(20,29,56,0.02)", position: "sticky", top: 0, zIndex: 10 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 20, color: C.indigo }}>
            Baobab
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: C.ochre, color: C.indigoDeep, fontWeight: 700 }}>
            prototype
          </span>
        </div>
        {currentUser && view !== "editProfile" && (
          <div className="flex items-center gap-1" style={{ position: "relative" }}>
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
            <button
              onClick={() => setShowMenu((v) => !v)}
              aria-label="Menu"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ color: C.indigo }}
            >
              <Menu size={18} />
            </button>
            {showMenu && (
              <div
                className="rounded-xl overflow-hidden bg-white"
                style={{ border: "1px solid rgba(43,36,32,0.1)", position: "absolute", top: 42, right: 0, minWidth: 210, zIndex: 20, boxShadow: "var(--bb-shadow-lg, 0 8px 24px rgba(20,29,56,0.18))" }}
              >
                <button
                  onClick={() => { setSettingsOpen(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left"
                  style={{ color: C.ink }}
                >
                  <Settings size={15} color={C.indigo} /> Paramètres
                </button>
                <button
                  onClick={() => { setPrivacyOpen(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left"
                  style={{ color: C.ink, borderTop: "1px solid rgba(43,36,32,0.08)" }}
                >
                  <Shield size={15} color={C.indigo} /> Politique de confidentialité
                </button>
                <button
                  onClick={() => { setAboutOpen(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left"
                  style={{ color: C.ink, borderTop: "1px solid rgba(43,36,32,0.08)" }}
                >
                  <Info size={15} color={C.indigo} /> À propos
                </button>
                <button
                  onClick={() => { setShowMenu(false); handleSignOut(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left"
                  style={{ color: C.clay, borderTop: "1px solid rgba(43,36,32,0.08)" }}
                >
                  <LogOut size={15} /> Se déconnecter
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="relative z-20 mx-5 mt-3 text-sm px-3 py-2 rounded-lg" style={{ background: "#fce8e0", color: C.clay }}>
          {error}
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col">
        {/* ---------- FORM (première connexion : pas encore de profil) ---------- */}
        {view === "form" && (
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
        )}

        {/* ---------- ÉDITION DE PROFIL ---------- */}
        {view === "editProfile" && editForm && (
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
        )}

        {/* ---------- DISCOVER ---------- */}
        {view === "discover" && currentUser && (
          <div className="p-6 max-w-md mx-auto w-full flex-1 flex flex-col items-center">
            {matchNotice && (
              <div className="bb-fade-in fixed inset-0 flex items-center justify-center z-20" style={{ background: "rgba(20,29,56,0.55)", backdropFilter: "blur(3px)" }}>
                <div className="bb-card p-6 text-center max-w-xs mx-4" style={{ boxShadow: "var(--bb-shadow-lg)" }}>
                  <Sparkles color={C.ochre} className="mx-auto mb-2" />
                  <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 22, color: C.indigo }}>C'est un match !</div>
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
                  <div className="bb-card bb-fade-in w-full overflow-hidden" style={{ position: "relative" }}>
                    <div style={{ position: "absolute", top: 12, right: 12, zIndex: 5 }}>
                      <button
                        onClick={() => setMenuOpenFor(menuOpenFor === p.id ? null : p.id)}
                        className="bb-icon-btn w-8 h-8 rounded-full flex items-center justify-center"
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
                      <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 26, color: "#fff" }}>{p.name}, {p.age}</div>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="bb-badge">{p.country}</span>
                        <span className="bb-badge">{p.languages}</span>
                        <span className="bb-badge">{p.city}</span>
                        <span className="bb-badge">Arrivé·e {p.arrived_since}</span>
                        {p.occupation && <span className="bb-badge">{p.occupation}</span>}
                        {p.education_level && <span className="bb-badge">{p.education_level}</span>}
                        {p.has_children && <span className="bb-badge">{p.has_children === "Oui" ? "A des enfants" : "Sans enfant"}</span>}
                      </div>
                      {p.interests && (
                        <p className="text-xs mb-2" style={{ color: "rgba(43,36,32,0.55)" }}>
                          <span style={{ fontWeight: 600 }}>Intérêts : </span>{p.interests}
                        </p>
                      )}
                      <p className="text-sm mb-4" style={{ color: "rgba(43,36,32,0.7)" }}>{p.bio || "—"}</p>
                      <div className="flex justify-center gap-4">
                        <button onClick={() => handlePass(p)} className="bb-btn bb-btn-pass w-14 h-14 rounded-full flex items-center justify-center">
                          <X />
                        </button>
                        <button onClick={() => handleLike(p)} className="bb-btn bb-btn-heart w-14 h-14 rounded-full flex items-center justify-center">
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
            <h2 style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 22, color: C.indigo }} className="mb-4">Mes matchs</h2>
            {getMatches().length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(43,36,32,0.55)" }}>Pas encore de match. Continue à découvrir des profils !</p>
            ) : (
              <div className="flex flex-col gap-2">
                {getMatches().map((m) => (
                  <button key={m.id} onClick={() => openChat(m)} className="bb-btn flex items-center gap-3 p-3 text-left" style={{ background: "#fff", border: "1px solid var(--bb-border)", borderRadius: "var(--bb-radius-md)", boxShadow: "var(--bb-shadow-sm)" }}>
                    <div style={{ position: "relative" }}>
                      <Avatar name={m.name} url={m.avatar_url} />
                      <Circle
                        size={10}
                        fill={m.is_online ? "#4CAF6D" : "#9aa0ab"}
                        color="transparent"
                        style={{ position: "absolute", bottom: -1, right: -1, background: "#fff", borderRadius: "50%" }}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{m.name}</div>
                      <div className="text-xs" style={{ color: "rgba(43,36,32,0.5)" }}>
                        {m.is_online ? "En ligne" : formatLastSeen(m.last_seen)} · {m.city}
                      </div>
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
              <button onClick={() => setView("feed")}><ArrowLeft size={18} /></button>
              <div style={{ position: "relative" }}>
                <Avatar name={activeMatch.name} url={activeMatch.avatar_url} size={34} />
                <Circle
                  size={10}
                  fill={activeMatch.is_online ? "#4CAF6D" : "#9aa0ab"}
                  color="transparent"
                  style={{ position: "absolute", bottom: -1, right: -1, background: "#fff", borderRadius: "50%" }}
                />
              </div>
              <div>
                <div className="text-sm font-semibold">{activeMatch.name}</div>
                <div className="text-xs" style={{ color: otherTyping ? C.clay : "rgba(43,36,32,0.45)" }}>
                  {otherTyping ? "en train d'écrire…" : activeMatch.is_online ? "En ligne" : formatLastSeen(activeMatch.last_seen)}
                </div>
              </div>
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

            <div className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-xs text-center mt-6" style={{ color: "rgba(43,36,32,0.45)" }}>Dites bonjour 👋</p>
              )}
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const showDaySeparator = !prev || formatDayLabel(prev.created_at) !== formatDayLabel(m.created_at);
                const isMine = m.from_id === currentUser.id;
                const groupedWithPrev = prev && !showDaySeparator && prev.from_id === m.from_id;
                return (
                  <React.Fragment key={m.id}>
                    {showDaySeparator && (
                      <div className="flex justify-center my-3">
                        <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(43,36,32,0.06)", color: "rgba(43,36,32,0.5)" }}>
                          {formatDayLabel(m.created_at)}
                        </span>
                      </div>
                    )}
                    <div
                      className="bb-fade-in max-w-[75%] text-sm px-3.5 py-2.5 rounded-2xl flex items-end gap-1.5"
                      style={{
                        ...(isMine
                          ? { alignSelf: "flex-end", background: C.indigo, color: C.sand, borderBottomRightRadius: 4, boxShadow: "var(--bb-shadow-sm)" }
                          : { alignSelf: "flex-start", background: C.sand, color: C.ink, borderBottomLeftRadius: 4 }),
                        marginTop: groupedWithPrev ? 2 : 10,
                      }}
                    >
                      <span>{m.text}</span>
                      <span className="text-[10px] flex-shrink-0 flex items-center gap-0.5" style={{ opacity: 0.6, whiteSpace: "nowrap" }}>
                        {formatMessageTime(m.created_at)}
                        {isMine && <CheckCheck size={12} />}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {messages.length === 0 && (
              <div className="px-4 pb-2 flex flex-col gap-1.5">
                {iceBreakers.map((ib) => (
                  <button key={ib} onClick={() => setMessageDraft(ib)} className="bb-btn text-left text-xs px-3 py-2.5" style={{ background: "#fff", border: "1px solid var(--bb-border)", borderRadius: "var(--bb-radius-sm)", color: C.indigo }}>
                    {ib}
                  </button>
                ))}
              </div>
            )}

            <div className="p-4 flex gap-2" style={{ borderTop: "1px solid rgba(43,36,32,0.08)", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
              <input
                value={messageDraft}
                onChange={(e) => { setMessageDraft(e.target.value); broadcastTyping(); }}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Écris un message..."
                className="bb-input flex-1 text-sm"
                style={{ borderRadius: 999, fontSize: 16, minHeight: 44 }}
              />
              <button onClick={sendMessage} className="bb-btn bb-btn-heart w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ minWidth: 44, minHeight: 44 }}>
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------- MODAL SIGNALEMENT ---------- */}
      {reportTarget && (
        <div className="bb-fade-in fixed inset-0 flex items-center justify-center z-30" style={{ background: "rgba(20,29,56,0.55)", backdropFilter: "blur(3px)" }}>
          <div className="bb-card p-6 max-w-xs mx-4 w-full" style={{ boxShadow: "var(--bb-shadow-lg)" }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: C.indigo }} className="mb-1">
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

      {/* ---------- MODAL PARAMÈTRES ---------- */}
      {settingsOpen && (
        <div className="bb-fade-in fixed inset-0 flex items-end justify-center z-30" style={{ background: "rgba(20,29,56,0.55)", backdropFilter: "blur(3px)" }} onClick={() => setSettingsOpen(false)}>
          <div className="bb-card p-6 w-full max-w-md" style={{ borderRadius: "20px 20px 0 0" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: C.indigo }} className="mb-4">
              Paramètres
            </div>
            <div className="flex items-center justify-between py-2.5" style={{ borderTop: "1px solid rgba(43,36,32,0.08)" }}>
              <div className="flex items-center gap-2 text-sm"><Circle size={14} color={C.acacia || C.ochre} /> Statut en ligne visible</div>
              <input type="checkbox" defaultChecked onChange={(e) => setIsOnline(e.target.checked)} />
            </div>
            <div className="flex items-center justify-between py-2.5" style={{ borderTop: "1px solid rgba(43,36,32,0.08)" }}>
              <div className="flex items-center gap-2 text-sm"><Bell size={14} color={C.ochre} /> Notifications</div>
              <input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center justify-between py-2.5" style={{ borderTop: "1px solid rgba(43,36,32,0.08)" }}>
              <div className="flex items-center gap-2 text-sm"><Moon size={14} color={C.indigo} /> Mode sombre</div>
              <span className="text-xs" style={{ color: "rgba(43,36,32,0.4)" }}>Bientôt</span>
            </div>
            <button onClick={() => { setSettingsOpen(false); setPrivacyOpen(true); }} className="w-full flex items-center justify-between py-3" style={{ borderTop: "1px solid rgba(43,36,32,0.08)", minHeight: 44 }}>
              <span className="flex items-center gap-2 text-sm"><Shield size={14} color={C.indigo} /> Politique de confidentialité</span>
              <ArrowLeft size={14} style={{ transform: "rotate(180deg)", color: "rgba(43,36,32,0.35)" }} />
            </button>
            <button onClick={() => { setSettingsOpen(false); setTermsOpen(true); }} className="w-full flex items-center justify-between py-3" style={{ borderTop: "1px solid rgba(43,36,32,0.08)", minHeight: 44 }}>
              <span className="flex items-center gap-2 text-sm"><Info size={14} color={C.indigo} /> Conditions d'utilisation</span>
              <ArrowLeft size={14} style={{ transform: "rotate(180deg)", color: "rgba(43,36,32,0.35)" }} />
            </button>
            <button onClick={() => setSettingsOpen(false)} className="w-full mt-4 py-3 rounded-full text-sm font-semibold" style={{ border: "1px solid rgba(43,36,32,0.15)", color: C.ink, minHeight: 44 }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ---------- MODAL POLITIQUE DE CONFIDENTIALITÉ ---------- */}
      {privacyOpen && (
        <div className="bb-fade-in fixed inset-0 flex items-end justify-center z-30" style={{ background: "rgba(20,29,56,0.55)", backdropFilter: "blur(3px)" }} onClick={() => setPrivacyOpen(false)}>
          <div className="bb-card p-6 w-full max-w-md" style={{ borderRadius: "20px 20px 0 0", maxHeight: "80vh", overflowY: "auto", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: C.indigo }} className="mb-3">
              Politique de confidentialité
            </div>
            <div className="text-sm" style={{ color: "rgba(43,36,32,0.72)" }}>
              <PrivacyPolicyContent />
            </div>
            <button onClick={() => setPrivacyOpen(false)} className="w-full py-3 mt-2 rounded-full text-sm font-semibold" style={{ border: "1px solid rgba(43,36,32,0.15)", color: C.ink, minHeight: 44 }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ---------- MODAL CONDITIONS D'UTILISATION ---------- */}
      {termsOpen && (
        <div className="bb-fade-in fixed inset-0 flex items-end justify-center z-30" style={{ background: "rgba(20,29,56,0.55)", backdropFilter: "blur(3px)" }} onClick={() => setTermsOpen(false)}>
          <div className="bb-card p-6 w-full max-w-md" style={{ borderRadius: "20px 20px 0 0", maxHeight: "80vh", overflowY: "auto", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: C.indigo }} className="mb-3">
              Conditions d'utilisation
            </div>
            <div className="text-sm" style={{ color: "rgba(43,36,32,0.72)" }}>
              <TermsOfServiceContent />
            </div>
            <button onClick={() => setTermsOpen(false)} className="w-full py-3 mt-2 rounded-full text-sm font-semibold" style={{ border: "1px solid rgba(43,36,32,0.15)", color: C.ink, minHeight: 44 }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ---------- MODAL À PROPOS ---------- */}
      {aboutOpen && (
        <div className="bb-fade-in fixed inset-0 flex items-end justify-center z-30" style={{ background: "rgba(20,29,56,0.55)", backdropFilter: "blur(3px)" }} onClick={() => setAboutOpen(false)}>
          <div className="bb-card p-6 w-full max-w-md text-center" style={{ borderRadius: "20px 20px 0 0" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 24, color: C.indigo }} className="mb-1">
              Baobab
            </div>
            <p className="text-sm mb-4" style={{ color: "rgba(43,36,32,0.6)" }}>
              L'app de rencontres pensée pour la communauté qui s'installe au Canada.
            </p>
            <p style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.06em", color: "rgba(43,36,32,0.45)" }}>
              BAOBAB — BY LESSI PATRICK
            </p>
            <button onClick={() => setAboutOpen(false)} className="w-full mt-4 py-2.5 rounded-full text-sm font-semibold" style={{ border: "1px solid rgba(43,36,32,0.15)", color: C.ink }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      {currentUser && view !== "form" && view !== "editProfile" && (
        <div className="relative z-20 flex justify-around py-2.5 px-3 bb-generic-glass" style={{ borderTop: "1px solid rgba(43,36,32,0.08)", boxShadow: "0 -1px 0 rgba(20,29,56,0.02)" }}>
          <button onClick={() => setView("discover")} className="bb-nav-btn flex flex-col items-center gap-1 text-xs py-1.5 px-4 rounded-xl"
            style={{ color: view === "discover" ? C.clay : "rgba(43,36,32,0.45)", background: view === "discover" ? "rgba(193,97,61,0.08)" : "transparent", fontWeight: view === "discover" ? 700 : 500 }}>
            <Heart size={18} fill={view === "discover" ? C.clay : "none"} /> Découvrir
          </button>
          <button onClick={() => setView("matches")} className="bb-nav-btn flex flex-col items-center gap-1 text-xs py-1.5 px-4 rounded-xl"
            style={{ color: view === "matches" ? C.clay : "rgba(43,36,32,0.45)", background: view === "matches" ? "rgba(193,97,61,0.08)" : "transparent", fontWeight: view === "matches" ? 700 : 500 }}>
            <MessageCircle size={18} /> Matchs
          </button>
          <button onClick={handleSignOut} className="bb-nav-btn flex flex-col items-center gap-1 text-xs py-1.5 px-4 rounded-xl" style={{ color: "rgba(43,36,32,0.45)", fontWeight: 500 }}>
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
