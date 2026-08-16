import React, { useState, useEffect, useCallback, useRef } from "react";
import { Home, Heart, X, MessageCircle, LogOut, ArrowLeft, Send, Loader2, Sparkles, MoreVertical, Flag, Ban, Settings, Shield, Info, Moon, Image as ImageIcon, CheckCheck, Circle, UserRound, Camera, Menu, Search, Bell } from "lucide-react";
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


function SocialShell({ currentUser, setView, handleSignOut }) {
  const [tab, setTab] = useState("feed");
  const [composer, setComposer] = useState(false);
  const [draft, setDraft] = useState("");
  const [posts, setPosts] = useState([
    { id: 1, name: "Sarah Mbarga", initial: "S", place: "Montréal", time: "12 min", text: "Belle journée à Montréal ☀️ Qui connaît un bon endroit pour bruncher ce week-end ?", likes: 128, comments: 24, color: "#E56B5D" },
    { id: 2, name: "David N.", initial: "D", place: "Québec", time: "38 min", text: "Petit souvenir de voyage. La vie est plus belle quand on découvre de nouvelles personnes 🌍", likes: 76, comments: 11, color: "#5667A9", media: true },
  ]);
  const [liked, setLiked] = useState({});
  const [commenting, setCommenting] = useState(null);
  const [comment, setComment] = useState("");
  const [menu, setMenu] = useState(false);

  const primary = "#151B3D", green = "#2F8F6B", coral = "#E56B5D", gold = "#F2B84B", bg = "#F7F8FC", muted = "#7D8194";
  const stories = [{name:"Votre statut", initial:"+", own:true},{name:"Sarah",initial:"S",color:coral},{name:"Brenda",initial:"B",color:green},{name:"David",initial:"D",color:"#5667A9"},{name:"Mireille",initial:"M",color:gold}];
  const chats = [
    {name:"Sarah Mbarga", initial:"S", text:"Tu vas bien aujourd'hui ? 😊", time:"14:32", unread:2, online:true, color:coral},
    {name:"Brenda", initial:"B", text:"À demain !", time:"13:21", unread:0, online:true, color:green},
    {name:"David N.", initial:"D", text:"Merci beaucoup", time:"Hier", unread:0, online:false, color:"#5667A9"},
  ];
  const publish = () => {
    if (!draft.trim()) return;
    setPosts([{id:Date.now(), name:currentUser?.name || "Patrick", initial:(currentUser?.name||"P")[0], place:"Québec", time:"à l'instant", text:draft.trim(), likes:0, comments:0, color:green}, ...posts]);
    setDraft(""); setComposer(false);
  };
  const nav = [
    ["feed", Home, "Fil"],["matches", MessageCircle, "Discussions"],["stories", Camera, "Statuts"],["discover", Heart, "Découvrir"],["profile", UserRound, "Profil"]
  ];
  return <div className="min-h-screen" style={{background:bg,color:"#20243A",fontFamily:"'Manrope',system-ui,sans-serif"}}>
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b" style={{borderColor:"rgba(21,27,61,.08)"}}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg" style={{background:`linear-gradient(135deg,${coral},${gold})`}}>B</div>
          <div><div className="text-xl font-black" style={{color:primary}}>Baobab</div><div className="text-[9px] uppercase tracking-[.22em] font-bold" style={{color:muted}}>by Lessi Patrick</div></div>
        </div>
        <div className="hidden md:flex items-center gap-2 rounded-2xl px-4 py-2 w-72" style={{background:bg}}><Search size={17} color={muted}/><input className="bg-transparent outline-none text-sm w-full" placeholder="Rechercher sur Baobab..."/></div>
        <div className="flex items-center gap-2">
          <button className="h-10 w-10 rounded-full hidden sm:flex items-center justify-center" style={{background:bg}}><Bell size={18} color={primary}/></button>
          <button onClick={()=>setMenu(!menu)} className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold" style={{background:primary}}>{(currentUser?.name||"P")[0]}</button>
          {menu && <div className="absolute right-4 top-16 w-64 bg-white rounded-2xl shadow-2xl border p-2" style={{borderColor:"rgba(21,27,61,.08)"}}>
            <div className="rounded-xl p-3 mb-1" style={{background:primary}}><div className="text-white font-bold">{currentUser?.name||"Patrick"}</div><div className="text-white/60 text-xs">🟢 En ligne</div></div>
            <button className="w-full text-left rounded-xl px-3 py-3 text-sm hover:bg-slate-50"><Settings size={16} className="inline mr-3"/>Paramètres</button>
            <button className="w-full text-left rounded-xl px-3 py-3 text-sm hover:bg-slate-50"><Shield size={16} className="inline mr-3"/>Confidentialité</button>
            <button onClick={handleSignOut} className="w-full text-left rounded-xl px-3 py-3 text-sm" style={{color:coral}}><LogOut size={16} className="inline mr-3"/>Déconnexion</button>
          </div>}
        </div>
      </div>
    </header>

    <main className="max-w-6xl mx-auto px-3 md:px-6 pb-24 pt-5">
      {tab === "feed" && <div className="grid lg:grid-cols-[1fr_310px] gap-6">
        <section>
          <div className="mb-5"><h1 className="text-3xl font-black" style={{color:primary}}>Ton fil ✨</h1><p className="text-sm mt-1" style={{color:muted}}>Découvre ce que ta communauté partage aujourd'hui.</p></div>
          <div className="bg-white rounded-3xl p-4 border shadow-sm mb-5" style={{borderColor:"rgba(21,27,61,.07)"}}>
            <div className="flex gap-3"><Avatar name={currentUser?.name||"Patrick"} url={currentUser?.avatar_url} size={44}/><button onClick={()=>setComposer(true)} className="flex-1 rounded-2xl text-left px-4 text-sm" style={{background:bg,color:muted}}>Quoi de neuf, {currentUser?.name?.split(" ")[0]||"Patrick"} ?</button></div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button onClick={()=>setComposer(true)} className="rounded-xl py-2 text-sm font-bold" style={{background:"#FFF3F1",color:coral}}><ImageIcon size={16} className="inline mr-1"/>Photo</button>
              <button onClick={()=>setComposer(true)} className="rounded-xl py-2 text-sm font-bold" style={{background:"#EEF8F4",color:green}}><Camera size={16} className="inline mr-1"/>Vidéo</button>
              <button onClick={()=>setComposer(true)} className="rounded-xl py-2 text-sm font-bold" style={{background:"#FFF8E8",color:"#A87414"}}>✍ Texte</button>
            </div>
          </div>
          {posts.map(post=><article key={post.id} className="bg-white rounded-3xl border shadow-sm mb-5 overflow-hidden" style={{borderColor:"rgba(21,27,61,.07)"}}>
            <div className="p-4 flex items-center gap-3"><Avatar name={post.initial} color={post.color} size={44}/><div className="flex-1"><div className="font-bold text-sm">{post.name}</div><div className="text-xs" style={{color:muted}}>{post.place} · {post.time} · 🟢</div></div><MoreVertical size={19} color={muted}/></div>
            <div className="px-4 pb-4 text-[15px] leading-6">{post.text}</div>
            {post.media && <div className="h-72 flex items-center justify-center text-white relative" style={{background:`linear-gradient(135deg,${primary},${post.color})`}}><div className="text-center"><div className="text-7xl">🌍</div><div className="font-bold">Souvenir de voyage</div></div></div>}
            <div className="px-4 py-3 flex justify-between text-xs" style={{color:muted}}><span>{post.likes+(liked[post.id]?1:0)} J'aime</span><span>{post.comments} commentaires</span></div>
            <div className="grid grid-cols-3 border-t" style={{borderColor:"rgba(21,27,61,.07)"}}>
              <button onClick={()=>setLiked({...liked,[post.id]:!liked[post.id]})} className="py-3 text-sm font-bold" style={{color:liked[post.id]?coral:muted}}><Heart size={17} className="inline mr-1" fill={liked[post.id]?coral:"none"}/>J'aime</button>
              <button onClick={()=>setCommenting(commenting===post.id?null:post.id)} className="py-3 text-sm font-bold" style={{color:muted}}><MessageCircle size={17} className="inline mr-1"/>Commenter</button>
              <button className="py-3 text-sm font-bold" style={{color:muted}}>↗ Partager</button>
            </div>
            {commenting===post.id && <div className="p-3 border-t flex gap-2" style={{borderColor:"rgba(21,27,61,.07)"}}><input value={comment} onChange={e=>setComment(e.target.value)} className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{background:bg}} placeholder="Écrire un commentaire..."/><button className="w-10 rounded-xl text-white" style={{background:green}}><Send size={16}/></button></div>}
          </article>)}
        </section>
        <aside className="hidden lg:block"><div className="rounded-3xl p-5 text-white shadow-xl" style={{background:`linear-gradient(145deg,${primary},#2B3766)`}}><div className="text-xs uppercase tracking-[.2em] text-white/60">Bienvenue</div><div className="text-2xl font-black mt-2">Ta communauté.</div><p className="text-sm text-white/70 mt-2 leading-6">Partage, échange et crée de vraies connexions avec Baobab.</p><button onClick={()=>setTab("discover")} className="mt-5 rounded-xl px-4 py-2.5 font-bold" style={{background:gold,color:primary}}>Découvrir</button></div></aside>
      </div>}

      {tab === "matches" && <section className="max-w-2xl mx-auto"><h1 className="text-3xl font-black" style={{color:primary}}>Discussions 💬</h1><p className="text-sm mt-1 mb-5" style={{color:muted}}>Tes conversations récentes.</p><div className="bg-white rounded-3xl border shadow-sm overflow-hidden" style={{borderColor:"rgba(21,27,61,.07)"}}>{chats.map((c,i)=><button key={c.name} onClick={()=>setView("matches")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50" style={{borderBottom:i<chats.length-1?"1px solid rgba(21,27,61,.06)":"none"}}><div className="relative"><Avatar name={c.initial} color={c.color} size={50}/>{c.online&&<span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white" style={{background:"#27C56D"}}/>}</div><div className="flex-1 min-w-0"><div className="flex justify-between"><b className="text-sm">{c.name}</b><span className="text-[11px]" style={{color:muted}}>{c.time}</span></div><div className="text-sm truncate mt-1" style={{color:muted}}>{c.text}</div></div>{c.unread>0&&<span className="h-6 min-w-6 px-1 rounded-full text-xs text-white flex items-center justify-center font-bold" style={{background:coral}}>{c.unread}</span>}</button>)}</div></section>}

      {tab === "stories" && <section><h1 className="text-3xl font-black" style={{color:primary}}>Statuts 📸</h1><p className="text-sm mt-1 mb-5" style={{color:muted}}>Les moments partagés par ta communauté.</p><div className="flex gap-3 overflow-x-auto pb-3">{stories.map(s=><button key={s.name} className="shrink-0 w-28 bg-white rounded-2xl border p-2 text-left shadow-sm" style={{borderColor:"rgba(21,27,61,.07)"}}><div className="h-32 rounded-xl flex items-end p-2" style={{background:s.own?`linear-gradient(160deg,${primary},${green})`:`linear-gradient(160deg,${s.color},${primary})`}}><span className="h-9 w-9 rounded-full bg-white/25 text-white flex items-center justify-center font-black">{s.initial}</span></div><div className="text-xs font-bold mt-2 truncate">{s.name}</div></button>)}</div><button onClick={()=>setComposer(true)} className="mt-5 rounded-2xl px-5 py-3 text-white font-bold" style={{background:coral}}><Camera size={17} className="inline mr-2"/>Ajouter un statut</button></section>}

      {tab === "discover" && <section className="max-w-xl mx-auto"><h1 className="text-3xl font-black mb-5" style={{color:primary}}>Découvrir ❤️</h1><div className="bg-white rounded-[32px] overflow-hidden shadow-xl border" style={{borderColor:"rgba(21,27,61,.07)"}}><div className="h-[470px] flex items-end p-5 text-white relative" style={{background:`linear-gradient(160deg,${primary},${green},${gold})`}}><div className="absolute inset-0 flex items-center justify-center text-8xl">🌍</div><div className="relative"><div className="text-3xl font-black">Sarah, 28</div><div className="text-white/80">📍 Montréal · 🇨🇲 Cameroun</div><p className="mt-3 text-sm text-white/80">J'aime voyager, rencontrer du monde et découvrir de nouveaux endroits.</p></div></div><div className="flex justify-center gap-5 p-5"><button className="h-16 w-16 rounded-full border-2 flex items-center justify-center"><X size={28}/></button><button className="h-16 w-16 rounded-full text-white flex items-center justify-center shadow-lg" style={{background:coral}}><Heart size={28} fill="white"/></button></div></div></section>}

      {tab === "profile" && <section className="max-w-2xl mx-auto"><div className="bg-white rounded-3xl overflow-hidden border shadow-sm" style={{borderColor:"rgba(21,27,61,.07)"}}><div className="h-48 relative" style={{background:`linear-gradient(135deg,${primary},${green},${coral})`}}><button className="absolute right-4 top-4 rounded-xl bg-white/20 text-white px-3 py-2 text-xs font-bold">Modifier</button><div className="absolute -bottom-10 left-5"><Avatar name={currentUser?.name||"Patrick"} url={currentUser?.avatar_url} size={86}/></div></div><div className="pt-14 p-5"><div className="flex items-center gap-2"><h1 className="text-2xl font-black" style={{color:primary}}>{currentUser?.name||"Patrick"}</h1><span className="h-3 w-3 rounded-full" style={{background:"#27C56D"}}/></div><p className="text-sm mt-1" style={{color:muted}}>🟢 En ligne · Québec</p><div className="grid grid-cols-3 gap-2 mt-5 text-center">{[["124","Abonnés"],["87","Abonnements"],["32","Publications"]].map(x=><div className="rounded-2xl p-3" style={{background:bg}} key={x[1]}><b className="text-lg" style={{color:primary}}>{x[0]}</b><div className="text-[11px]" style={{color:muted}}>{x[1]}</div></div>)}</div></div></div></section>}
    </main>

    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t" style={{borderColor:"rgba(21,27,61,.08)"}}><div className="max-w-xl mx-auto grid grid-cols-5">{nav.map(([key,Icon,label])=><button key={key} onClick={()=>setTab(key)} className="py-2.5 flex flex-col items-center gap-1"><Icon size={20} color={tab===key?coral:muted} fill={tab===key&&key==="discover"?coral:"none"}/><span className="text-[10px] font-bold" style={{color:tab===key?coral:muted}}>{label}</span></button>)}</div></nav>

    {composer && <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{background:"rgba(21,27,61,.55)"}}><div className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl p-5 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black" style={{color:primary}}>Créer une publication</h2><p className="text-xs mt-1" style={{color:muted}}>Partage quelque chose avec Baobab.</p></div><button onClick={()=>setComposer(false)}><X/></button></div><textarea value={draft} onChange={e=>setDraft(e.target.value)} className="mt-5 w-full min-h-32 rounded-2xl p-4 outline-none resize-none" style={{background:bg}} placeholder="Écris quelque chose..."/><div className="grid grid-cols-2 gap-2 mt-3"><button className="rounded-xl py-3 font-bold" style={{background:"#FFF3F1",color:coral}}><ImageIcon size={17} className="inline mr-1"/>Photo</button><button className="rounded-xl py-3 font-bold" style={{background:"#EEF8F4",color:green}}><Camera size={17} className="inline mr-1"/>Vidéo</button></div><button onClick={publish} className="w-full mt-4 rounded-xl py-3 text-white font-bold" style={{background:primary}}>Publier</button></div></div>}
  </div>;
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

  if (currentUser && ["feed", "stories", "profile"].includes(view)) {
    return <SocialShell currentUser={currentUser} setView={setView} handleSignOut={handleSignOut} />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.sand, fontFamily: "'Manrope', system-ui, sans-serif", color: C.ink }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid rgba(43,36,32,0.08)`, background: "#fff", boxShadow: "0 1px 0 rgba(20,29,56,0.02)", position: "sticky", top: 0, zIndex: 10 }}>
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
              <button onClick={() => setView("matches")}><ArrowLeft size={18} /></button>
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

            <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-xs text-center mt-6" style={{ color: "rgba(43,36,32,0.45)" }}>Dites bonjour 👋</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className="bb-fade-in max-w-[75%] text-sm px-3.5 py-2.5 rounded-2xl"
                  style={m.from_id === currentUser.id
                    ? { alignSelf: "flex-end", background: C.indigo, color: C.sand, borderBottomRightRadius: 4, boxShadow: "var(--bb-shadow-sm)" }
                    : { alignSelf: "flex-start", background: C.sand, color: C.ink, borderBottomLeftRadius: 4 }}>
                  {m.text}
                </div>
              ))}
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

            <div className="p-4 flex gap-2" style={{ borderTop: "1px solid rgba(43,36,32,0.08)" }}>
              <input
                value={messageDraft}
                onChange={(e) => { setMessageDraft(e.target.value); broadcastTyping(); }}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Écris un message..."
                className="bb-input flex-1 text-sm"
                style={{ borderRadius: 999 }}
              />
              <button onClick={sendMessage} className="bb-btn bb-btn-heart w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
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
            <button onClick={() => setSettingsOpen(false)} className="w-full mt-4 py-2.5 rounded-full text-sm font-semibold" style={{ border: "1px solid rgba(43,36,32,0.15)", color: C.ink }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ---------- MODAL POLITIQUE DE CONFIDENTIALITÉ ---------- */}
      {privacyOpen && (
        <div className="bb-fade-in fixed inset-0 flex items-end justify-center z-30" style={{ background: "rgba(20,29,56,0.55)", backdropFilter: "blur(3px)" }} onClick={() => setPrivacyOpen(false)}>
          <div className="bb-card p-6 w-full max-w-md" style={{ borderRadius: "20px 20px 0 0", maxHeight: "75vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: C.indigo }} className="mb-3">
              Politique de confidentialité
            </div>
            <p className="text-sm mb-2.5" style={{ color: "rgba(43,36,32,0.65)" }}>
              <b style={{ color: C.ink }}>Ce que nous gardons.</b> Ton profil, tes photos, tes likes/passes et tes messages sont stockés de façon sécurisée pour faire fonctionner Baobab.
            </p>
            <p className="text-sm mb-2.5" style={{ color: "rgba(43,36,32,0.65)" }}>
              <b style={{ color: C.ink }}>Statut en ligne.</b> Les autres membres peuvent voir si tu es en ligne et quand tu écris. Tu peux le désactiver dans Paramètres.
            </p>
            <p className="text-sm mb-2.5" style={{ color: "rgba(43,36,32,0.65)" }}>
              <b style={{ color: C.ink }}>Signalement &amp; blocage.</b> Les profils signalés sont examinés ; un profil bloqué ne peut plus te contacter ni apparaître dans ta liste de découverte.
            </p>
            <p className="text-sm mb-4" style={{ color: "rgba(43,36,32,0.65)" }}>
              <b style={{ color: C.ink }}>Ce que nous ne faisons pas.</b> Baobab ne vend pas tes données à des tiers.
            </p>
            <button onClick={() => setPrivacyOpen(false)} className="w-full py-2.5 rounded-full text-sm font-semibold" style={{ border: "1px solid rgba(43,36,32,0.15)", color: C.ink }}>
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
        <div className="flex justify-around py-2.5 px-3" style={{ borderTop: "1px solid rgba(43,36,32,0.08)", background: "#fff", boxShadow: "0 -1px 0 rgba(20,29,56,0.02)" }}>
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
