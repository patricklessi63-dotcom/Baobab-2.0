import React from "react";
import { Sparkles, Heart, MessageCircle, Users, Calendar } from "lucide-react";
import Avatar from "../Avatar";
import VerifiedBadge from "../VerifiedBadge";
import { primary, green, coral, gold, bg, muted, card, buttonBase } from "./theme";

export default function FeedTab({
  currentUser,
  firstName,
  stories,
  viewedStories,
  openStory,
  setStoryComposer,
  growthStages,
  growthStageEmojis,
  growthStageIndex,
  growthPct,
  completedSteps,
  totalSteps,
  openEditProfile,
  candidates,
  handleLike,
  nearbyMembers,
  communities,
  matches,
  openChat,
  goTab,
  setSearch,
}) {
  return (
          <div className="max-w-6xl mx-auto">
            <div className="mb-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider" style={{ background: "#FFF1EC", color: coral }}><Sparkles size={13} /> Communauté africaine au Canada</div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-3" style={{ color: primary }}>Bonjour {firstName} 👋</h1>
              <p className="mt-1 text-sm md:text-base" style={{ color: muted }}>Ton cercle canadien commence ici.</p>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-1 mb-7 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {stories.map((s, i) => {
                const seen = viewedStories[i];
                const ringBg = s.own
                  ? "transparent"
                  : seen
                  ? "#D9DCE4"
                  : `linear-gradient(135deg,${coral},${gold},${green})`;
                return (
                  <div key={`${s.name}-${i}`} className="shrink-0 flex flex-col items-center gap-1.5 w-[68px]">
                    <div className="h-[64px] w-[64px] rounded-full flex items-center justify-center p-[3px] relative" style={{ background: ringBg }}>
                      {s.own ? (
                        <>
                          <button onClick={() => openStory(i)} className="h-full w-full rounded-full p-[2px] bg-white flex items-center justify-center">
                            <div className="h-full w-full rounded-full flex items-center justify-center relative" style={{ background: bg }}>
                              <Avatar name={currentUser?.name || "+"} url={currentUser?.avatar_url} size={56} />
                            </div>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setStoryComposer(true); }}
                            aria-label="Ajouter un statut"
                            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center text-white text-sm font-black border-2 border-white"
                            style={{ background: coral }}
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <button onClick={() => openStory(i)} className="h-full w-full rounded-full p-[2px] bg-white flex items-center justify-center">
                          <div className="h-full w-full rounded-full flex items-center justify-center text-white font-black text-lg" style={{ background: `linear-gradient(160deg,${s.color},${primary})` }}>
                            {s.initial}
                          </div>
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold truncate w-full text-center" style={{ color: seen ? muted : "#20243A" }}>{s.own ? "Ton statut" : s.name}</span>
                  </div>
                );
              })}
            </div>

            {/* ---------- Ton Baobab : progression de l'arbre ---------- */}
            <div className="rounded-[30px] p-6 md:p-7 text-white shadow-[0_20px_60px_rgba(21,27,61,.18)] overflow-hidden relative mb-7" style={{ background: `linear-gradient(145deg,${primary},#2B3766 60%,${green})` }}>
              <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-white/10" />
              <div className="absolute -right-4 -bottom-10 text-[130px] leading-none opacity-10 select-none">🌳</div>
              <div className="relative flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-[.22em] text-white/55">Ton Baobab</div>
                  <div className="text-2xl md:text-3xl font-black mt-2">{growthStages[growthStageIndex]} <span>{growthStageEmojis[growthStageIndex]}</span></div>
                  <p className="text-sm text-white/70 mt-2 leading-6 max-w-md">Ton arbre grandit à mesure que tu complètes ton profil et te connectes à ta communauté.</p>
                  <div className="mt-4 h-2.5 rounded-full bg-white/15 overflow-hidden max-w-sm">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${growthPct}%`, background: `linear-gradient(90deg,${gold},${green})` }} />
                  </div>
                  <div className="text-xs mt-2 text-white/60">{completedSteps}/{totalSteps} étapes complétées</div>
                </div>
                {growthPct < 100 && (
                  <button onClick={openEditProfile} className={`${buttonBase} shrink-0 rounded-xl px-5 py-3 font-bold`} style={{ background: gold, color: primary }}>Compléter mon profil <span className="ml-1">→</span></button>
                )}
              </div>
            </div>

            <div className="grid xl:grid-cols-[minmax(0,1fr)_330px] gap-7">
              <section className="min-w-0">
                <div className="mb-5">
                  <h2 className="text-xl font-black" style={{ color: primary }}>Pour toi</h2>
                  <p className="text-sm mt-1" style={{ color: muted }}>Des membres choisis pour toi, sur mesure.</p>
                </div>

                <div className={`${card} p-5 mb-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <div><b className="text-sm">Recommandations</b><div className="text-xs mt-0.5" style={{ color: muted }}>De nouveaux membres de la communauté</div></div>
                    <button onClick={() => goTab("discover")} className="text-xs font-bold" style={{ color: coral }}>Tout voir</button>
                  </div>
                  {candidates.length === 0 ? (
                    <p className="text-sm" style={{ color: muted }}>Pas encore de recommandation. Reviens bientôt, de nouveaux membres arrivent régulièrement.</p>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                      {candidates.slice(0, 8).map((p) => (
                        <div key={p.id} className="shrink-0 w-36 rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(21,27,61,.08)" }}>
                          <div className="h-24 relative" style={{ background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : `linear-gradient(150deg,${gold},${coral})` }}>
                            {!p.avatar_url && <div className="absolute inset-0 flex items-center justify-center text-3xl">🌍</div>}
                          </div>
                          <div className="p-2.5">
                            <div className="text-xs font-bold truncate">{p.name}, {p.age}</div>
                            <div className="text-[10px] truncate mt-0.5" style={{ color: muted }}>{p.city || "Canada"}</div>
                            <button onClick={() => handleLike(p)} className="w-full mt-2 rounded-lg py-2.5 text-[11px] font-bold" style={{ background: "#FFF3F1", color: coral }}>
                              <Heart size={11} className="inline mr-1" />J'aime
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`${card} p-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <b className="text-sm">Autour de toi</b>
                      <div className="text-xs mt-0.5" style={{ color: muted }}>{currentUser?.city ? `Membres à ${currentUser.city}` : "Renseigne ta ville pour voir qui est près de toi"}</div>
                    </div>
                  </div>
                  {!currentUser?.city ? (
                    <button onClick={openEditProfile} className="text-sm font-bold" style={{ color: coral }}>Ajouter ma ville →</button>
                  ) : nearbyMembers.length === 0 ? (
                    <p className="text-sm" style={{ color: muted }}>Personne d'autre à {currentUser.city} pour l'instant. Invite ta communauté à rejoindre Baobab.</p>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                      {nearbyMembers.slice(0, 8).map((p) => (
                        <div key={p.id} className="shrink-0 w-36 rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(21,27,61,.08)" }}>
                          <div className="h-24 relative" style={{ background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : `linear-gradient(150deg,${green},${primary})` }}>
                            {!p.avatar_url && <div className="absolute inset-0 flex items-center justify-center text-3xl">🌍</div>}
                          </div>
                          <div className="p-2.5">
                            <div className="text-xs font-bold truncate">{p.name}, {p.age}</div>
                            <div className="text-[10px] truncate mt-0.5" style={{ color: muted }}>{p.city}</div>
                            <button onClick={() => handleLike(p)} className="w-full mt-2 rounded-lg py-2.5 text-[11px] font-bold" style={{ background: "#EEF8F4", color: green }}>
                              <Heart size={11} className="inline mr-1" />J'aime
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`${card} p-6 mt-5 text-center`}>
                  <Calendar size={26} className="mx-auto mb-2" color={muted} />
                  <b className="text-sm">Événements</b>
                  <p className="text-xs mt-1 max-w-xs mx-auto" style={{ color: muted }}>Les rencontres et événements communautaires arrivent bientôt sur Baobab.</p>
                </div>
              </section>

              <aside className="space-y-5">
                <div className={`${card} p-5`}>
                  <div className="flex items-center justify-between mb-4"><b className="text-sm">Conversations</b><button onClick={() => goTab("matches")} className="text-xs font-bold" style={{ color: coral }}>Tout voir</button></div>
                  {matches.length === 0 ? (
                    <p className="text-sm" style={{ color: muted }}>Tes conversations apparaîtront ici dès que tu auras un match.</p>
                  ) : (
                    <div className="space-y-3">
                      {matches.slice(0, 5).map((m) => (
                        <button key={m.id} onClick={() => openChat(m)} className="w-full flex items-center gap-3 text-left">
                          <div style={{ position: "relative" }}>
                            <Avatar name={m.name} url={m.avatar_url} size={40} />
                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white" style={{ background: m.is_online ? "#27C56D" : "#B9BEC9" }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold truncate flex items-center gap-1.5">{m.name}<VerifiedBadge emailVerified={m.email_verified} phoneVerified={m.phone_verified} size={13} /></div>
                            <div className="text-xs truncate" style={{ color: muted }}>{m.is_online ? "En ligne" : (m.city || "Canada")}</div>
                          </div>
                          <MessageCircle size={16} color={coral} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`${card} p-5`}>
                  <div className="flex items-center justify-between mb-4"><b className="text-sm">Communautés</b></div>
                  {communities.length === 0 ? (
                    <p className="text-sm" style={{ color: muted }}>Les communautés par ville apparaîtront ici à mesure que Baobab grandit.</p>
                  ) : (
                    <div className="space-y-3">
                      {communities.map(([city, count]) => (
                        <button key={city} onClick={() => { setSearch(city); goTab("discover"); }} className="w-full flex items-center gap-3 text-left">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}><Users size={17} color={primary} /></div>
                          <div className="min-w-0 flex-1"><div className="text-sm font-bold truncate">{city}</div><div className="text-xs" style={{ color: muted }}>{count} membre{count > 1 ? "s" : ""}</div></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
  );
}
