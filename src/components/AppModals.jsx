import React from "react";
import { Circle, Bell, Moon, Shield, Info, ArrowLeft } from "lucide-react";
import { C } from "../constants";
import { PrivacyPolicyContent, TermsOfServiceContent } from "../legalContent";

export default function AppModals({
  reportTarget,
  setReportTarget,
  reportReason,
  setReportReason,
  reportSending,
  submitReport,
  settingsOpen,
  setSettingsOpen,
  setIsOnline,
  privacyOpen,
  setPrivacyOpen,
  termsOpen,
  setTermsOpen,
  aboutOpen,
  setAboutOpen,
}) {
  return (
    <>
      {/* ---------- MODAL SIGNALEMENT ---------- */}
      {reportTarget && (
        <div className="bb-fade-in fixed inset-0 flex items-center justify-center z-30" style={{ background: "rgba(20,29,56,0.55)", backdropFilter: "blur(3px)" }}>
          <div className="bb-card p-6 max-w-xs mx-4 w-full" style={{ boxShadow: "var(--bb-shadow-lg)" }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: C.indigo }} className="mb-1">
              Signaler {reportTarget.name}
            </div>
            <p className="text-sm mb-3" style={{ color: "rgba(43,36,32,0.6)" }}>
              Explique brièvement pourquoi. On examinera ton signalement.
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={3}
              placeholder="Ex : comportement déplacé, faux profil..."
              className="w-full p-3 rounded-lg text-sm mb-3"
              style={{ border: "1px solid rgba(43,36,32,0.15)" }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setReportTarget(null); setReportReason(""); }}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold"
                style={{ border: "1px solid rgba(43,36,32,0.15)", color: C.ink }}
              >
                Annuler
              </button>
              <button
                onClick={submitReport}
                disabled={reportSending || !reportReason.trim()}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold disabled:opacity-60"
                style={{ background: C.clay, color: "#fff" }}
              >
                {reportSending ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- MODAL PARAMÈTRES ---------- */}
      {settingsOpen && (
        <div className="bb-fade-in fixed inset-0 flex items-end justify-center z-30" style={{ background: "rgba(20,29,56,0.55)", backdropFilter: "blur(3px)" }} onClick={() => setSettingsOpen(false)}>
          <div className="bb-card p-6 w-full max-w-md" style={{ borderRadius: "20px 20px 0 0" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: C.indigo }} className="mb-4">
              Paramètres
            </div>
            <div className="flex items-center justify-between py-2.5" style={{ borderTop: "1px solid rgba(43,36,32,0.08)" }}>
              <div className="flex items-center gap-2 text-sm"><Circle size={14} color={C.acacia || C.ochre} /> Statut en ligne visible</div>
              <input type="checkbox" defaultChecked onChange={(e) => setIsOnline(e.target.checked)} />
            </div>
            <div className="flex items-center justify-between py-2.5" style={{ borderTop: "1px solid rgba(43,36,32,0.08)" }}>
              <div className="flex items-center gap-2 text-sm"><Bell size={14} color={C.ochre} /> Notifications</div>
              <input type="checkbox" defaultChecked />
            </div>
            <div className="flex items-center justify-between py-2.5" style={{ borderTop: "1px solid rgba(43,36,32,0.08)" }}>
              <div className="flex items-center gap-2 text-sm"><Moon size={14} color={C.indigo} /> Mode sombre</div>
              <span className="text-xs" style={{ color: "rgba(43,36,32,0.4)" }}>Bientôt</span>
            </div>
            <button onClick={() => { setSettingsOpen(false); setPrivacyOpen(true); }} className="w-full flex items-center justify-between py-3" style={{ borderTop: "1px solid rgba(43,36,32,0.08)", minHeight: 44 }}>
              <span className="flex items-center gap-2 text-sm"><Shield size={14} color={C.indigo} /> Politique de confidentialité</span>
              <ArrowLeft size={14} style={{ transform: "rotate(180deg)", color: "rgba(43,36,32,0.35)" }} />
            </button>
            <button onClick={() => { setSettingsOpen(false); setTermsOpen(true); }} className="w-full flex items-center justify-between py-3" style={{ borderTop: "1px solid rgba(43,36,32,0.08)", minHeight: 44 }}>
              <span className="flex items-center gap-2 text-sm"><Info size={14} color={C.indigo} /> Conditions d'utilisation</span>
              <ArrowLeft size={14} style={{ transform: "rotate(180deg)", color: "rgba(43,36,32,0.35)" }} />
            </button>
            <button onClick={() => setSettingsOpen(false)} className="w-full mt-4 py-3 rounded-full text-sm font-semibold" style={{ border: "1px solid rgba(43,36,32,0.15)", color: C.ink, minHeight: 44 }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ---------- MODAL POLITIQUE DE CONFIDENTIALITÉ ---------- */}
      {privacyOpen && (
        <div className="bb-fade-in fixed inset-0 flex items-end justify-center z-30" style={{ background: "rgba(20,29,56,0.55)", backdropFilter: "blur(3px)" }} onClick={() => setPrivacyOpen(false)}>
          <div className="bb-card p-6 w-full max-w-md" style={{ borderRadius: "20px 20px 0 0", maxHeight: "80vh", overflowY: "auto", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: C.indigo }} className="mb-3">
              Politique de confidentialité
            </div>
            <div className="text-sm" style={{ color: "rgba(43,36,32,0.72)" }}>
              <PrivacyPolicyContent />
            </div>
            <button onClick={() => setPrivacyOpen(false)} className="w-full py-3 mt-2 rounded-full text-sm font-semibold" style={{ border: "1px solid rgba(43,36,32,0.15)", color: C.ink, minHeight: 44 }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ---------- MODAL CONDITIONS D'UTILISATION ---------- */}
      {termsOpen && (
        <div className="bb-fade-in fixed inset-0 flex items-end justify-center z-30" style={{ background: "rgba(20,29,56,0.55)", backdropFilter: "blur(3px)" }} onClick={() => setTermsOpen(false)}>
          <div className="bb-card p-6 w-full max-w-md" style={{ borderRadius: "20px 20px 0 0", maxHeight: "80vh", overflowY: "auto", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 20, color: C.indigo }} className="mb-3">
              Conditions d'utilisation
            </div>
            <div className="text-sm" style={{ color: "rgba(43,36,32,0.72)" }}>
              <TermsOfServiceContent />
            </div>
            <button onClick={() => setTermsOpen(false)} className="w-full py-3 mt-2 rounded-full text-sm font-semibold" style={{ border: "1px solid rgba(43,36,32,0.15)", color: C.ink, minHeight: 44 }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ---------- MODAL À PROPOS ---------- */}
      {aboutOpen && (
        <div className="bb-fade-in fixed inset-0 flex items-end justify-center z-30" style={{ background: "rgba(20,29,56,0.55)", backdropFilter: "blur(3px)" }} onClick={() => setAboutOpen(false)}>
          <div className="bb-card p-6 w-full max-w-md text-center" style={{ borderRadius: "20px 20px 0 0" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 24, color: C.indigo }} className="mb-1">
              Baobab
            </div>
            <p className="text-sm mb-4" style={{ color: "rgba(43,36,32,0.6)" }}>
              L'app de rencontres pensée pour la communauté qui s'installe au Canada.
            </p>
            <p style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.06em", color: "rgba(43,36,32,0.45)" }}>
              BAOBAB — BY LESSI PATRICK
            </p>
            <button onClick={() => setAboutOpen(false)} className="w-full mt-4 py-2.5 rounded-full text-sm font-semibold" style={{ border: "1px solid rgba(43,36,32,0.15)", color: C.ink }}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
