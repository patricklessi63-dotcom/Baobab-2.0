import React, { useState } from "react";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "../supabaseClient";
import { C } from "../constants";

export default function UpdatePasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => onDone?.(), 1800);
    } catch (e) {
      setError(e?.message || "Impossible de mettre à jour le mot de passe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.sand }}>
      <div className="bb-card w-full max-w-sm p-6 sm:p-7" style={{ background: "#fff" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 22, color: C.indigo }} className="mb-1">
          Nouveau mot de passe
        </div>
        <p className="text-sm mb-5" style={{ color: "rgba(43,36,32,0.6)" }}>
          Choisis un nouveau mot de passe pour ton compte Baobab.
        </p>

        {done ? (
          <p className="text-sm rounded-2xl px-4 py-3" style={{ background: "#EEF8F4", color: "#2F8F6B" }}>
            Mot de passe mis à jour ! Redirection...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {error && (
              <div role="alert" className="text-sm rounded-2xl px-4 py-3" style={{ background: "#FCE8E0", color: C.clay }}>
                {error}
              </div>
            )}
            <div className="flex items-center gap-2 rounded-2xl px-4" style={{ border: "1px solid rgba(43,36,32,0.15)" }}>
              <Lock size={16} color="rgba(43,36,32,0.4)" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                required
                minLength={6}
                autoComplete="new-password"
                className="flex-1 min-w-0 bg-transparent py-3.5 text-sm outline-none"
                style={{ fontSize: 16 }}
              />
              <button type="button" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={() => setShowPassword((v) => !v)} className="flex items-center justify-center flex-shrink-0" style={{ width: 44, height: 44, color: "rgba(43,36,32,0.4)" }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirme le mot de passe"
              required
              minLength={6}
              autoComplete="new-password"
              className="bb-input w-full"
              style={{ fontSize: 16 }}
            />
            <button type="submit" disabled={loading} className="bb-btn bb-btn-primary mt-1 py-3.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Mettre à jour le mot de passe
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
