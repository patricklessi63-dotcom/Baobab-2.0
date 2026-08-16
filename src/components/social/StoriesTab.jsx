import React from "react";
import { Camera } from "lucide-react";
import { primary, coral, muted, buttonBase } from "./theme";

export default function StoriesTab({ stories, viewedStories, openStory, setStoryComposer }) {
  return (
          <section>
            <div className="mb-6"><h1 className="text-3xl font-black" style={{ color: primary }}>Statuts <span className="text-xl">✨</span></h1><p className="text-sm mt-1" style={{ color: muted }}>Les petits moments de la communauté.</p></div>
            <div className="flex gap-4 overflow-x-auto pb-3">
              {stories.map((s, i) => (
                <button key={`${s.name}-${i}`} onClick={() => openStory(i)} className="shrink-0 w-32 bg-white rounded-[22px] border p-2 text-left shadow-sm hover:-translate-y-1 transition">
                  <div className="h-40 rounded-2xl flex items-end p-3 relative overflow-hidden" style={{ background: `linear-gradient(160deg,${s.color},${primary})`, opacity: viewedStories[i] && !s.own ? 0.55 : 1 }}>
                    <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20">🌍</div>
                    <span className="h-10 w-10 rounded-full bg-white/20 backdrop-blur text-white flex items-center justify-center font-black border border-white/30">{s.initial}</span>
                    {s.own && <span className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white text-primary flex items-center justify-center text-xs font-black" style={{ color: primary }}>+</span>}
                  </div>
                  <div className="text-xs font-bold mt-2 truncate">{s.name}</div>
                  {s.text && <div className="text-[10px] mt-1 truncate" style={{ color: muted }}>{s.text}</div>}
                </button>
              ))}
            </div>
            <button onClick={() => setStoryComposer(true)} className={`${buttonBase} mt-6 rounded-2xl px-5 py-3 text-white font-bold`} style={{ background: coral }}><Camera size={17} className="inline mr-2" />Partager un moment</button>
          </section>
  );
}
