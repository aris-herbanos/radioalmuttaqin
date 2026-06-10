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
  volume: number; // 🟢 VOLUME MANAGEMENT
  setVolume: (vol: number) => void;
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
  const audioContextRef = useRef<any>(null);
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

  // VOLUME MANAGEMENT: State volume internal (0 sampai 1)
  const [volume, _setVolume] = useState(0.8); // Default 80% biar tidak terlalu menghentak
  const volumeRef = useRef(0.8);

  const [isCurrentlyAdzan, setIsCurrentlyAdzan] = useState(false);
  const isCurrentlyAdzanRef = useRef(false);

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

  // =================================================================
  // ⚙️ PENGATURAN HOISTING URUTAN FUNGSI (RESOLVED NEXT.JS RUNTIME ERR)
  // =================================================================

  // 1. Inisialisasi Audio Engine Web Audio API
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

  // 2. INTERFACE KONTROL VOLUME KUSTOM
  const setVolume = useCallback((vol: number) => {
    const cleanVol = Math.max(0, Math.min(1, vol));
    _setVolume(cleanVol);
    volumeRef.current = cleanVol;
    
    if (audioRef.current && !isJinglePlayingRef.current) {
      audioRef.current.volume = cleanVol;
    }
  }, []);

  // 3. OPTIMASI MUTE SUARA
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
      audio.pause();
    } catch (e) {
      console.warn("Pause handling error:", e);
    }
    
    setIsPlaying(false);
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }
  }, []);

  // 4. BUFFER RESET ANTI-SENDAT
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

  // 5. POLLING SYNC METADATA & ADZAN ENGINE (Untuk dependensi startPlayback)
  const fetchMetadata = useCallback(async () => {
    try {
      const data = await fetchCurrentRadioStatusFromBackend(); 
      
      if (!data || !data.active) {
        setIsYouTubeLive(false);
        setIsCurrentlyAdzan(false);
        isCurrentlyAdzanRef.current = false;
        const fallbackTitle = data?.title || "Siaran Sedang Offline";
        const fallbackArtist = data?.artist || "Radio Suara Al Muttaqin";
        setMetadata({ title: fallbackTitle, artist: fallbackArtist, art: "/bg-player.png" });
        setListeners(0);
        return;
      }

      const isAdzanTime = data.title && data.title.toLowerCase().includes("adzan");
      setIsCurrentlyAdzan(!!isAdzanTime);
      isCurrentlyAdzanRef.current = !!isAdzanTime;

      if (isAdzanTime && jingleRef.current && isJinglePlayingRef.current) {
        jingleRef.current.pause();
        jingleRef.current.currentTime = 0;
        isJinglePlayingRef.current = false;
      }

      // 🔴 CASE A: YOUTUBE LIVE
      if (data.type === "youtube_live" && !isAdzanTime) {
        if (isPlayingRef.current) {
          stopMp3Playback();
        }
        setYoutubeVideoId(data.youtube_video_id);
        setIsYouTubeLive(true);
        
        const finalTitle = data.title || "Live Streaming Radio";
        const finalArtist = data.artist || "Pondok Pesantren Al Muttaqin";
        const finalArt = data.thumbnail || "/bg-player.png";

        setMetadata({ title: finalTitle, artist: finalArtist, art: finalArt });
        setListeners(1);
        return;
      }
      
      // 🔴 CASE B: PLAYLIST MP3 / RELAY / ADZAN
      if (data.type === "playlist_mp3" || data.type === "relay_stream" || data.audio_url || isAdzanTime) {
        if (isAdzanTime && isYouTubePlayingRef.current && youtubeToggleRef.current) {
          isAutoSwitchingRef.current = true;
          youtubeToggleRef.current();
        }

        setIsYouTubeLive(false);
        setYoutubeVideoId(null);
        
        const finalTitle = data.title || "Radio Suara Al Muttaqin";
        const finalArtist = data.artist || "Menginspirasi Hati Menguatkan Iman";
        const finalArt = data.thumbnail || "/bg-player.png";

        setMetadata({ title: finalTitle, artist: finalArtist, art: finalArt });

        const audio = audioRef.current;
        if (audio && data.audio_url) {
          if (audio.src !== data.audio_url) {
            audio.src = data.audio_url;
            audio.load();
            
            if (data.type !== "relay_stream" && data.elapsed_seconds && data.elapsed_seconds > 2) {
              audio.currentTime = data.elapsed_seconds;
            }

            if (isPlayingRef.current || isAdzanTime || isAutoSwitchingRef.current) {
              if (!isInitialized.current) initAudio();
              
              audio.volume = volumeRef.current;
              audio.play()
                .then(() => {
                  setIsPlaying(true);
                  setHasError(false);
                  userStoppedRef.current = false;
                  isAutoSwitchingRef.current = false;
                  if (typeof window !== "undefined" && "mediaSession" in navigator) {
                    navigator.mediaSession.playbackState = "playing";
                  }
                })
                .catch(err => console.warn("Autoplay block protection triggered:", err));
            }
          } else {
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
    }
  }, [stopMp3Playback, initAudio]);

  // 6. FUNGSI PEMATANG PLAYBACK STREAM
  const startPlayback = useCallback(async () => {
    try {
      const audio = audioRef.current;
      if (audio && audio.src && audio.src !== "" && audio.src !== window.location.href) {
        audio.volume = volumeRef.current;
        
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        await audio.play();
        userStoppedRef.current = false;
        setIsPlaying(true);
        setHasError(false);
        if (typeof window !== "undefined" && "mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
        }
        return;
      }
      await fetchMetadata();
    } catch (err) {
      setHasError(true);
      setIsPlaying(false);
    }
  }, [fetchMetadata]);

  // 7. FUNGSI UTAMA TOGGLE PLAY MP3 STREAM
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

  // 8. FUNGSI UTAMA JALUR LIVE PLAYBACK MULTI-ENGINE
  const toggleLivePlayback = useCallback(() => {
    if (isYouTubeLive && youtubeToggleRef.current) {
      youtubeToggleRef.current();
      return;
    }
    togglePlay();
  }, [isYouTubeLive, togglePlay]);

  // 9. LURUSKAN LOCKSCREEN: Sinkronisasi Media Session API ke HP Android/iOS Jemaah
  const updateLockscreenControls = useCallback((title: string, artist: string, artUrl: string) => {
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: artist,
        album: "Radio Suara Al Muttaqin",
        artwork: [
          { src: artUrl, sizes: "512x512", type: "image/png" }
        ]
      });

      navigator.mediaSession.setActionHandler("play", () => {
        toggleLivePlayback();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        toggleLivePlayback();
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        stopMp3Playback();
      });
    }
  }, [toggleLivePlayback, stopMp3Playback]);

  // 10. REGISTER HANDLER TOGGLE EKSTERNAL
  const registerYouTubeToggle = useCallback((handler: (() => void) | null) => {
    youtubeToggleRef.current = handler;
  }, []);

  // 11. LOGIKA INTERUPSI JINGLE SECARA STERIL
  const playJingle = useCallback(() => {
    try {
      if (isCurrentlyAdzanRef.current) {
        if (jingleRef.current && isJinglePlayingRef.current) {
          jingleRef.current.pause();
          jingleRef.current.currentTime = 0;
          isJinglePlayingRef.current = false;
          if (audioRef.current && isPlayingRef.current) audioRef.current.volume = volumeRef.current;
        }
        return;
      }

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
          if (audioRef.current && isPlayingRef.current) audioRef.current.volume = volumeRef.current;
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
          if (audioRef.current && isPlayingRef.current) audioRef.current.volume = volumeRef.current;
          isJinglePlayingRef.current = false;
        }
      };

      runJinglePlay();

      jingleRef.current.onended = () => {
        const mainAudioElement = audioRef.current;
        if (isPlayingRef.current && mainAudioElement && !isCurrentlyAdzanRef.current) {
          mainAudioElement.volume = volumeRef.current;
        }
        isJinglePlayingRef.current = false;
      };
    } catch (err) {
      console.error("Gagal memputar jingle:", err);
      if (audioRef.current && isPlayingRef.current) audioRef.current.volume = volumeRef.current;
      isJinglePlayingRef.current = false;
    }
  }, [JINGLE_FILE]);

  // 12. FUNGSI UTAMA INTEGRASI IFRAME YOUTUBE AUDIO
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
    
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = nextState ? "playing" : "paused";
    }
  }, [JINGLE_FILE]); 

  // =================================================================
  // 🛰️ EFFECT & EVENT SUBSCRIPTIONS LIFECYCLE
  // =================================================================

  // Menyelaraskan rilis metadata pertama ke unit lockscreen mediaSession HP jemaah
  useEffect(() => {
    updateLockscreenControls(metadata.title, metadata.artist, metadata.art);
  }, [metadata, updateLockscreenControls]);

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
      if (isUserListening && !isCurrentlyAdzanRef.current) {
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
        volume,
        setVolume,
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
            // Proteksi sirkuit Vercel Serverless
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