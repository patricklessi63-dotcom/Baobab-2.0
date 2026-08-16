import React from "react";
import { ArrowLeft, MoreVertical, Flag, Ban, Send, CheckCheck, Circle } from "lucide-react";
import Avatar from "../components/Avatar";
import { C } from "../constants";
import { formatLastSeen, formatMessageTime, formatDayLabel } from "../utils/format";

const iceBreakers = [
  "Le plat de chez toi qui te manque le plus ?",
  "Comment se passe ton adaptation ici ?",
  "Qu'est-ce qui t'a le plus surpris en arrivant au Canada ?",
];

export default function ChatScreen({
  activeMatch,
  setView,
  currentUser,
  otherTyping,
  refreshMessages,
  menuOpenFor,
  setMenuOpenFor,
  setReportTarget,
  handleBlock,
  messages,
  messageDraft,
  setMessageDraft,
  broadcastTyping,
  sendMessage,
}) {
  return (
    <div className="flex flex-col flex-1 max-w-md mx-auto w-full">
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid rgba(43,36,32,0.1)", position: "relative" }}>
        <button onClick={() => setView("feed")}><ArrowLeft size={18} /></button>
        <div style={{ position: "relative" }}>
          <Avatar name={activeMatch.name} url={activeMatch.avatar_url} size={34} />
          <Circle
            size={10}
            fill={activeMatch.is_online ? "#4CAF6D" : "#9aa0ab"}
            color="transparent"
            style={{ position: "absolute", bottom: -1, right: -1, background: "#fff", borderRadius: "50%" }}
          />
        </div>
        <div>
          <div className="text-sm font-semibold">{activeMatch.name}</div>
          <div className="text-xs" style={{ color: otherTyping ? C.clay : "rgba(43,36,32,0.45)" }}>
            {otherTyping ? "en train d'écrire…" : activeMatch.is_online ? "En ligne" : formatLastSeen(activeMatch.last_seen)}
          </div>
        </div>
        <button onClick={() => refreshMessages(activeMatch)} className="ml-auto text-xs" style={{ color: C.indigo }}>Actualiser</button>
        <button onClick={() => setMenuOpenFor(menuOpenFor === activeMatch.id ? null : activeMatch.id)} className="ml-1">
          <MoreVertical size={18} color={C.ink} />
        </button>
        {menuOpenFor === activeMatch.id && (
          <div className="rounded-xl overflow-hidden bg-white" style={{ border: "1px solid rgba(43,36,32,0.1)", position: "absolute", top: 48, right: 12, minWidth: 160, zIndex: 5 }}>
            <button
              onClick={() => { setReportTarget(activeMatch); setMenuOpenFor(null); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left"
              style={{ color: C.ink }}
            >
              <Flag size={14} /> Signaler
            </button>
            <button
              onClick={() => handleBlock(activeMatch)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left"
              style={{ color: C.clay, borderTop: "1px solid rgba(43,36,32,0.08)" }}
            >
              <Ban size={14} /> Bloquer
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-xs text-center mt-6" style={{ color: "rgba(43,36,32,0.45)" }}>Dites bonjour 👋</p>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showDaySeparator = !prev || formatDayLabel(prev.created_at) !== formatDayLabel(m.created_at);
          const isMine = m.from_id === currentUser.id;
          const groupedWithPrev = prev && !showDaySeparator && prev.from_id === m.from_id;
          return (
            <React.Fragment key={m.id}>
              {showDaySeparator && (
                <div className="flex justify-center my-3">
                  <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(43,36,32,0.06)", color: "rgba(43,36,32,0.5)" }}>
                    {formatDayLabel(m.created_at)}
                  </span>
                </div>
              )}
              <div
                className="bb-fade-in max-w-[75%] text-sm px-3.5 py-2.5 rounded-2xl flex items-end gap-1.5"
                style={{
                  ...(isMine
                    ? { alignSelf: "flex-end", background: C.indigo, color: C.sand, borderBottomRightRadius: 4, boxShadow: "var(--bb-shadow-sm)" }
                    : { alignSelf: "flex-start", background: C.sand, color: C.ink, borderBottomLeftRadius: 4 }),
                  marginTop: groupedWithPrev ? 2 : 10,
                }}
              >
                <span>{m.text}</span>
                <span className="text-[10px] flex-shrink-0 flex items-center gap-0.5" style={{ opacity: 0.6, whiteSpace: "nowrap" }}>
                  {formatMessageTime(m.created_at)}
                  {isMine && <CheckCheck size={12} />}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {messages.length === 0 && (
        <div className="px-4 pb-2 flex flex-col gap-1.5">
          {iceBreakers.map((ib) => (
            <button key={ib} onClick={() => setMessageDraft(ib)} className="bb-btn text-left text-xs px-3 py-2.5" style={{ background: "#fff", border: "1px solid var(--bb-border)", borderRadius: "var(--bb-radius-sm)", color: C.indigo }}>
              {ib}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 flex gap-2" style={{ borderTop: "1px solid rgba(43,36,32,0.08)", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <input
          value={messageDraft}
          onChange={(e) => { setMessageDraft(e.target.value); broadcastTyping(); }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Écris un message..."
          className="bb-input flex-1 text-sm"
          style={{ borderRadius: 999, fontSize: 16, minHeight: 44 }}
        />
        <button onClick={sendMessage} className="bb-btn bb-btn-heart w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ minWidth: 44, minHeight: 44 }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
