"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudio } from "@/context/AudioContext";

export const dynamic = "force-dynamic";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

export default function LiveSection() {
  const {
    isPlaying,
    togglePlay,
    toggleLivePlayback,
    registerYouTubeToggle,
    analyserRef,
    metadata,
    isYouTubeLive,
    setIsYouTubeLive,
    isYouTubePlaying,
    setIsYouTubePlaying,
    youtubeVideoId,
    setYoutubeVideoId,
    youtubeThumbnail,
    volume,     // 🟢 SEARAH CONTEXT: Mengambil state volume real-time
    setVolume,  // 🟢 SEARAH CONTEXT: Mengambil fungsi pengubah volume
  } = useAudio();

  // state untuk YouTube API
  const [isYouTubeApiReady, setIsYouTubeApiReady] = useState(false);

  // STATE PENDENGAR PALSU (dynamic)
  const [displayListeners, setDisplayListeners] = useState(() => {
    const today = new Date();
    const seed =
      today.getFullYear() * 10000 +
      (today.getMonth() + 1) * 100 +
      today.getDate();
    return 300 + (seed % 400); // angka default tiap hari 300–699
  });

  // buat angka terlihat hidup (naik-turun sedikit tiap 45 detik)
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayListeners((prev) => {
        const delta = Math.floor(Math.random() * 3) - 1; // -1,0,+1
        return Math.max(250, prev + delta);
      });
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  // REF Player
  const playerRef = useRef<any>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const syntheticBarsRef = useRef<number[]>([]);
  const syntheticVelocityRef = useRef<number[]>([]);
  
  const isPlayingRef = useRef(isPlaying);
  const youtubeVideoIdRef = useRef(youtubeVideoId);
  const isYouTubePlayingRef = useRef(isYouTubePlaying);
  const isYouTubeApiReadyRef = useRef(isYouTubeApiReady);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    youtubeVideoIdRef.current = youtubeVideoId;
  }, [youtubeVideoId]);

  useEffect(() => {
    isYouTubePlayingRef.current = isYouTubePlaying;
  }, [isYouTubePlaying]);

  useEffect(() => {
    isYouTubeApiReadyRef.current = isYouTubeApiReady;
  }, [isYouTubeApiReady]);

  // HANDLE TOMBOL PLAY
  const handleTogglePlay = () => {
    if (!isPlaying && !isYouTubePlaying) {
      setDisplayListeners((prev) => prev + 1); // tambah +1 saat klik play
    }
    toggleLivePlayback();
  };

  useEffect(() => {
    if (window.YT?.Player) {
      setIsYouTubeApiReady(true);
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      setIsYouTubeApiReady(true);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  }, []);

  const playYouTube = useCallback(() => {
    const currentVideoId = youtubeVideoIdRef.current;

    if (!currentVideoId) return;

    if (isPlayingRef.current) {
      togglePlay();
    }

    if (!isYouTubeApiReadyRef.current || !window.YT?.Player || !iframeContainerRef.current) {
      return;
    }

    if (!playerRef.current) {
      playerRef.current = new window.YT.Player(iframeContainerRef.current, {
        videoId: currentVideoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            event.target.playVideo();
            setIsYouTubePlaying(true);
          },
          onStateChange: (event: any) => {
            if (event.data === 0 || event.data === 2) {
              setIsYouTubePlaying(false);
            }
            if (event.data === 1) {
              setIsYouTubePlaying(true);
            }
          },
        },
      });
      return;
    }

    playerRef.current.loadVideoById(currentVideoId);
    playerRef.current.playVideo();
    setIsYouTubePlaying(true);
  }, [setIsYouTubePlaying, togglePlay]);

  const stopYouTube = useCallback(() => {
    playerRef.current?.stopVideo?.();
    setIsYouTubePlaying(false);
  }, [setIsYouTubePlaying]);

  const toggleYouTube = useCallback(() => {
    if (isYouTubePlayingRef.current) {
      stopYouTube();
      return;
    }
    playYouTube();
  }, [playYouTube, stopYouTube]);

  useEffect(() => {
    registerYouTubeToggle(toggleYouTube);
    return () => registerYouTubeToggle(null);
  }, [registerYouTubeToggle, toggleYouTube]);

  // 🟢 SYNC JALUR TERBARU: Menyelaraskan konsumsi objek JSON fresh hasil olahan Sanity
  const checkLiveStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/get-current-radio", { cache: "no-store" });
      const data = await res.json();

      // Langsung membaca "youtube_video_id" murni dari API penyiaran baru kita
      const nextVideoId = data.type === "youtube_live" && data.youtube_video_id ? data.youtube_video_id : null;

      if (nextVideoId) {
        setYoutubeVideoId(nextVideoId);
        setIsYouTubeLive(true);

        if (isPlayingRef.current) {
          togglePlay();
        }
        return;
      }

      setYoutubeVideoId(null);
      setIsYouTubeLive(false);
      stopYouTube();
    } catch (err) {
      console.error("Gagal cek live status:", err);
      setYoutubeVideoId(null);
      setIsYouTubeLive(false);
      stopYouTube();
    }
  }, [setIsYouTubeLive, setYoutubeVideoId, stopYouTube, togglePlay]);

  useEffect(() => {
    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 30000);
    return () => clearInterval(interval);
  }, [checkLiveStatus]);

  // CANVAS VISUALIZER
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    let animationId: number;
    let flashAlpha = 0;

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      if (!canvas.width || !canvas.height) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isSyntheticYouTubeActive = isYouTubePlaying;
      const isAnyPlaying = isPlaying || isSyntheticYouTubeActive;
      if (!isAnyPlaying) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      const barCount = 128;
      const spacing = width / barCount;
      const time = performance.now() / 1000;

      ctx.fillStyle = "#00110d";
      ctx.fillRect(0, 0, width, height);

      if (syntheticBarsRef.current.length !== barCount) {
        syntheticBarsRef.current = Array.from({ length: barCount }, () => Math.random() * 0.35);
        syntheticVelocityRef.current = Array.from({ length: barCount }, () => Math.random() * 0.08);
      }

      let bass = 0;
      const analyser = isSyntheticYouTubeActive ? null : analyserRef?.current;
      const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < 10; i++) bass += dataArray[i] || 0;
        bass /= 10;
      } else if (isSyntheticYouTubeActive) {
        bass = 150 + Math.sin(time * 4.8) * 55 + Math.random() * 35;
      }

      if (bass > 180) flashAlpha = 0.35;
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(0,255,200,${flashAlpha})`;
        ctx.fillRect(0, 0, width, height);
        flashAlpha -= 0.03;
      }

      ctx.shadowBlur = 20;
      ctx.shadowColor = "#00ffcc";

      for (let i = 0; i < barCount; i++) {
        let value = 0;

        if (dataArray && analyser) {
          const dataIndex = Math.floor(i * (dataArray.length / barCount));
          value = (dataArray[dataIndex] || 0) / 255;
        } else if (isSyntheticYouTubeActive) {
          const position = i / barCount;
          const bassZone = Math.max(0, 1 - position * 3.4);
          const midZone = Math.exp(-Math.pow((position - 0.45) / 0.22, 2));
          const trebleZone = Math.max(0, (position - 0.55) * 1.8);

          const kick =
            Math.pow(Math.max(0, Math.sin(time * 3.1)), 8) * 0.85 +
            Math.pow(Math.max(0, Math.sin(time * 5.7 + 1.2)), 12) * 0.45;

          const phrase =
            Math.sin(time * 0.65 + i * 0.045) * 0.16 +
            Math.sin(time * 1.2 + i * 0.09) * 0.12;

          const midMotion =
            Math.abs(Math.sin(time * 2.4 + i * 0.13)) * 0.38 +
            Math.abs(Math.cos(time * 1.7 - i * 0.075)) * 0.22;

          const trebleFlicker =
            (Math.random() * 0.55 + Math.abs(Math.sin(time * 8.5 + i * 0.41)) * 0.35) *
            trebleZone;

          const rarePeak = Math.random() > 0.965 ? Math.random() * 0.75 : 0;
          const target =
            0.18 +
            bassZone * kick +
            midZone * midMotion +
            trebleFlicker +
            phrase +
            rarePeak;

          const bars = syntheticBarsRef.current;
          const velocity = syntheticVelocityRef.current;
          const previous = bars[i] || 0;
          const spring = (target - previous) * 0.16;
          const damping = (velocity[i] || 0) * 0.72;
          velocity[i] = damping + spring;
          bars[i] = Math.max(0.05, Math.min(1, previous + velocity[i]));

          const neighborLeft = bars[i - 1] ?? bars[i];
          const neighborRight = bars[i + 1] ?? bars[i];
          value = bars[i] * 0.7 + neighborLeft * 0.15 + neighborRight * 0.15;
        }

        const barHeight = Math.min(value, 1) * centerY * 1.4;
        const x = i * spacing;
        const yTop = centerY - barHeight;
        const yBottom = centerY + barHeight;

        const gradient = ctx.createLinearGradient(0, yTop, 0, yBottom);
        gradient.addColorStop(0, "#00ffcc");
        gradient.addColorStop(0.3, "#10b981");
        gradient.addColorStop(0.6, "#065f46");
        gradient.addColorStop(1, "#001f1f");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, yTop);
        ctx.lineTo(x, yBottom);
        ctx.stroke();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [isPlaying, isYouTubePlaying, analyserRef]);

  return (
    <section className="relative overflow-hidden bg-black py-12 sm:py-16 lg:py-20 px-4 sm:px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-emerald-950/80 to-black" />

      <div className="relative z-20 mx-auto max-w-6xl">
        <div className="text-center mb-6 sm:mb-8 lg:mb-10">
          <h2 className="text-sm sm:text-lg md:text-xl lg:text-2xl font-black text-emerald-400 uppercase tracking-[0.2em] sm:tracking-[0.35em]">
            ⚡ ON AIR NOW ⚡
          </h2>
        </div>

        <div className="rounded-2xl lg:rounded-3xl border border-emerald-500/20 bg-white/5 backdrop-blur-xl p-4 sm:p-6 lg:p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-5 sm:gap-6 lg:gap-8">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 lg:w-44 lg:h-44 shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-3xl animate-pulse" />
              <img
                src={isYouTubeLive ? youtubeThumbnail : metadata?.art || "/bg-player.png"}
                alt={metadata?.title || "Radio Suara Al Muttaqin"}
                className="relative z-10 w-full h-full object-cover rounded-2xl border border-white/20"
              />
            </div>

            <div className="flex-1 w-full">
              <div className="h-20 sm:h-24 lg:h-28 bg-black rounded-xl overflow-hidden border border-emerald-500/20">
                <canvas ref={canvasRef} className="w-full h-full" />
              </div>

              <div className="mt-4 text-center md:text-left">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-white leading-tight">
                  {/* ✅ PERBAIKAN CADANGAN: Mengganti teks fallback kosong dari "Radio Suara" ke "RSM On Air" */}
                  {metadata?.title || "RSM On Air"}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-emerald-400 uppercase tracking-wider">
                  {/* ✅ PERBAIKAN UTAMA: Mengganti tulisan "YouTube Live Stream" mentah menjadi nama radio penuh */}
                  {isYouTubeLive ? "RADIO SUARA AL MUTTAQIN" : metadata?.artist || "Virtual Live Stream"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-4 sm:gap-3 sm:items-center sm:justify-between border-t border-white/5 pt-6">
            <div className="text-center sm:text-left text-emerald-400 text-sm font-bold flex items-center justify-center sm:justify-start gap-2">
              👥 {displayListeners} Pendengar
            </div>

            {/* 🟢 NEW FEATURE UI: CONTROLLER VOLUME SLIDER & MUTING NEON PREMIUM */}
            <div className="flex items-center justify-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5 shrink-0">
              <button
                type="button"
                onClick={() => setVolume(volume > 0 ? 0 : 0.8)} // Instant Mute & Unmute Handling
                className="text-emerald-400 hover:text-cyan-400 transition-colors text-base select-none cursor-pointer"
                title={volume === 0 ? "Unmute" : "Mute"}
              >
                {volume === 0 ? "🔈" : "🔊"}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume || 0}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-24 sm:w-32 h-1 bg-emerald-950 accent-emerald-500 rounded-lg cursor-pointer outline-none transition-all hover:accent-cyan-400"
                style={{ 
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${(volume || 0) * 100}%, #064e3b ${(volume || 0) * 100}%, #064e3b 100%)` 
                }}
              />
              <span className="text-[10px] font-mono text-emerald-400/70 w-6 text-right select-none">
                {Math.round((volume || 0) * 100)}%
              </span>
            </div>

            <button
              type="button"
              onClick={handleTogglePlay}
              className={`w-full sm:w-auto px-6 sm:px-8 lg:px-12 py-3 lg:py-4 rounded-xl font-black uppercase tracking-wide transition-all active:scale-95 ${
                isPlaying || isYouTubePlaying
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {isPlaying || isYouTubePlaying ? "Stop Radio" : "Putar Radio"}
            </button>
          </div>
        </div>

        {/* Hidden YouTube Container */}
        <div
          ref={iframeContainerRef}
          style={{ width: 1, height: 1, opacity: 0, overflow: "hidden" }}
        />
      </div>
    </section>
  );
}