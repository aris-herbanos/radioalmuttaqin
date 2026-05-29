"use client";

import { useAudio } from "@/context/AudioContext";

export default function LivePlayer() {
  const { isPlaying, togglePlay } = useAudio();

  return (
    /**
     * MODERN 3D GLASSMORPHISM CONTAINER
     * Menggunakan bayangan berlapis dan border highlight untuk efek timbul (3D)
     */
    <div className="fixed bottom-0 left-0 right-0 bg-emerald-950/90 backdrop-blur-xl text-white z-[9999] pointer-events-auto shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.6)] border-t border-white/10">
      
      {/* Aksen Garis Cahaya di Atas (3D Highlight) */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center relative">
        
        {/* SISI KIRI: Brand & Live Indicator */}
        <div className="flex items-center gap-5">
          <div className="relative flex h-4 w-4">
            {/* Glow 3D Effect */}
            <span className={`absolute inline-flex h-full w-full rounded-full blur-sm opacity-100 ${isPlaying ? 'bg-red-500' : 'bg-transparent'}`}></span>
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isPlaying ? 'bg-red-400' : 'bg-transparent'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-4 w-4 shadow-inner ${isPlaying ? 'bg-red-600' : 'bg-slate-700'} border border-white/20`}></span>
          </div>
          <div className="hidden xs:block text-left">
            <h4 className="text-[10px] font-black tracking-[0.3em] uppercase text-emerald-400 mb-0.5 leading-none">Live Streaming</h4>
            <p className="text-[13px] font-bold text-white uppercase tracking-tighter leading-none">Radio Suara Al Muttaqin</p>
          </div>
        </div>

        {/* TENGAH: TOMBOL KONTROL 3D (NEUMORPHIC STYLE) */}
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePlay(); // Mengontrol sakelar audio tunggal global yang sama
          }}
          className={`
            relative z-[10000] flex items-center gap-4 px-10 py-3.5 
            rounded-full font-black text-[12px] uppercase tracking-widest 
            transition-all duration-300 active:scale-95 cursor-pointer select-none
            ${isPlaying 
              ? 'bg-emerald-500 text-white shadow-[0_10px_25px_-5px_rgba(16,185,129,0.5)] border-b-4 border-emerald-700' 
              : 'bg-white text-emerald-950 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4)] hover:shadow-white/10 border-b-4 border-slate-300'
            }
            group
          `}
        >
          {isPlaying ? (
            <>
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-4 bg-white rounded-full animate-[bounce_1s_infinite_100ms]"></span>
                <span className="w-1.5 h-5 bg-white rounded-full animate-[bounce_1s_infinite_300ms]"></span>
                <span className="w-1.5 h-4 bg-white rounded-full animate-[bounce_1s_infinite_500ms]"></span>
              </div>
              <span className="drop-shadow-md">Berhenti</span>
            </>
          ) : (
            <>
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-emerald-950 border-b-[8px] border-b-transparent ml-1 group-hover:scale-110 transition-transform"></div>
              <span className="drop-shadow-sm">Putar Radio</span>
            </>
          )}
        </button>

        {/* SISI KANAN: Technical Stats (Dashboard Style) */}
        <div className="hidden lg:block border-l border-white/5 pl-8">
          <div className="flex flex-col items-end gap-1 text-right">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-slate-600'}`}></span>
              <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-widest leading-none">
                {isPlaying ? "Signal: Stable" : "Signal: Standby"}
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