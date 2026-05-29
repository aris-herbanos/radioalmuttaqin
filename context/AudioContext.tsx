"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

interface AudioContextType {
  isPlaying: boolean;
  hasError: boolean;
  metadata: { title: string; artist: string; art: string };
  listeners: number;
  togglePlay: () => void;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isInitialized = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [listeners, setListeners] = useState(0);
  const [metadata, setMetadata] = useState({
    title: "Mencari Sinyal...",
    artist: "Radio Suara Al Muttaqin",
    art: "/bg-player.png",
  });

  // ===============================
  // FETCH METADATA UPDATE JADWAL DARI DATABASE
  // ===============================
  const fetchMetadata = useCallback(async () => {
    try {
      const res = await fetch("/api/get-current-radio", { cache: "no-store" });
      if (!res.ok) throw new Error("Offline");
      const data = await res.json();
      
      if (data && data.active) {
        setMetadata({
          title: data.title || "Siaran Sedang Aktif",
          artist: "Radio Suara Al Muttaqin",
          art: "/bg-player.png",
        });
        setListeners(1);
      } else {
        setMetadata({
          title: "Siaran Sedang Offline",
          artist: "Radio Suara Al Muttaqin",
          art: "/bg-player.png",
        });
        setListeners(0);
      }
    } catch (err) {
      setMetadata({
        title: "Siaran Sedang Offline",
        artist: "Radio Suara Al Muttaqin",
        art: "/bg-player.png",
      });
      setListeners(0);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
    const interval = setInterval(fetchMetadata, 15000);
    return () => clearInterval(interval);
  }, [fetchMetadata]);

  // ===============================
  // INIT AUDIO ENGINE (WEB AUDIO API)
  // ===============================
  const initAudio = useCallback(() => {
    if (isInitialized.current || !audioRef.current) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      sourceRef.current = source;

      isInitialized.current = true;
      console.log("✅ Audio Engine Virtual Radio RSM Aktif Terpusat");
    } catch (err) {
      console.error("Gagal inisialisasi Audio Engine:", err);
    }
  }, []);

  // ===============================
  // LOGIKA UTAMA MEMUTAR LIVE SYNC (DIPISAH AGAR BISA DIPANGGIL RECURSIVE)
  // ===============================
  const startPlayback = useCallback(async () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const audioCtx = audioContextRef.current;

    try {
      const res = await fetch("/api/get-current-radio", { cache: "no-store" });
      const data = await res.json();

      if (data && data.active) {
        // Daftarkan URL baru dan set detik lompatannya
        audio.src = data.audio_url;
        audio.load();
        audio.currentTime = data.elapsed_seconds;

        if (audioCtx && audioCtx.state === "suspended") {
          await audioCtx.resume();
        }

        await audio.play();
        setIsPlaying(true);
        setHasError(false);
        // Perbarui judul player secara instan tanpa menunggu interval 15 detik
        setMetadata(prev => ({ ...prev, title: data.title })); 
      } else {
        setIsPlaying(false);
      }
    } catch (err) {
      console.error("Gagal memulai playback:", err);
      setHasError(true);
      setIsPlaying(false);
    }
  }, []);

  // SAKELAR TOMBOL PLAY / PAUSE GLOBAL
  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (!isInitialized.current) initAudio();

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.src = ""; // Flush buffer stream
      audioRef.current.load();
      setIsPlaying(false);
    } else {
      setHasError(false);
      await startPlayback();
    }
  };

  // 🚀 RE-SYNC OTOMATIS SAAT LAGU SELESAI (Pindah ke file berikutnya)
  const handleAudioEnded = async () => {
    console.log("🎵 File MP3 selesai diputar. Melompat ke track virtual berikutnya...");
    if (isPlaying) {
      await startPlayback(); // Panggil fungsi putar lagi untuk mengambil track selanjutnya dari API
    }
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <AudioContext.Provider value={{ isPlaying, hasError, metadata, listeners, togglePlay, analyserRef }}>
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="none"
        onPause={() => setIsPlaying(false)}
        onPlay={() => {
          setIsPlaying(true);
          setHasError(false);
        }}
        onEnded={handleAudioEnded} // 👈 🚀 INI KUNCI EMASNYA, NAUFAL!
        onError={() => {
          setHasError(true);
          setIsPlaying(false);
          console.warn("⚠️ Virtual Radio RSM Offline / CORS Issue");
        }}
        className="hidden"
      />
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error("useAudio harus di dalam AudioProvider");
  return context;
};