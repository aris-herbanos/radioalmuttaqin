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
  const isInitialized = useRef(false); // Kunci emas agar tidak double-init audio context

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [listeners, setListeners] = useState(0);
  const [metadata, setMetadata] = useState({
    title: "Mencari Sinyal...",
    artist: "Radio Suara Al Muttaqin",
    art: "/bg-player.png",
  });

  // ===============================
  // 📻 FETCH METADATA UPDATE JADWAL DARI DATABASE
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
        setListeners(1); // Penanda ada trek aktif
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

  // Sinkronisasi metadata periodik setiap 15 detik
  useEffect(() => {
    fetchMetadata();
    const interval = setInterval(fetchMetadata, 15000);
    return () => clearInterval(interval);
  }, [fetchMetadata]);

  // ===============================
  // 🎛️ INIT AUDIO ENGINE (WEB AUDIO API FOR CANVAS)
  // ===============================
  const initAudio = useCallback(() => {
    if (isInitialized.current || !audioRef.current) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256; // Ringan dan responsif untuk efek visualizer petir neon antum
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Hubungkan satu tag <audio> tersembunyi ke Web Audio API Engine
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

  // Bersihkan audio context saat komponen mengalami unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // ===============================
  // ⚡ TOGGLE PLAY (VIRTUAL LIVE STREAM SYNC LOGIC)
  // ===============================
  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    // Aktifkan engine canvas saat tombol ditekan pertama kali
    if (!isInitialized.current) initAudio();

    const audio = audioRef.current;
    const audioCtx = audioContextRef.current;

    try {
      if (isPlaying) {
        audio.pause();
        audio.src = ""; // Flush source agar menghemat bandwidth & stop buffering di latar belakang
        audio.load();
        setIsPlaying(false);
      } else {
        setHasError(false);
        
        // 🚀 AMBIL DATA DARI GERBANG CLOUD
        const res = await fetch("/api/get-current-radio", { cache: "no-store" });
        const data = await res.json();

        if (data && data.active) {
          // Isi source dengan file .mp3 terjadwal yang ditunjuk database
          audio.src = data.audio_url;
          audio.load();

          // Lompat serempak ke detik yang sama persis di seluruh dunia!
          audio.currentTime = data.elapsed_seconds;

          if (audioCtx && audioCtx.state === "suspended") {
            await audioCtx.resume();
          }

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
                setHasError(false);
              })
              .catch((err) => {
                console.warn("Autoplay diblokir browser atau berkas terputus:", err);
                setHasError(true);
                setIsPlaying(false);
              });
          }
        } else {
          alert("Saat ini sedang tidak ada siaran terjadwal yang aktif di cloud, Ris.");
        }
      }
    } catch (err) {
      setHasError(true);
      setIsPlaying(false);
    }
  };

  return (
    <AudioContext.Provider value={{ isPlaying, hasError, metadata, listeners, togglePlay, analyserRef }}>
      <audio
        ref={audioRef}
        crossOrigin="anonymous" // Wajib terpasang demi kelancaran visualizer Canvas
        preload="none"
        onPause={() => setIsPlaying(false)}
        onPlay={() => {
          setIsPlaying(true);
          setHasError(false);
        }}
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