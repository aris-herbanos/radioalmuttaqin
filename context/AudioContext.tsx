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
  volume: number;
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

// 🟢 PERBAIKAN SAKRAL 1: AMANKAN ENDPOINT KE API TERPUSAT YANG DILINDUNGI BENTENG EDGE CACHE
// Mengembalikan fungsi pembacaan data ke server terpusat agar suara 1.000 jemaah dijamin sinkron se-dunia.
async function fetchCurrentRadioStatusFromBackend() {
  try {
    const origin = typeof window !== "undefined" && window.location.origin 
      ? window.location.origin 
      : "https://radioalmuttaqin.com";
    
    const targetUrl = `${origin.replace(/\/$/, "")}/api/get-current-radio`;

    // Fetch dikunci menggunakan sistem verifikasi tipe JSON murni
    const res = await fetch(targetUrl, { 
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    const contentType = res.headers.get("content-type");
    if (!res.ok || (contentType && contentType.includes("text/html"))) {
      throw new Error("Endpoint mengembalikan HTML/404 palsu");
    }

    return await res.json();
  } catch (error) {
    console.error("[Radio API Context] Gagal parsing terpusat, mengaktifkan objek safe fallback:", error);
    return {
      active: true,
      type: "playlist_mp3",
      title: "Radio Suara Al Muttaqin",
      artist: "Menginspirasi Hati Menguatkan Iman",
      audio_url: "http://ybmsaum.com/radio/stream.php",
      thumbnail: "/bg-player.png",
      elapsed_seconds: 0
    };
  }
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

  // VOLUME MANAGEMENT
  const [volume, _setVolume] = useState(0.8);
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
  // ⚙️ ENGINE CORE INITIALIZER
  // =================================================================

  const initAudio = useCallback(() => {
    if (isInitialized.current || !audioRef.current) return;
    try {
      const WebAudioContext = typeof window !== "undefined" 
        ? (window.AudioContext || (window as any).webkitAudioContext) 
        : null;

      if (!WebAudioContext) return;
      
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

  const setVolume = useCallback((vol: number) => {
    const cleanVol = Math.max(0, Math.min(1, vol));
    _setVolume(cleanVol);
    volumeRef.current = cleanVol;
    if (audioRef.current && !isJinglePlayingRef.current) {
      audioRef.current.volume = cleanVol;
    }
  }, []);

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

  const staticLockscreenUpdate = useCallback((title: string, artist: string, artUrl: string) => {
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: artist,
        album: "Radio Suara Al Muttaqin",
        artwork: [{ src: artUrl, sizes: "512x512", type: "image/png" }]
      });
    }
  }, []);

  const fetchMetadata = useCallback(async () => {
    try {
      // 🟢 PERBAIKAN SAKRAL 2: Panggil rute API internal terlindungi cache 10 detik kita
      const data = await fetchCurrentRadioStatusFromBackend(); 
      
      if (!data || !data.active) {
        setIsYouTubeLive(false);
        setIsCurrentlyAdzan(false);
        isCurrentlyAdzanRef.current = false;
        const fallbackTitle = data?.title || "Siaran Sedang Offline";
        const fallbackArtist = data?.artist || "Radio Suara Al Muttaqin";
        setMetadata({ title: fallbackTitle, artist: fallbackArtist, art: "/bg-player.png" });
        staticLockscreenUpdate(fallbackTitle, fallbackArtist, "/bg-player.png");
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
        staticLockscreenUpdate(finalTitle, finalArtist, finalArt);
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
        staticLockscreenUpdate(finalTitle, finalArtist, finalArt);

        const audio = audioRef.current;
        if (audio && data.audio_url) {
          if (audio.src !== data.audio_url) {
            audio.src = data.audio_url;
            audio.load();
            
            if (data.type !== "relay_stream" && data.elapsed_seconds && data.elapsed_seconds > 2) {
              audio.currentTime = data.elapsed_seconds;
            }

            // Jalankan pemutaran otomatis hanya jika audio dinyalakan, sedang adzan, atau sakelar otomatis aktif
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
            // Sinkronisasi detik berjalan secara dinamis jika lompatan di atas 5 detik
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
  }, [stopMp3Playback, initAudio, staticLockscreenUpdate]);

  // 🟢 ENGINE PLAYBACK FALLBACK MUTLAK JALUR UTAMA HAWKHOST (YBMSAUM.COM)
  const startPlayback = useCallback(async () => {
    try {
      const audio = audioRef.current;
      if (!audio) return;

      if (!audio.src || audio.src === "" || audio.src === window.location.href || audio.src.includes("null") || audio.src.includes("undefined")) {
        const res = await fetchCurrentRadioStatusFromBackend();
        if (res && res.audio_url) {
          audio.src = res.audio_url;
          audio.load();
          if (res.elapsed_seconds && res.elapsed_seconds > 2) {
            audio.currentTime = res.elapsed_seconds;
          }
        }
      }

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
    } catch (err) {
      console.error("Gagal memutar audio murni, mengalihkan paksa ke engine PHP Hawkhost...", err);
      
      const audio = audioRef.current;
      if (audio) {
        audio.src = "http://ybmsaum.com/radio/stream.php";
        audio.load();
        audio.play()
          .then(() => {
            userStoppedRef.current = false;
            setIsPlaying(true);
            setHasError(false);
          })
          .catch((finalErr) => {
            console.error("Bypass proxy gagal:", finalErr);
            setHasError(true);
            setIsPlaying(false);
          });
      }
    }
  }, []);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;
    if (!isInitialized.current) initAudio();
    
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
      youtubeToggleRef.current();
      return;
    }
    togglePlay();
  }, [isYouTubeLive, togglePlay]);

  const registerYouTubeToggle = useCallback((handler: (() => void) | null) => {
    youtubeToggleRef.current = handler;
  }, []);

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
          if (audioRef.current && isPlayingRef.current) audioRef.current.volume = volumeRef.current;
          isJinglePlayingRef.current = false;
        };
      }

      mainAudio.volume = 0.01; 
      jingleRef.current.currentTime = 0;

      const runJinglePlay = async () => {
        try {
          if (jingleRef.current) await jingleRef.current.play();
        } catch (playErr) {
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
      if (audioRef.current && isPlayingRef.current) audioRef.current.volume = volumeRef.current;
      isJinglePlayingRef.current = false;
    }
  }, [JINGLE_FILE]);

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
    
    if (nextState) jingleRef.current.load();

    if (nextState && audioRef.current) {
      audioRef.current.volume = 0;
      setIsPlaying(false);
      isPlayingRef.current = false; 
    }
    
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = nextState ? "playing" : "paused";
    }
  }, [JINGLE_FILE]); 

  useEffect(() => {
    fetchMetadata();
    const interval = setInterval(fetchMetadata, 15000); 
    return () => clearInterval(interval);
  }, [fetchMetadata]);

  useEffect(() => {
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => { toggleLivePlayback(); });
      navigator.mediaSession.setActionHandler("pause", () => { toggleLivePlayback(); });
      navigator.mediaSession.setActionHandler("stop", () => { stopMp3Playback(); });
    }
  }, [toggleLivePlayback, stopMp3Playback]);

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
    if (isYouTubeLive) resetMp3PlaybackCompletely();
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
      if (jingleIntervalRef.current) clearInterval(jingleIntervalRef.current);
    };
  }, [playJingle, JINGLE_INTERVAL]);

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