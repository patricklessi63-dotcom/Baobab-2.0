import React from "react";
import { Users } from "lucide-react";
import { primary, coral, muted } from "../social/theme";

// Prêt pour quand un système d'événements existera côté Supabase.
// N'est pas utilisé avec de fausses données tant que cette table n'existe pas.
export default function EventCard({ title, location, date, attendeeCount, onView }) {
  return (
    <button
      onClick={onView}
      className="w-full text-left rounded-2xl border p-4 transition-colors hover:bg-black/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
      style={{ borderColor: "rgba(21,27,61,.08)" }}
    >
      <div className="text-sm font-bold" style={{ color: primary }}>{title}</div>
      <div className="text-xs mt-1" style={{ color: muted }}>{location} · {date}</div>
      {typeof attendeeCount === "number" && (
        <div className="text-xs mt-1.5 flex items-center gap-1" style={{ color: coral }}>
          <Users size={12} aria-hidden="true" /> {attendeeCount} participant{attendeeCount > 1 ? "s" : ""}
        </div>
      )}
    </button>
  );
}
