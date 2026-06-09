"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface AudioContextType {
  isPlaying: boolean;
  hasError: boolean;
  metadata: { title: string; artist: string; art: string };
  listeners: number;
  togglePlay: () => void;
  toggleLivePlayback: () => void;
  toggleYouTubeAudio: () => void;
  registerYouTubeToggle: (handler: (() => void) | null) => void;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  isYouTubeLive: boolean;
  setIsYouTubeLive: React.Dispatch<React.SetStateAction<boolean>>;
  isYouTubePlaying: boolean;
  setIsYouTubePlaying: React.Dispatch<React.SetStateAction<boolean>>;
  youtubeVideoId: string | null;
  setYoutubeVideoId: React.Dispatch<React.SetStateAction<string | null>>;
  youtubeThumbnail: string;
}

const AudioContext = createContext<AudioContextType | null>(null);

async function fetchCurrentRadioStatusFromBackend() {
  const res = await fetch("/api/get-current-radio", { cache: "no-store" });
  if (!res.ok) throw new Error("Radio API offline");
  return await res.json();
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const youtubeToggleRef = useRef<(() => void) | null>(null);

  const isInitialized = useRef(false);
  const lastSyncedUrlRef = useRef("");
  const userStoppedRef = useRef(false);
  const isAutoSwitchingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const isYouTubePlayingRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const [hasError, setHasError] = useState(false);
  const [listeners, setListeners] = useState(0);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState({
    title: "Mencari Sinyal...",
    artist: "Radio Suara Al Muttaqin",
    art: "/bg-player.png",
  });

  const [isYouTubeLive, setIsYouTubeLive] = useState(false);
  const [isYouTubePlaying, setIsYouTubePlaying] = useState(false);

  const youtubeThumbnail = youtubeVideoId
    ? `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`
    : "/bg-player.png";

  const jingleRef = useRef<HTMLAudioElement | null>(null);
  const jingleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isJinglePlayingRef = useRef(false);

  const JINGLE_INTERVAL = 5 * 60 * 1000; 
  const JINGLE_FILE = "/audio/jingle.mp3";

  // 🟢 OPTIMASI MUTE SUARA: Menghentikan audio MP3 internal dengan halus tanpa memutus sambungan buffer
  const stopMp3Playback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (jingleRef.current) {
      jingleRef.current.pause();
      jingleRef.current.currentTime = 0;
    }
    isJinglePlayingRef.current = false;

    if (jingleIntervalRef.current) {
      clearInterval(jingleIntervalRef.current);
      jingleIntervalRef.current = null;
    }

    userStoppedRef.current = true;
    isAutoSwitchingRef.current = false;

    try {
      audio.pause(); // Langsung pause untuk menghemat kuota streaming relay/MP3 jemaah
    } catch (e) {
      console.warn("Pause handling error:", e);
    }
    
    setIsPlaying(false);
  }, []);

  // 🟢 BUFFER RESET ANTI-SENDAT: Mengosongkan memori audio secara mutlak untuk mode transisi berat
  const resetMp3PlaybackCompletely = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (jingleRef.current) {
      jingleRef.current.pause();
      jingleRef.current.currentTime = 0;
    }
    isJinglePlayingRef.current = false;

    if (jingleIntervalRef.current) {
      clearInterval(jingleIntervalRef.current);
      jingleIntervalRef.current = null;
    }

    userStoppedRef.current = true;
    isAutoSwitchingRef.current = false;

    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    lastSyncedUrlRef.current = "";
    setIsPlaying(false);
  }, []);

  const registerYouTubeToggle = useCallback((handler: (() => void) | null) => {
    youtubeToggleRef.current = handler;
  }, []);

  const playJingle = useCallback(() => {
    try {
      if (!isPlayingRef.current || isYouTubePlayingRef.current || isJinglePlayingRef.current) {
        return;
      }

      const mainAudio = audioRef.current;
      if (!mainAudio) return;

      isJinglePlayingRef.current = true;

      if (!jingleRef.current) {
        jingleRef.current = new Audio(JINGLE_FILE);
        jingleRef.current.preload = "auto";
        jingleRef.current.crossOrigin = "anonymous";
        jingleRef.current.onerror = () => {
          console.error("Jingle gagal dimuat");
          if (audioRef.current && isPlayingRef.current) audioRef.current.volume = 1;
          isJinglePlayingRef.current = false;
        };
      }

      mainAudio.volume = 0.01; 
      jingleRef.current.currentTime = 0;

      const runJinglePlay = async () => {
        try {
          if (jingleRef.current) {
            await jingleRef.current.play();
          }
        } catch (playErr) {
          console.error("Jingle playback execution blocked:", playErr);
          if (audioRef.current && isPlayingRef.current) audioRef.current.volume = 1;
          isJinglePlayingRef.current = false;
        }
      };

      runJinglePlay();

      jingleRef.current.onended = () => {
        const mainAudioElement = audioRef.current;
        if (isPlayingRef.current && mainAudioElement) {
          mainAudioElement.volume = 1;
        }
        isJinglePlayingRef.current = false;
      };
    } catch (err) {
      console.error("Gagal memputar jingle:", err);
      if (audioRef.current && isPlayingRef.current) audioRef.current.volume = 1;
      isJinglePlayingRef.current = false;
    }
  }, [JINGLE_FILE]);

  // Inisialisasi Audio Engine Web Audio API secara aman & jernih
  const initAudio = useCallback(() => {
    if (isInitialized.current || !audioRef.current) return;

    try {
      const WebAudioContext = typeof window !== "undefined" 
        ? (window.AudioContext || (window as any).webkitAudioContext) 
        : null;

      if (!WebAudioContext) {
        console.warn("Web Audio API tidak didukung di browser ini.");
        return;
      }
      
      const audioCtx = new WebAudioContext();
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
    } catch (err) {
      console.error("Gagal inisialisasi Audio Engine:", err);
    }
  }, []);

  // =================================================================
  // POLLING SYNC: KONSUMSI MONITORING LIVE STREAMING & RELAY AUDIO JERNIH
  // =================================================================
  const fetchMetadata = useCallback(async () => {
    try {
      const data = await fetchCurrentRadioStatusFromBackend(); 
      
      if (!data || !data.active) {
        setIsYouTubeLive(false);
        setMetadata({ 
          title: data?.title || "Siaran Sedang Offline", 
          artist: data?.artist || "Radio Suara Al Muttaqin", 
          art: "/bg-player.png" 
        });
        setListeners(0);
        return;
      }

      // 🔴 CASE A: AREA TRANSMISI YOUTUBE LIVE
      if (data.type === "youtube_live") {
        if (isPlayingRef.current) {
          stopMp3Playback();
        }
        setYoutubeVideoId(data.youtube_video_id);
        setIsYouTubeLive(true);
        setMetadata({
          title: data.title || "Live Streaming YouTube",
          artist: data.artist || "Pondok Pesantren Al Muttaqin",
          art: data.thumbnail || "/bg-player.png",
        });
        setListeners(1);
        return;
      }
      
      // 🔴 CASE B: AREA TRANSMISI AUDIO STREAM MP3 / RELAY RADIO FM LAIN
      if (data.type === "playlist_mp3" || data.type === "relay_stream" || data.audio_url) {
        setIsYouTubeLive(false);
        setYoutubeVideoId(null);
        
        setMetadata({
          title: data.title || "Radio Suara Al Muttaqin",
          artist: data.artist || "Menginspirasi Hati Menguatkan Iman",
          art: data.thumbnail || "/bg-player.png",
        });

        const audio = audioRef.current;
        if (audio && data.audio_url) {
          
          // 🟢 PENANGANAN RELAY DAN BUFFER ANTI LONCAT:
          if (audio.src !== data.audio_url) {
            audio.src = data.audio_url;
            audio.load();
            
            // JALANKAN SEEK CATCH-UP HANYA JIKA BUKAN RELAY LIVE AUDIO LIVE
            if (data.type !== "relay_stream" && data.elapsed_seconds && data.elapsed_seconds > 2) {
              audio.currentTime = data.elapsed_seconds;
            }

            if (isPlayingRef.current) {
              audio.play().catch(err => console.warn("Autoplay block protection:", err));
            }
          } else {
            // JIKA AKAN MEMUTAR FILE STENGAH JALAN (CATCH UP TIMELINE AUDIO), TOLERANSI DIKETATKAN BILA LEBIH DARI 5 DETIK
            if (data.type !== "relay_stream" && data.elapsed_seconds && Math.abs(audio.currentTime - data.elapsed_seconds) > 5) {
              audio.currentTime = data.elapsed_seconds;
            }
          }
        }
        
        setListeners(1);
        return;
      }

    } catch (error) {
      console.error("Gagal sinkronisasi data stream radio:", error);
      setMetadata({ title: "Hubungan Terputus...", artist: "Radio Suara Al Muttaqin", art: "/bg-player.png" });
      setListeners(0);
    }
  }, [stopMp3Playback]);

  useEffect(() => {
    fetchMetadata();
    const interval = setInterval(fetchMetadata, 15000); // Polling metadata disetel per 15 detik sekali
    return () => clearInterval(interval);
  }, [fetchMetadata]);

  const startPlayback = useCallback(async () => {
    try {
      const audio = audioRef.current;
      if (audio && audio.src && audio.src !== "" && audio.src !== window.location.href) {
        audio.volume = 1;
        
        // Memastikan Audio Context resume terlebih dahulu agar visualizer tidak beku
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        userStoppedRef.current = false;
        setIsPlaying(true);
        setHasError(false);
        return;
      }

      await fetchMetadata();
    } catch (err) {
      console.error("Gagal mematangkan pemutaran audio stream:", err);
      setHasError(true);
      setIsPlaying(false);
    }
  }, [fetchMetadata]);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;

    if (!isInitialized.current) {
      initAudio();
    }

    if (isPlaying) {
      stopMp3Playback();
      return;
    }

    userStoppedRef.current = false;
    setHasError(false);
    await startPlayback();
  }, [initAudio, isPlaying, stopMp3Playback, startPlayback]);

  const toggleLivePlayback = useCallback(() => {
    if (isYouTubeLive && youtubeToggleRef.current) {
      // Alihkan perintah play langsung ke fungsi internal pemutar YouTube tersembunyi Anda
      youtubeToggleRef.current();
      return;
    }
    togglePlay();
  }, [isYouTubeLive, togglePlay]);

  const toggleYouTubeAudio = useCallback(() => {
    const nextState = !isYouTubePlayingRef.current;
    window.dispatchEvent(new CustomEvent("toggle-yt-player"));

    setIsYouTubePlaying(nextState);
    isYouTubePlayingRef.current = nextState;

    window.dispatchEvent(new CustomEvent("yt-status-change", { detail: nextState }));

    if (!jingleRef.current) {
      jingleRef.current = new Audio(JINGLE_FILE);
      jingleRef.current.preload = "auto";
      jingleRef.current.crossOrigin = "anonymous";
    }
    
    if (nextState) {
      jingleRef.current.load();
    }

    if (nextState && audioRef.current) {
      audioRef.current.volume = 0;
      setIsPlaying(false);
      isPlayingRef.current = false; 
    }
  }, [JINGLE_FILE]); 

  useEffect(() => {
    const syncStatusFromEvent = (e: any) => {
      setIsYouTubePlaying(e.detail);
      isYouTubePlayingRef.current = e.detail; 
    };
    window.dispatchEvent(new CustomEvent("yt-status-change", { detail: isYouTubePlayingRef.current }));
    window.addEventListener("yt-status-change", syncStatusFromEvent);
    return () => window.removeEventListener("yt-status-change", syncStatusFromEvent);
  }, []);

  useEffect(() => {
    if (isYouTubeLive) {
      resetMp3PlaybackCompletely();
    }
  }, [isYouTubeLive, resetMp3PlaybackCompletely]);

  useEffect(() => {
    if (jingleIntervalRef.current) {
      clearInterval(jingleIntervalRef.current);
      jingleIntervalRef.current = null;
    }

    const checkAndTriggerJingle = () => {
      const isUserListening = isPlayingRef.current || isYouTubePlayingRef.current;
      if (isUserListening) {
        playJingle();
      }
    };

    jingleIntervalRef.current = setInterval(checkAndTriggerJingle, JINGLE_INTERVAL);

    return () => {
      if (jingleIntervalRef.current) {
        clearInterval(jingleIntervalRef.current);
        jingleIntervalRef.current = null;
      }
    };
  }, [playJingle, JINGLE_INTERVAL]);

  useEffect(() => {
    return () => {
      if (jingleIntervalRef.current) clearInterval(jingleIntervalRef.current);
      if (jingleRef.current) jingleRef.current.pause();
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
      }
    };
  }, []);

  return (
    <AudioContext.Provider
      value={{
        isPlaying,
        hasError,
        metadata,
        listeners,
        togglePlay,
        toggleLivePlayback,
        toggleYouTubeAudio,
        registerYouTubeToggle,
        analyserRef,
        isYouTubeLive,
        setIsYouTubeLive,
        isYouTubePlaying,
        setIsYouTubePlaying,
        youtubeVideoId,
        setYoutubeVideoId,
        youtubeThumbnail,
      }}
    >
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="none"
        onPause={() => {
          if (!isAutoSwitchingRef.current && userStoppedRef.current && audioRef.current?.volume === 0) {
            // Cegah interupsi crash di luar kontrol browser jemaah
          }
        }}
        onPlay={() => {
          if (audioRef.current && audioRef.current.volume > 0) {
            userStoppedRef.current = false;
            setIsPlaying(true);
            setHasError(false);
          }
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