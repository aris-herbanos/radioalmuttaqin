"use client";

import { useEffect, useRef } from "react";
import { useAudio } from "@/context/AudioContext";

export default function LiveSection() {
  const { isPlaying, togglePlay, analyserRef, metadata, listeners } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ===============================
  // ULTRA LIGHTNING SPECTRUM (100% UTUH TANPA RUBAH DESAIN)
  // ===============================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
    };

    resize();
    window.addEventListener("resize", resize);

    let animationId: number;
    let flashAlpha = 0;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      if (canvas.height <= 0 || canvas.width <= 0) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isPlaying || !analyserRef?.current) return;

      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      let bass = 0;
      for (let i = 0; i < 10; i++) { bass += dataArray[i] || 0; }
      bass = bass / 10;

      if (bass > 180) flashAlpha = 0.5;
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(0,255,200,${flashAlpha})`;
        ctx.fillRect(0, 0, width, height);
        flashAlpha -= 0.03;
      }

      const barCount = 120;
      const spacing = width / barCount;
      ctx.shadowBlur = 25;
      ctx.shadowColor = "#00ffcc";

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * (bufferLength / barCount)); 
        const value = (dataArray[dataIndex] || 0) / 255;
        const barHeight = value * centerY * 1.4;
        const x = i * spacing;
        const yTop = centerY - barHeight;
        const yBottom = centerY + barHeight;

        if (Number.isFinite(yTop) && Number.isFinite(yBottom)) {
          const gradient = ctx.createLinearGradient(0, yTop, 0, yBottom);
          gradient.addColorStop(0, "#00ffcc");
          gradient.addColorStop(0.3, "#10b981");
          gradient.addColorStop(0.6, "#065f46");
          gradient.addColorStop(1, "#001f1f");
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, yTop);
          ctx.lineTo(x, yBottom);
          ctx.stroke();
        }
      }
    };

    draw();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [isPlaying, analyserRef]);

  return (
    <section className="relative py-20 px-6 bg-black overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-emerald-950/80 to-black"></div>

      <div className="relative z-20 max-w-6xl w-full flex flex-col items-center">
        <h2 className="text-2xl font-black text-emerald-400 tracking-[0.5em] uppercase mb-10">
          ⚡ ON AIR NOW ⚡
        </h2>

        <div className="w-full bg-white/5 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="relative w-44 h-44">
              <div className="absolute inset-0 bg-emerald-500/20 blur-3xl animate-pulse rounded-2xl"></div>
              <img
                src={metadata.art}
                onError={(e) => ((e.target as HTMLImageElement).src = "/bg-player.png")}
                className="relative z-10 w-full h-full object-cover rounded-2xl border border-white/20"
                alt="Cover"
              />
            </div>

            <div className="flex-1 w-full space-y-6">
              <div className="h-28 bg-black rounded-xl overflow-hidden border border-emerald-500/20">
                <canvas ref={canvasRef} className="w-full h-full" />
              </div>

              <div className="text-left">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight italic leading-none">
                  {metadata.title}
                </h3>
                <p className="text-emerald-400 text-sm tracking-widest uppercase mt-2">
                  {metadata.artist}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-8">
            <div className="text-emerald-400 text-sm font-bold tracking-widest">
              👥 {listeners} Pendengar
            </div>

            <button
              onClick={togglePlay} // Mengontrol sakelar audio tunggal global
              className={`px-12 py-4 rounded-xl font-black tracking-widest uppercase transition-all active:scale-95 shadow-xl ${
                isPlaying ? "bg-red-600 hover:bg-red-500 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {isPlaying ? "Stop Radio" : "Putar Radio"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}