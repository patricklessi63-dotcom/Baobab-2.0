import React, { useState, useEffect, useCallback, useRef } from "react";
import { Home, Heart, X, MessageCircle, LogOut, ArrowLeft, Send, Loader2, Sparkles, MoreVertical, Flag, Ban, Settings, Shield, Info, Moon, Image as ImageIcon, CheckCheck, Circle, UserRound, Camera, Menu, Search, Bell } from "lucide-react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth.jsx";
import { PrivacyPolicyContent, TermsOfServiceContent } from "./legalContent";
import { C, LOOKING_FOR, EDUCATION_LEVELS, HAS_CHILDREN_OPTIONS, MAX_PHOTOS } from "./constants";
import { matchKey, formatLastSeen, formatMessageTime, formatDayLabel } from "./utils/format";
import Avatar from "./components/Avatar";
import SocialShell from "./components/SocialShell";
import AppModals from "./components/AppModals";
import CreateProfileForm from "./screens/CreateProfileForm";
import EditProfileForm from "./screens/EditProfileForm";
import ChatScreen from "./screens/ChatScreen";
import UpdatePasswordScreen from "./screens/UpdatePasswordScreen";

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
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      // Lien "mot de passe oublié" cliqué depuis l'email : Supabase authentifie
      // la session de récupération et émet cet événement.
      if (event === "PASSWORD_RECOVERY") setView("update-password");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Présence en ligne : heartbeat léger. Si les colonnes presence/last_seen
  // n'existent pas encore en base, l'interface continue simplement à fonctionner.
  // Respecte le paramètre de confidentialité "Statut en ligne visible" :
  // si désactivé, on écrit is_online=false une fois puis on arrête d'émettre.
  useEffect(() => {
    if (!session?.user?.id) return;
    let alive = true;

    if (currentUser && currentUser.show_online_status === false) {
      setIsOnline(false);
      supabase.from("profiles").update({
        is_online: false,
        last_seen: new Date().toISOString(),
      }).eq("user_id", session.user.id).catch(() => {});
      return;
    }

    const heartbeat = async () => {
      const now = new Date().toISOString();
      setIsOnline(true);
      setLastSeen(now);
      try {
        const { error: heartbeatError } = await supabase.from("profiles").update({
          is_online: true,
          last_seen: now
        }).eq("user_id", session.user.id);
        if (heartbeatError) console.error("heartbeat error:", heartbeatError.message, "| code:", heartbeatError.code, "| details:", heartbeatError.details, "| hint:", heartbeatError.hint);
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
  }, [session?.user?.id, currentUser?.show_online_status]);

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

  async function handleUnblock(target) {
    if (!currentUser) return;
    try {
      const { error: unblockError } = await supabase
        .from("blocks")
        .delete()
        .eq("from_id", currentUser.id)
        .eq("to_id", target.id);
      if (unblockError) throw unblockError;
      setBlockPairs((b) => b.filter((pair) => !(pair.from_id === currentUser.id && pair.to_id === target.id)));
    } catch (e) {
      console.error(e);
      setError("Impossible de débloquer ce profil.");
    }
  }

  async function handleToggleOnlineStatus(checked) {
    if (!currentUser) return;
    setCurrentUser((u) => ({ ...u, show_online_status: checked }));
    try {
      const { error: toggleError } = await supabase
        .from("profiles")
        .update({ show_online_status: checked })
        .eq("id", currentUser.id);
      if (toggleError) throw toggleError;
    } catch (e) {
      console.error(e);
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
      console.error("handleSaveProfile error:", e?.message, "| code:", e?.code, "| details:", e?.details, "| hint:", e?.hint);
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

  const blockedProfiles = currentUser
    ? profiles.filter((p) => blockPairs.some((b) => b.from_id === currentUser.id && b.to_id === p.id))
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

  if (view === "update-password") {
    return <UpdatePasswordScreen onDone={() => setView("checking-profile")} />;
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
          <CreateProfileForm
            form={form}
            setForm={setForm}
            photoPreviews={photoPreviews}
            handlePhotosSelected={handlePhotosSelected}
            removePhotoFile={removePhotoFile}
            saving={saving}
            handleCreateProfile={handleCreateProfile}
          />
        )}

        {/* ---------- ÉDITION DE PROFIL ---------- */}
        {view === "editProfile" && editForm && (
          <EditProfileForm
            setView={setView}
            editForm={editForm}
            setEditForm={setEditForm}
            coverPreview={coverPreview}
            currentUser={currentUser}
            setCoverFile={setCoverFile}
            setCoverPreview={setCoverPreview}
            existingPhotos={existingPhotos}
            removeExistingPhoto={removeExistingPhoto}
            newPhotoPreviews={newPhotoPreviews}
            removeNewPhotoFile={removeNewPhotoFile}
            handleNewPhotosSelected={handleNewPhotosSelected}
            savingProfile={savingProfile}
            handleSaveProfile={handleSaveProfile}
          />
        )}

        {/* ---------- CHAT ---------- */}
        {view === "chat" && activeMatch && (
          <ChatScreen
            activeMatch={activeMatch}
            setView={setView}
            currentUser={currentUser}
            otherTyping={otherTyping}
            refreshMessages={refreshMessages}
            menuOpenFor={menuOpenFor}
            setMenuOpenFor={setMenuOpenFor}
            setReportTarget={setReportTarget}
            handleBlock={handleBlock}
            messages={messages}
            messageDraft={messageDraft}
            setMessageDraft={setMessageDraft}
            broadcastTyping={broadcastTyping}
            sendMessage={sendMessage}
          />
        )}
      </div>

      <AppModals
        reportTarget={reportTarget}
        setReportTarget={setReportTarget}
        reportReason={reportReason}
        setReportReason={setReportReason}
        reportSending={reportSending}
        submitReport={submitReport}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        currentUser={currentUser}
        onToggleOnlineStatus={handleToggleOnlineStatus}
        blockedProfiles={blockedProfiles}
        onUnblock={handleUnblock}
        privacyOpen={privacyOpen}
        setPrivacyOpen={setPrivacyOpen}
        termsOpen={termsOpen}
        setTermsOpen={setTermsOpen}
        aboutOpen={aboutOpen}
        setAboutOpen={setAboutOpen}
      />

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
