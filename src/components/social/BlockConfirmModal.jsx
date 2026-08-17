import React from "react";
import { Ban } from "lucide-react";
import { primary, coral, muted, card } from "./theme";

export default function BlockConfirmModal({ target, onCancel, onConfirm }) {
  if (!target) return null;
  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center p-5"
      style={{ background: "rgba(21,27,61,.55)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div className={`${card} p-6 max-w-xs w-full text-center`} onClick={(e) => e.stopPropagation()}>
        <div className="h-14 w-14 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ background: "#FFF3F1" }}>
          <Ban size={24} color={coral} />
        </div>
        <h2 className="text-lg font-black" style={{ color: primary }}>Bloquer {target.name} ?</h2>
        <p className="text-sm mt-2" style={{ color: muted }}>
          Cette personne ne pourra plus t'écrire ni voir ton profil. Elle ne
          sera pas informée que tu l'as bloquée.
        </p>
        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-full text-sm font-semibold" style={{ border: "1px solid rgba(21,27,61,.12)", color: primary }}>
            Annuler
          </button>
          <button onClick={() => onConfirm(target)} className="flex-1 py-2.5 rounded-full text-sm font-bold text-white" style={{ background: coral }}>
            Bloquer
          </button>
        </div>
      </div>
    </div>
  );
}
