import React from "react";
import { Sparkles } from "lucide-react";
import { primary, coral, muted } from "../social/theme";

export default function HomeHeader({ currentUser }) {
  const firstName = currentUser?.name?.trim()?.split(" ")[0];
  const greeting = firstName ? `Bonjour ${firstName} 👋` : "Bienvenue sur Baobab 👋";

  return (
    <div className="bb-fade-in mb-7">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider" style={{ background: "#FFF1EC", color: coral }}>
        <Sparkles size={13} aria-hidden="true" /> Communauté africaine au Canada
      </div>
      <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-3" style={{ color: primary }}>{greeting}</h1>
      <p className="mt-1 text-sm md:text-base" style={{ color: muted }}>
        Ton cercle canadien commence ici.{currentUser?.city ? ` · ${currentUser.city} • Canada` : ""}
      </p>
    </div>
  );
}
