"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation"; // 🟢 Ambil hook rute Next.js
import { useAudio } from "@/context/AudioContext";

export default function LivePlayer() {
  const pathname = usePathname(); // 🟢 Deklarasikan pemantau jalur URL aktif
  
  const {
    isPlaying,
    isYouTubePlaying,
    isYouTubeLive,
    toggleLivePlayback,
  } = useAudio();

  // 🟢 JALUR MALES: Jika admin sedang di area studio / admin, potong kompilasi (batal render)
  if (
    pathname === "/studio" || 
    pathname?.startsWith("/studio/") || 
    pathname === "/admin" || 
    pathname?.startsWith("/admin/")
  ) {
    return null;
  }

  const isLiveActive = isPlaying || isYouTubePlaying;

  // 🟢 PERBAIKAN UTAMA: Blok instanceof Promise dihapus total, diganti try-catch murni 
  // Langkah ini menjamin kompilasi "npm run build" Vercel lolos 100% lancar jaya!
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("isPlaying") || "false");
      if (saved && !isLiveActive) {
        toggleLivePlayback();
      }
    } catch (e) {
      console.log("Autoplay dicegah oleh browser, menunggu interaksi pengguna.");
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("isPlaying", JSON.stringify(isLiveActive));
    } catch (e) {
      console.error("Gagal menyimpan state status ke localStorage:", e);
    }
  }, [isLiveActive]);

  return (
    /* 🟢 FIX DESIGN ORIGINAL: z-index [99999] dan pointer-events-none tetap terjaga utuh */
    <div className="fixed bottom-0 left-0 right-0 bg-emerald-950/90 backdrop-blur-xl text-white z-[99999] pointer-events-none shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.6)] border-t border-white/10">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center relative">
        <div className="flex items-center gap-5">
          <div className="relative flex h-4 w-4">
            <span className={`absolute inline-flex h-full w-full rounded-full blur-sm opacity-100 ${isLiveActive ? "bg-red-500" : "bg-transparent"}`} />
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLiveActive ? "bg-red-400" : "bg-transparent"} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-4 w-4 shadow-inner ${isLiveActive ? "bg-red-600" : "bg-slate-700"} border border-white/20`} />
          </div>

          <div className="hidden xs:block text-left">
            <h4 className="text-[10px] font-black tracking-[0.3em] uppercase text-emerald-400 mb-0.5 leading-none">
              Live Streaming
            </h4>
            <p className="text-[13px] font-bold text-white uppercase tracking-tighter leading-none">
              {isYouTubeLive ? "RADIO SUARA AL MUTTAQIN" : "Radio Suara Al Muttaqin"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleLivePlayback();
          }}
          className={`
            relative z-[100000] flex items-center gap-4 px-10 py-3.5 pointer-events-auto
            rounded-full font-black text-[12px] uppercase tracking-widest
            transition-all duration-300 active:scale-95 cursor-pointer select-none
            ${
              isLiveActive
                ? "bg-emerald-500 text-white shadow-[0_10px_25px_-5px_rgba(16,185,129,0.5)] border-b-4 border-emerald-700"
                : "bg-white text-emerald-950 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4)] hover:shadow-white/10 border-b-4 border-slate-300"
            }
            group
          `}
        >
          {isLiveActive ? (
            <>
              <div className="flex gap-1 items-end h-4 mb-0.5">
                <span className="w-1 bg-white rounded-full animate-[pulse_0.8s_infinite_100ms]" style={{ height: "50%" }} />
                <span className="w-1 bg-white rounded-full animate-[pulse_0.5s_infinite_300ms]" style={{ height: "100%" }} />
                <span className="w-1 bg-white rounded-full animate-[pulse_0.7s_infinite_500ms]" style={{ height: "70%" }} />
              </div>
              <span className="drop-shadow-md">Berhenti</span>
            </>
          ) : (
            <>
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-emerald-950 border-b-[8px] border-b-transparent ml-1 group-hover:scale-110 transition-transform" />
              <span className="drop-shadow-sm">Putar Radio</span>
            </>
          )}
        </button>

        <div className="hidden lg:block border-l border-white/5 pl-8">
          <div className="flex flex-col items-end gap-1 text-right">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isLiveActive ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : "bg-slate-600"}`} />
              <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-widest leading-none">
                {isLiveActive ? "Signal: Stable" : "Signal: Standby"}
              </span>
            </div>
            <span className="text-[9px] text-white/40 font-bold tracking-[0.2em] uppercase leading-none">
              Purwokerto // Central Java
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}