import React, { useState, useEffect, useRef } from "react";
import { Home, Heart, X, MessageCircle, LogOut, MoreVertical, Settings, UserRound, Search, Bell, Camera } from "lucide-react";
import Avatar from "./Avatar";
import { supabase } from "../supabaseClient";
import { primary, green, coral, gold, bg, muted, buttonBase } from "./social/theme";
import FeedTab from "./social/FeedTab";
import DiscoverTab from "./social/DiscoverTab";
import MatchesTab from "./social/MatchesTab";
import StoriesTab from "./social/StoriesTab";
import ProfileTab from "./social/ProfileTab";
import PostComposerModal from "./social/PostComposerModal";
import StoryViewerModal from "./social/StoryViewerModal";
import StoryComposerModal from "./social/StoryComposerModal";

const STORY_COLORS = ["#E56B5D", "#2F8F6B", "#5667A9", "#F2B84B", "#C1613D", "#1E2A4F"];
function colorForProfile(id) {
  let hash = 0;
  for (let i = 0; i < String(id).length; i++) hash = (hash * 31 + String(id).charCodeAt(i)) >>> 0;
  return STORY_COLORS[hash % STORY_COLORS.length];
}

export default function SocialShell({
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
  const [posts, setPosts] = useState([]);
  const [liked, setLiked] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commenting, setCommenting] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [menu, setMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [stories, setStories] = useState([
    { name: "Votre statut", initial: "+", own: true, color: "#151B3D" },
  ]);
  const [storyComposer, setStoryComposer] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [storyMedia, setStoryMedia] = useState(null);
  const [storyMediaKind, setStoryMediaKind] = useState("");
  const [storyMediaError, setStoryMediaError] = useState("");
  const [storyUploading, setStoryUploading] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(null);
  const [viewedStories, setViewedStories] = useState({});
  const [storyReply, setStoryReply] = useState("");
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const storyPhotoInputRef = useRef(null);
  const storyVideoInputRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    let alive = true;
    supabase
      .from("stories")
      .select("id, profile_id, text, media_url, media_kind, created_at, profile:profile_id(name, avatar_url)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) { console.error(error); return; }
        const seen = new Set();
        const latestPerProfile = [];
        for (const row of data || []) {
          if (seen.has(row.profile_id)) continue;
          seen.add(row.profile_id);
          latestPerProfile.push(row);
        }
        const ownIdx = latestPerProfile.findIndex((s) => s.profile_id === currentUser.id);
        const ownRow = ownIdx >= 0 ? latestPerProfile.splice(ownIdx, 1)[0] : null;
        const toEntry = (row, isOwn) => {
          const name = isOwn ? (currentUser.name || "Toi") : (row.profile?.name || "?");
          const profileId = isOwn ? currentUser.id : row.profile_id;
          return {
            id: row?.id,
            profile_id: profileId,
            own: isOwn,
            name,
            initial: (isOwn ? (currentUser.name || "?") : name).trim().charAt(0).toUpperCase(),
            color: colorForProfile(profileId),
            text: row?.text || "",
            media_url: row?.media_url || null,
            media_kind: row?.media_kind || null,
          };
        };
        setStories([toEntry(ownRow, true), ...latestPerProfile.map((r) => toEntry(r, false))]);
      });
    return () => { alive = false; };
  }, [currentUser]);

  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [swipeExit, setSwipeExit] = useState(null); // "like" | "pass" | null
  const [discoverPhotoIndex, setDiscoverPhotoIndex] = useState(0);
  const swipeStartRef = useRef(0);

  const matches = getMatches();

  const firstName = currentUser?.name?.split(" ")[0] || "toi";

  // ---------- Page d'accueil : données dérivées du profil réel, sans appel Supabase additionnel ----------
  const growthStages = ["Graine", "Pousse", "Jeune baobab", "Baobab en croissance", "Baobab épanoui"];
  const growthStageEmojis = ["🌱", "🌿", "🌳", "🌴", "🦒"];
  const ownPhotoCount = profilePhotos[currentUser?.id]?.length || 0;
  const profileCompletionChecks = [
    Boolean(currentUser?.avatar_url || ownPhotoCount > 0),
    Boolean(currentUser?.bio?.trim()),
    Boolean(currentUser?.occupation?.trim()),
    Boolean(currentUser?.interests?.trim()),
    ownPhotoCount >= 3,
    matches.length > 0,
  ];
  const completedSteps = profileCompletionChecks.filter(Boolean).length;
  const totalSteps = profileCompletionChecks.length;
  const growthPct = Math.round((completedSteps / totalSteps) * 100);
  const growthStageIndex = Math.min(growthStages.length - 1, Math.floor((completedSteps / totalSteps) * growthStages.length));

  const nearbyMembers = currentUser?.city
    ? candidates.filter((p) => p.city && p.city.trim().toLowerCase() === currentUser.city.trim().toLowerCase())
    : [];

  const communities = Object.entries(
    candidates.reduce((acc, p) => {
      const city = (p.city || "").trim();
      if (!city) return acc;
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const newArrivals = candidates.filter((p) => p.arrived_since && p.arrived_since.trim());

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

  const pickStoryMedia = (kind) => {
    if (kind === "photo") storyPhotoInputRef.current?.click();
    else storyVideoInputRef.current?.click();
  };

  const onStoryMediaSelected = (e, kind) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (kind === "video" && file.size > 25 * 1024 * 1024) {
      setStoryMediaError("Vidéo trop volumineuse (25 Mo max).");
      e.target.value = "";
      return;
    }
    setStoryMediaError("");
    setStoryMedia(file);
    setStoryMediaKind(kind);
    e.target.value = "";
  };

  const uploadStoryMedia = async (profileId, file) => {
    const ext = file.name.split(".").pop();
    const path = `${profileId}/story-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  const addStory = async () => {
    const text = storyText.trim();
    if (!text && !storyMedia) return;
    if (!currentUser) return;
    setStoryUploading(true);
    try {
      let mediaUrl = null;
      const mediaKind = storyMedia ? storyMediaKind : null;
      if (storyMedia) mediaUrl = await uploadStoryMedia(currentUser.user_id, storyMedia);
      const { data, error } = await supabase
        .from("stories")
        .insert({ profile_id: currentUser.id, text: text || null, media_url: mediaUrl, media_kind: mediaKind })
        .select()
        .single();
      if (error) throw error;
      setStories((prev) => [
        {
          id: data.id,
          profile_id: currentUser.id,
          own: true,
          name: currentUser.name || "Toi",
          initial: (currentUser.name || "?").trim().charAt(0).toUpperCase(),
          color: colorForProfile(currentUser.id),
          text,
          media_url: mediaUrl,
          media_kind: mediaKind,
        },
        ...prev.filter((s) => !s.own),
      ]);
      setStoryText("");
      setStoryMedia(null);
      setStoryMediaKind("");
      setStoryMediaError("");
      setStoryComposer(false);
    } catch (e) {
      console.error(e);
      setStoryMediaError("Impossible de publier le statut. Réessaie.");
    } finally {
      setStoryUploading(false);
    }
  };

  const openStory = (index) => {
    const s = stories[index];
    if (s?.own && !s.text && !s.media_url) { setStoryComposer(true); return; }
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

  const deleteOwnStory = async () => {
    const s = stories[storyViewerIndex];
    if (!s?.own || !s?.id) { closeStoryViewer(); return; }
    try {
      const { error } = await supabase.from("stories").delete().eq("id", s.id);
      if (error) throw error;
      setStories((prev) => prev.map((st) =>
        st.own ? { ...st, id: undefined, text: "", media_url: null, media_kind: null } : st
      ));
    } catch (e) {
      console.error(e);
    }
    closeStoryViewer();
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
            <button onClick={() => { setNotificationsOpen((v) => !v); setMenu(false); }} aria-label="Notifications" className={`${buttonBase} h-11 w-11 rounded-2xl hidden sm:flex items-center justify-center relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1`} style={{ background: bg }}>
              <Bell size={19} color={primary} />
            </button>
            {notificationsOpen && (
              <div className="absolute right-12 top-14 w-80 bg-white rounded-2xl border shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between px-2 pb-2"><b>Notifications</b></div>
                <div className="p-6 text-center">
                  <Bell size={22} className="mx-auto mb-2" color={muted} />
                  <p className="text-xs" style={{ color: muted }}>Aucune notification pour l'instant.</p>
                </div>
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
          <FeedTab
            currentUser={currentUser}
            stories={stories}
            viewedStories={viewedStories}
            openStory={openStory}
            setStoryComposer={setStoryComposer}
            growthStages={growthStages}
            growthStageEmojis={growthStageEmojis}
            growthStageIndex={growthStageIndex}
            growthPct={growthPct}
            completedSteps={completedSteps}
            totalSteps={totalSteps}
            openEditProfile={openEditProfile}
            candidates={candidates}
            handleLike={handleLike}
            handlePass={handlePass}
            nearbyMembers={nearbyMembers}
            newArrivals={newArrivals}
            communities={communities}
            matches={matches}
            openChat={openChat}
            goTab={goTab}
            setSearch={setSearch}
          />
        )}

        {tab === "discover" && (
          <DiscoverTab
            filteredPeople={filteredPeople}
            topPerson={topPerson}
            topPhotos={topPhotos}
            discoverPhotoIndex={discoverPhotoIndex}
            setDiscoverPhotoIndex={setDiscoverPhotoIndex}
            swipeX={swipeX}
            swipeExit={swipeExit}
            swiping={swiping}
            onSwipeStart={onSwipeStart}
            onSwipeMove={onSwipeMove}
            onSwipeEnd={onSwipeEnd}
            decideSwipe={decideSwipe}
            currentUser={currentUser}
          />
        )}

        {tab === "matches" && (
          <MatchesTab matches={matches} goTab={goTab} openChat={openChat} />
        )}

        {tab === "stories" && (
          <StoriesTab stories={stories} viewedStories={viewedStories} openStory={openStory} setStoryComposer={setStoryComposer} />
        )}

        {tab === "profile" && (
          <ProfileTab
            currentUser={currentUser}
            posts={posts}
            openEditProfile={openEditProfile}
            matches={matches}
            candidates={candidates}
            profileTab={profileTab}
            setProfileTab={setProfileTab}
            setComposer={setComposer}
            goTab={goTab}
          />
        )}
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
      <PostComposerModal
        composer={composer}
        setComposer={setComposer}
        currentUser={currentUser}
        draft={draft}
        setDraft={setDraft}
        composerMedia={composerMedia}
        composerMediaKind={composerMediaKind}
        pickMedia={pickMedia}
        onMediaSelected={onMediaSelected}
        photoInputRef={photoInputRef}
        videoInputRef={videoInputRef}
        publish={publish}
      />

      <StoryViewerModal
        storyViewerIndex={storyViewerIndex}
        stories={stories}
        closeStoryViewer={closeStoryViewer}
        prevStory={prevStory}
        nextStory={nextStory}
        deleteOwnStory={deleteOwnStory}
        storyReply={storyReply}
        setStoryReply={setStoryReply}
        sendStoryReply={sendStoryReply}
      />

      <StoryComposerModal
        storyComposer={storyComposer}
        setStoryComposer={setStoryComposer}
        storyText={storyText}
        setStoryText={setStoryText}
        storyMedia={storyMedia}
        setStoryMedia={setStoryMedia}
        storyMediaKind={storyMediaKind}
        setStoryMediaKind={setStoryMediaKind}
        storyMediaError={storyMediaError}
        storyUploading={storyUploading}
        pickStoryMedia={pickStoryMedia}
        onStoryMediaSelected={onStoryMediaSelected}
        storyPhotoInputRef={storyPhotoInputRef}
        storyVideoInputRef={storyVideoInputRef}
        addStory={addStory}
      />
    </div>
  );
}
