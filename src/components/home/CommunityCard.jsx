import React from "react";
import { Users } from "lucide-react";
import { primary, bg, muted } from "../social/theme";

export default function CommunityCard({ city, memberCount, onView }) {
  return (
    <button
      onClick={() => onView(city)}
      aria-label={`Découvrir la communauté de ${city}`}
      className="w-full flex items-center gap-3 text-left rounded-xl p-2 -m-2 transition-colors hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
    >
      <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }} aria-hidden="true">
        <Users size={17} color={primary} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold truncate">{city}</div>
        <div className="text-xs" style={{ color: muted }}>{memberCount} membre{memberCount > 1 ? "s" : ""}</div>
      </div>
    </button>
  );
}
