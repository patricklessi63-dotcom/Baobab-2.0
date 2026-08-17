import React from "react";
import { Users } from "lucide-react";
import { primary, coral, green, muted } from "../social/theme";

export default function EventCard({ title, location, when, attendeeCount, attending, onToggleAttendance }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "rgba(21,27,61,.08)" }}>
      <div className="text-sm font-bold" style={{ color: primary }}>{title}</div>
      <div className="text-xs mt-1" style={{ color: muted }}>{location} · {when}</div>
      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="text-xs flex items-center gap-1 flex-shrink-0" style={{ color: coral }}>
          <Users size={12} aria-hidden="true" />
          {attendeeCount} participant{attendeeCount > 1 ? "s" : ""}
        </div>
        <button
          onClick={onToggleAttendance}
          aria-pressed={attending}
          className="rounded-lg px-3 py-2 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
          style={attending ? { background: "#EEF8F4", color: green } : { background: "#FFF3F1", color: coral }}
        >
          {attending ? "Tu participes ✓" : "Participer"}
        </button>
      </div>
    </div>
  );
}
