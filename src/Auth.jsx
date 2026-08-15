import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "./supabaseClient";

const C = {
  indigo: "#1E2A4F",
  indigoDeep: "#141D38",
  clay: "#C1613D",
  ochre: "#D9A441",
  sand: "#F2E9DC",
  ink: "#2B2420",
};

export default function Auth() {
  const [mode, setMode] = useState("signin"); // signin | signup | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setNotice("Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.");
        setMode("signin");
      } else if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
        if (resetError) throw resetError;
        setNotice("Email de réinitialisation envoyé, si ce compte existe.");
        setMode("signin");
      }
    } catch (e) {
      setError(traduireErreur(e.message));
    } finally {
      setLoading(false);
    }
  }

  function traduireErreur(msg) {
    if (!msg) return "Une erreur est survenue.";
    if (msg.includes("Invalid login credentials")) return "Email ou mot de passe incorrect.";
    if (msg.includes("User already registered")) return "Un compte existe déjà avec cet email.";
    if (msg.includes("Password should be at least")) return "Le mot de passe doit contenir au moins 6 caractères.";
    if (msg.includes("Unable to validate email address")) return "Adresse email invalide.";
    return msg;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: C.sand, fontFamily: "system-ui, sans-serif", color: C.ink }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span style={{ fontFamily: "serif", fontStyle: "italic", fontWeight: 600, fontSize: 28, color: C.indigo }}>
            Baobab
          </span>
          <p className="text-sm mt-2" style={{ color: "rgba(43,36,32,0.6)" }}>
            {mode === "signup" ? "Crée ton compte" : mode === "reset" ? "Réinitialiser le mot de passe" : "Connecte-toi pour continuer"}
          </p>
        </div>

        {error && (
          <div className="mb-4 text-sm px-3 py-2 rounded-lg" style={{ background: "#fce8e0", color: C.clay }}>
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 text-sm px-3 py-2 rounded-lg" style={{ background: "#e8f0e3", color: "#2f5233" }}>
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="p-3 rounded-lg text-sm"
            style={{ border: "1px solid rgba(43,36,32,0.15)" }}
          />
          {mode !== "reset" && (
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="p-3 rounded-lg text-sm"
              style={{ border: "1px solid rgba(43,36,32,0.15)" }}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: C.indigo, color: C.sand }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === "signup" ? "Créer mon compte" : mode === "reset" ? "Envoyer le lien" : "Se connecter"}
          </button>
        </form>

        <div className="mt-5 text-center text-xs flex flex-col gap-2" style={{ color: "rgba(43,36,32,0.6)" }}>
          {mode === "signin" && (
            <>
              <button onClick={() => { setMode("reset"); setError(""); setNotice(""); }} style={{ color: C.indigo }}>
                Mot de passe oublié ?
              </button>
              <span>
                Pas encore de compte ?{" "}
                <button onClick={() => { setMode("signup"); setError(""); setNotice(""); }} className="font-semibold" style={{ color: C.clay }}>
                  Inscris-toi
                </button>
              </span>
            </>
          )}
          {mode !== "signin" && (
            <button onClick={() => { setMode("signin"); setError(""); setNotice(""); }} style={{ color: C.indigo }}>
              ← Retour à la connexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
