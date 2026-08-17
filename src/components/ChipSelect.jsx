import React from "react";

// Sélecteur de chips générique — choix unique ou multiple, avec limite
// optionnelle. Utilisé par l'onboarding et le formulaire d'édition de profil.
export default function ChipSelect({ options, value, onChange, multi = false, max = null }) {
  const selected = multi ? (Array.isArray(value) ? value : []) : value;

  const toggle = (opt) => {
    if (!multi) {
      onChange(selected === opt ? "" : opt);
      return;
    }
    const has = selected.includes(opt);
    if (has) {
      onChange(selected.filter((v) => v !== opt));
    } else {
      if (max && selected.length >= max) return;
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => {
        const active = multi ? selected.includes(opt) : selected === opt;
        const disabled = multi && max && !active && selected.length >= max;
        return (
          <button
            type="button"
            key={opt}
            onClick={() => toggle(opt)}
            disabled={disabled}
            aria-pressed={active}
            className={`bb-pill text-xs font-semibold px-3.5 py-2.5 rounded-full disabled:opacity-40 ${active ? "bb-pill-active" : ""}`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
