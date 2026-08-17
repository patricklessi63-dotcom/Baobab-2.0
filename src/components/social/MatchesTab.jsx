import React from "react";
import { MessageCircle, Heart } from "lucide-react";
import Avatar from "../Avatar";
import VerifiedBadge from "../VerifiedBadge";
import { primary, green, coral, bg, muted, card, buttonBase } from "./theme";

export default function MatchesTab({ matches, goTab, openChat, onViewProfile = () => {} }) {
  return (
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
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); onViewProfile(m); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onViewProfile(m); } }}
                      aria-label={`Voir le profil de ${m.name}`}
                      className="relative flex-shrink-0"
                    >
                      <Avatar name={m.name} url={m.avatar_url} size={54} />
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white" style={{ background: m.is_online ? "#27C56D" : "#B9BEC9" }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold truncate flex items-center gap-1.5">{m.name}<VerifiedBadge emailVerified={m.email_verified} phoneVerified={m.phone_verified} size={13} /></span>
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
  );
}
